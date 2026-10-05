// Sonda produção e homologação e mantém os alertas em dia (INT-08).
//
//   node scripts/monitor.mjs --pasta <pasta do status> [--sem-alertas]
//
// Mede o código HTTP, o tempo de resposta e a versão servida de cada ambiente,
// acrescenta o resultado em <pasta>/sondas.csv e abre ou fecha as Issues de
// alerta (JogoForaDoAr e LatenciaAlta). As regras ficam em scripts/lib/monitor.mjs.
//
// Variáveis: SITE_URL (obrigatória); GITHUB_REPOSITORY e GH_TOKEN para as Issues.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIMITE_LATENCIA, acrescentar, decidir, resumir } from './lib/monitor.mjs';

const args = process.argv.slice(2);
const opcao = (nome) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : undefined);
const PASTA = opcao('--pasta') ?? 'status';
const SEM_ALERTAS = args.includes('--sem-alertas');
const SITE = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const REPO = process.env.GITHUB_REPOSITORY ?? '';
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '';

if (!/^https?:\/\//.test(SITE)) {
  console.error('monitor: defina SITE_URL com o endereço do GitHub Pages (Settings → Variables).');
  process.exit(2);
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Uma requisição: código HTTP (0 se não houve resposta), tempo em segundos e o corpo. */
async function medir(url) {
  const inicio = performance.now();
  try {
    // O parâmetro muda a cada pedido para a medida não vir do cache da CDN do Pages.
    const resposta = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const corpo = await resposta.text();
    return { codigo: resposta.status, tempo: (performance.now() - inicio) / 1000, corpo };
  } catch {
    return { codigo: 0, tempo: (performance.now() - inicio) / 1000, corpo: '' };
  }
}

const json = (texto) => {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
};

/** Até três tentativas: a segunda e a terceira só acontecem se a primeira falhar ou vier lenta. */
async function tentar(url) {
  const tentativas = [await medir(url)];
  while (tentativas.length < 3 && (tentativas.at(-1).codigo !== 200 || tentativas.at(-1).tempo > LIMITE_LATENCIA)) {
    await esperar(2000);
    tentativas.push(await medir(url));
  }
  return resumir(tentativas);
}

async function sondar(ambiente) {
  const alvo = ambiente === 'producao' ? `${SITE}/` : `${SITE}/hml/`;
  const data = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const pagina = await tentar(alvo);
  let { codigo } = pagina;
  let versao = '';

  if (codigo === 200) {
    // A página responder não basta: o jogador só joga se a release apontada existir.
    let base = alvo;
    if (ambiente === 'producao') {
      const rollout = await medir(`${SITE}/rollout.json`);
      const estavel = json(rollout.corpo)?.estavel;
      if (rollout.codigo !== 200 || typeof estavel !== 'string') codigo = rollout.codigo === 200 ? 502 : rollout.codigo;
      else base = `${SITE}/releases/${estavel}/`;
    }
    if (codigo === 200) {
      const arquivo = await medir(`${base}version.json`);
      const sha = json(arquivo.corpo)?.sha;
      if (arquivo.codigo !== 200 || typeof sha !== 'string') codigo = arquivo.codigo === 200 ? 502 : arquivo.codigo;
      else versao = sha;
    }
  }
  return { data, ambiente, alvo, codigo, tempo: pagina.tempo, versao };
}

async function github(caminho, opcoes = {}) {
  const resposta = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, {
    ...opcoes,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
  });
  if (!resposta.ok) throw new Error(`GitHub ${opcoes.method ?? 'GET'} ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

async function sincronizarAlertas(sondas) {
  const abertas = (await github('/issues?state=open&labels=alerta&per_page=100')).filter((i) => i.pull_request === undefined);
  const execucao = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  const { abrir, fechar } = decidir(sondas, abertas, execucao);

  for (const alerta of abrir) {
    const criada = await github('/issues', { method: 'POST', body: JSON.stringify({ title: alerta.titulo, body: alerta.corpo, labels: ['alerta'] }) });
    console.log(`alerta aberto: #${criada.number} ${alerta.titulo}`);
  }
  for (const alerta of fechar) {
    await github(`/issues/${alerta.numero}/comments`, { method: 'POST', body: JSON.stringify({ body: alerta.comentario }) });
    await github(`/issues/${alerta.numero}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
    console.log(`alerta fechado: #${alerta.numero}`);
  }
  return { abrir, fechar };
}

const sondas = [await sondar('producao'), await sondar('homologacao')];
for (const s of sondas) console.log(`${s.ambiente}: HTTP ${s.codigo} em ${s.tempo.toFixed(3)} s, versão ${s.versao || '-'} (${s.alvo})`);

mkdirSync(PASTA, { recursive: true });
const csv = join(PASTA, 'sondas.csv');
writeFileSync(csv, acrescentar(existsSync(csv) ? readFileSync(csv, 'utf8') : '', sondas));

let alertas = { abrir: [], fechar: [] };
if (SEM_ALERTAS) console.log('alertas: desligados nesta execução (--sem-alertas)');
else if (REPO === '' || TOKEN === '') console.log('alertas: sem GITHUB_REPOSITORY ou GH_TOKEN, as Issues não foram conferidas');
else alertas = await sincronizarAlertas(sondas);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Sondas',
      '| Ambiente | HTTP | Tempo | Versão |',
      '|---|---|---|---|',
      ...sondas.map((s) => `| ${s.ambiente} | ${s.codigo} | ${s.tempo.toFixed(3)} s | \`${s.versao || '-'}\` |`),
      '',
      `Alertas abertos nesta execução: ${alertas.abrir.length}. Fechados: ${alertas.fechar.length}.`,
      '',
    ].join('\n'),
  );
}

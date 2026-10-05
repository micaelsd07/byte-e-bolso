// Calcula as quatro métricas DORA a partir dos dados do GitHub (INT-08).
//
//   node scripts/dora.mjs [--dias 30] [--json <arquivo>] [--md <arquivo>]
//
// Lê os deploys do environment `producao`, os rollbacks manuais e as Issues com
// o label `alerta`. A conta fica em scripts/lib/dora.mjs.
//
// Variáveis: GITHUB_REPOSITORY (ou o remoto `origin`); GH_TOKEN é opcional em
// repositório público, mas sem ele o limite de requisições é bem menor.
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { calcular, paraMarkdown } from './lib/dora.mjs';

const args = process.argv.slice(2);
const opcao = (nome) => (args.includes(nome) ? args[args.indexOf(nome) + 1] : undefined);
const DIAS = Number(opcao('--dias') ?? 30);
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '';

let repo = process.env.GITHUB_REPOSITORY ?? '';
if (repo === '') {
  try {
    const remoto = execFileSync('git', ['remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    repo = /github\.com[:/](.+?)(\.git)?$/.exec(remoto)?.[1] ?? '';
  } catch {
    repo = '';
  }
}
if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !Number.isFinite(DIAS) || DIAS <= 0) {
  console.error('dora: defina GITHUB_REPOSITORY como dono/repositório e --dias como um número positivo.');
  process.exit(2);
}

/** GET na API do GitHub. `ausente` é o que devolver quando o recurso ainda não existe (404). */
async function github(caminho, ausente) {
  const resposta = await fetch(`https://api.github.com/repos/${repo}${caminho}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(TOKEN === '' ? {} : { Authorization: `Bearer ${TOKEN}` }) },
  });
  if (resposta.status === 404 && ausente !== undefined) return ausente;
  if (!resposta.ok) throw new Error(`GitHub GET ${caminho}: HTTP ${resposta.status}`);
  return resposta.json();
}

/** Lê todas as páginas de uma listagem, até um limite que cobre com folga o período. */
async function listar(caminho, campo) {
  const itens = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const bruto = await github(`${caminho}${caminho.includes('?') ? '&' : '?'}per_page=100&page=${pagina}`, campo ? { [campo]: [] } : []);
    const lote = campo ? bruto[campo] : bruto;
    itens.push(...lote);
    if (lote.length < 100) break;
  }
  return itens;
}

const fim = new Date();
const inicio = new Date(fim.getTime() - DIAS * 24 * 3_600_000);

const deploys = [];
for (const implantacao of await listar('/deployments?environment=producao')) {
  const estados = await listar(`/deployments/${implantacao.id}/statuses`);
  // Um deploy antigo ganha o estado "inactive" quando o seguinte entra: o que vale é o desfecho dele.
  const desfecho = estados.find((e) => e.state === 'success') ?? estados.find((e) => e.state === 'failure' || e.state === 'error');
  if (desfecho === undefined) continue; // ainda rodando, ou esperando a aprovação
  const commit = await github(`/commits/${implantacao.sha}`, null);
  deploys.push({
    sha: implantacao.sha.slice(0, 7),
    commitEm: commit?.commit?.committer?.date ?? null,
    producaoEm: desfecho.created_at,
    sucesso: desfecho.state === 'success',
  });
}

const rollbacks = (await listar('/actions/workflows/rollback.yml/runs?status=success', 'workflow_runs')).map((r) => ({ em: r.updated_at }));
const alertas = (await listar('/issues?labels=alerta&state=all'))
  .filter((i) => i.pull_request === undefined)
  .map((i) => ({ titulo: i.title, abertoEm: i.created_at, fechadoEm: i.closed_at }));

const metricas = calcular({ deploys, rollbacks, alertas, inicio: inicio.toISOString(), fim: fim.toISOString() });
const markdown = paraMarkdown(metricas);

const gravar = (arquivo, texto) => {
  if (arquivo === undefined) return;
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, texto);
};
gravar(opcao('--json'), `${JSON.stringify({ ...metricas, geradoEm: fim.toISOString().replace(/\.\d+Z$/, 'Z'), repositorio: repo }, null, 2)}\n`);
gravar(opcao('--md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
console.log(markdown);

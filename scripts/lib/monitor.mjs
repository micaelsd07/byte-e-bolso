// Regras do monitoramento (INT-08). Funções puras: recebem o que a sonda mediu
// e o que há de Issue aberta, e devolvem o que gravar e o que abrir ou fechar.
// Quem fala com a rede e com o GitHub é o scripts/monitor.mjs.

/** Acima disso, em segundos, a resposta é lenta demais: alerta LatenciaAlta. */
export const LIMITE_LATENCIA = 2;
export const CABECALHO = 'data,ambiente,alvo,codigo,tempo,versao';
/** Linhas guardadas no CSV: a 15 min por sonda e 2 ambientes, cerca de 30 dias. */
export const MAXIMO_DE_LINHAS = 6000;
export const AMBIENTES = ['producao', 'homologacao'];
export const ALERTAS = ['JogoForaDoAr', 'LatenciaAlta'];

/**
 * Junta as tentativas de uma sonda em um resultado. Uma tentativa lenta ou
 * perdida sozinha não vira alerta: o jogo só está fora do ar se nenhuma
 * tentativa respondeu 200, e a latência é a mediana das que responderam.
 */
export function resumir(tentativas) {
  const boas = tentativas.filter((t) => t.codigo === 200);
  if (boas.length === 0) {
    const ultima = tentativas.at(-1) ?? { codigo: 0, tempo: 0 };
    return { codigo: ultima.codigo, tempo: ultima.tempo };
  }
  const tempos = boas.map((t) => t.tempo).sort((a, b) => a - b);
  return { codigo: 200, tempo: tempos[Math.floor((tempos.length - 1) / 2)] };
}

/** Uma linha do status/sondas.csv. A versão nunca tem vírgula: é um sha, ou vazio. */
export function linhaCsv(sonda) {
  const versao = String(sonda.versao ?? '').replace(/[^0-9A-Za-z._-]/g, '');
  return [sonda.data, sonda.ambiente, sonda.alvo, sonda.codigo, sonda.tempo.toFixed(3), versao].join(',');
}

/** Acrescenta as sondas ao CSV, criando o cabeçalho e descartando as linhas mais antigas. */
export function acrescentar(csv, sondas) {
  const antigas = (csv ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && l !== CABECALHO);
  const linhas = [...antigas, ...sondas.map(linhaCsv)].slice(-MAXIMO_DE_LINHAS);
  return `${[CABECALHO, ...linhas].join('\n')}\n`;
}

/** Alertas que a rodada de sondas dispara, como "Alerta: ambiente". */
export function alertasAtivos(sondas) {
  const ativos = [];
  for (const sonda of sondas) {
    if (sonda.codigo !== 200) ativos.push({ chave: `JogoForaDoAr: ${sonda.ambiente}`, sonda });
    else if (sonda.tempo > LIMITE_LATENCIA) ativos.push({ chave: `LatenciaAlta: ${sonda.ambiente}`, sonda });
  }
  return ativos;
}

function corpoDoAlerta({ chave, sonda }, execucao) {
  const motivo = chave.startsWith('JogoForaDoAr')
    ? `A sonda não recebeu resposta 200 (recebeu ${sonda.codigo === 0 ? 'nenhuma resposta' : `HTTP ${sonda.codigo}`}).`
    : `A resposta levou ${sonda.tempo.toFixed(2)} s, acima do limite de ${LIMITE_LATENCIA} s.`;
  return [
    motivo,
    '',
    `- alvo: ${sonda.alvo}`,
    `- ambiente: ${sonda.ambiente}`,
    `- medido em: ${sonda.data}`,
    `- versão servida: ${sonda.versao || 'não identificada'}`,
    execucao ? `- execução: ${execucao}` : null,
    '',
    'Esta Issue se fecha sozinha quando a sonda voltar ao normal. O tempo entre a abertura e o fechamento entra no relatório DORA como tempo de recuperação.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/**
 * Compara os alertas da rodada com as Issues de alerta abertas e decide:
 * abre a que falta, fecha a que não vale mais e deixa quieta a que continua.
 * Só mexe em Issue cujo título começa com um alerta do monitor: as outras
 * Issues com o label `alerta` (DeployFalhou, TriagemReprovada) não são dele.
 */
export function decidir(sondas, issuesAbertas, execucao = '') {
  const ativos = alertasAtivos(sondas);
  const doMonitor = issuesAbertas.filter((i) => ALERTAS.some((a) => i.title.startsWith(`${a}: `)));
  const chaveDa = (issue) => issue.title.split(' (')[0];

  const abrir = ativos
    .filter((a) => !doMonitor.some((i) => chaveDa(i) === a.chave))
    .map((a) => ({ titulo: `${a.chave} (${a.sonda.alvo})`, corpo: corpoDoAlerta(a, execucao) }));

  const fechar = doMonitor
    .filter((i) => !ativos.some((a) => a.chave === chaveDa(i)))
    // Só fecha se o ambiente foi sondado nesta rodada: sem medida, não há como dizer que voltou.
    .filter((i) => sondas.some((s) => chaveDa(i).endsWith(`: ${s.ambiente}`)))
    .map((i) => {
      const sonda = sondas.find((s) => chaveDa(i).endsWith(`: ${s.ambiente}`));
      const medida = `HTTP ${sonda.codigo} em ${sonda.tempo.toFixed(2)} s`;
      // O ambiente pode ter trocado de problema (de lento para fora do ar): aí outro alerta assume.
      const normal = !ativos.some((a) => a.sonda.ambiente === sonda.ambiente);
      return { numero: i.number, comentario: normal ? `Voltou ao normal em ${sonda.data}: ${medida}.` : `Substituído por outro alerta em ${sonda.data}: ${medida}.` };
    });

  return { abrir, fechar };
}

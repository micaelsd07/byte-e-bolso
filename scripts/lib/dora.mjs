// As quatro métricas DORA do período (INT-08). Funções puras: recebem os
// eventos já lidos do GitHub e devolvem os números. Quem lê a API é o scripts/dora.mjs.
//
//   deploys    [{ sha, commitEm, producaoEm, sucesso }]  execuções do deploy-prd
//   rollbacks  [{ em }]                                  rollbacks manuais concluídos
//   alertas    [{ titulo, abertoEm, fechadoEm }]         Issues com o label alerta

/** Lead time da esteira antiga da Carparts, em dias: é a linha de base da comparação. */
export const LINHA_DE_BASE_DIAS = 11;

const HORA = 3_600_000;
const DIA = 24 * HORA;
const ms = (iso) => new Date(iso).getTime();

export function mediana(valores) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

const arredondar = (n, casas = 2) => (n === null ? null : Math.round(n * 10 ** casas) / 10 ** casas);

/**
 * `inicio` e `fim` (ISO) delimitam o período. Um deploy conta como falha se
 * terminou com erro (a esteira reverteu sozinha) ou se foi seguido de um
 * rollback manual antes do deploy seguinte.
 */
export function calcular({ deploys, rollbacks, alertas, inicio, fim }) {
  const dentro = (iso) => iso !== null && iso !== undefined && ms(iso) >= ms(inicio) && ms(iso) <= ms(fim);
  const doPeriodo = deploys.filter((d) => dentro(d.producaoEm)).sort((a, b) => ms(a.producaoEm) - ms(b.producaoEm));
  const comSucesso = doPeriodo.filter((d) => d.sucesso);
  const dias = Math.max(1, (ms(fim) - ms(inicio)) / DIA);

  const leadTimes = comSucesso.filter((d) => d.commitEm).map((d) => (ms(d.producaoEm) - ms(d.commitEm)) / HORA);
  const leadTimeHoras = mediana(leadTimes);

  const revertidos = comSucesso.filter((deploy, i) => {
    const proximo = comSucesso[i + 1];
    return rollbacks.some((r) => ms(r.em) > ms(deploy.producaoEm) && (proximo === undefined || ms(r.em) < ms(proximo.producaoEm)));
  });
  const falhas = doPeriodo.filter((d) => !d.sucesso).length + revertidos.length;

  const fechados = alertas.filter((a) => dentro(a.abertoEm) && a.fechadoEm);
  const recuperacao = mediana(fechados.map((a) => (ms(a.fechadoEm) - ms(a.abertoEm)) / 60_000));

  return {
    periodo: { inicio, fim, dias: arredondar(dias, 1) },
    frequenciaDeDeploy: { deploys: comSucesso.length, porSemana: arredondar((comSucesso.length / dias) * 7) },
    leadTime: {
      horas: arredondar(leadTimeHoras),
      amostras: leadTimes.length,
      linhaDeBaseDias: LINHA_DE_BASE_DIAS,
      // Quantas vezes mais rápido do que a linha de base. null enquanto não há deploy.
      vezesMaisRapido: leadTimeHoras === null || leadTimeHoras <= 0 ? null : arredondar((LINHA_DE_BASE_DIAS * 24) / leadTimeHoras, 1),
    },
    taxaDeFalha: {
      deploys: doPeriodo.length,
      falhas,
      percentual: doPeriodo.length === 0 ? null : arredondar((falhas / doPeriodo.length) * 100, 1),
    },
    tempoDeRecuperacao: {
      minutos: arredondar(recuperacao, 1),
      alertasFechados: fechados.length,
      alertasAbertos: alertas.filter((a) => dentro(a.abertoEm) && !a.fechadoEm).length,
    },
  };
}

const ou = (valor, texto) => (valor === null ? 'sem dados no período' : texto);

/** Relatório em Markdown, para o resumo da execução e para o relatório técnico. */
export function paraMarkdown(m) {
  const lead = m.leadTime;
  return [
    `# Métricas DORA`,
    '',
    `Período: ${m.periodo.inicio.slice(0, 10)} a ${m.periodo.fim.slice(0, 10)} (${m.periodo.dias} dias).`,
    '',
    '| Métrica | Valor | Como é medida |',
    '|---|---|---|',
    `| Frequência de deploy | ${m.frequenciaDeDeploy.deploys} deploys (${m.frequenciaDeDeploy.porSemana} por semana) | Execuções do job \`deploy-prd\` concluídas com sucesso |`,
    `| Lead time de mudança | ${ou(lead.horas, `${lead.horas} h (mediana de ${lead.amostras})`)} | Do commit na \`main\` até a release em produção |`,
    `| Taxa de falha de mudança | ${ou(m.taxaDeFalha.percentual, `${m.taxaDeFalha.percentual}% (${m.taxaDeFalha.falhas} de ${m.taxaDeFalha.deploys})`)} | Deploys que falharam ou foram seguidos de rollback |`,
    `| Tempo de recuperação | ${ou(m.tempoDeRecuperacao.minutos, `${m.tempoDeRecuperacao.minutos} min (mediana de ${m.tempoDeRecuperacao.alertasFechados})`)} | Da abertura ao fechamento das Issues de alerta |`,
    '',
    lead.vezesMaisRapido === null
      ? `Linha de base da Carparts: lead time de ${lead.linhaDeBaseDias} dias. Ainda não há deploy em produção no período para comparar.`
      : `Linha de base da Carparts: lead time de ${lead.linhaDeBaseDias} dias (${lead.linhaDeBaseDias * 24} h). A esteira do jogo leva ${lead.horas} h: ${lead.vezesMaisRapido} vezes mais rápido.`,
    m.tempoDeRecuperacao.alertasAbertos > 0 ? `\nHá ${m.tempoDeRecuperacao.alertasAbertos} alerta(s) ainda aberto(s), fora da mediana de recuperação.` : '',
    '',
  ].join('\n');
}

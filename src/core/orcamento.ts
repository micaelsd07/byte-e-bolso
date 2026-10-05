import type { NoOrcamento } from './tipos';

export interface ResultadoOrcamento {
  pontos: number;
  total: number;
  sobra: number;
  acertos: string[];
  problemas: string[];
}

/**
 * Avalia o orçamento do mês montado pelo jogador.
 *
 * Pontuação (0 a 100): contas essenciais 40, reserva 25, investimento em si
 * mesmo 20, algum lazer 15. Quem gasta mais do que ganha fica com no máximo 15,
 * e quem deixa conta essencial de fora fica com no máximo 50.
 */
export function avaliarOrcamento(no: NoOrcamento, selecionados: readonly string[]): ResultadoOrcamento {
  const marcados = new Set(selecionados);
  const escolhidos = no.itens.filter((i) => marcados.has(i.id));
  const total = escolhidos.reduce((s, i) => s + i.valor, 0);
  const sobra = no.renda - total;

  const essenciais = no.itens.filter((i) => i.classe === 'essencial');
  const faltando = essenciais.filter((i) => !marcados.has(i.id));
  const temFuturo = escolhidos.some((i) => i.classe === 'futuro');
  const temLazer = escolhidos.some((i) => i.classe === 'desejo');

  const acertos: string[] = [];
  const problemas: string[] = [];
  let pontos = 0;

  if (sobra < 0) {
    problemas.push(`Você gastou R$ ${-sobra} a mais do que ganha. A diferença vira dívida.`);
    pontos = faltando.length === 0 ? 15 : 5;
  } else {
    const cobertos = essenciais.length - faltando.length;
    pontos += essenciais.length === 0 ? 40 : Math.round((40 * cobertos) / essenciais.length);

    const fracaoReserva = no.metaReserva <= 0 ? 1 : Math.min(1, sobra / no.metaReserva);
    pontos += Math.round(25 * fracaoReserva);
    if (fracaoReserva >= 1) acertos.push(`Sobrou R$ ${sobra} para a reserva de emergência.`);
    else problemas.push(`A reserva ficou em R$ ${sobra}; a meta era R$ ${no.metaReserva}.`);

    if (temFuturo) {
      pontos += 20;
      acertos.push('Você separou dinheiro para investir em você.');
    } else {
      problemas.push('Nada foi para estudo ou ferramenta de trabalho.');
    }

    if (temLazer) {
      pontos += 15;
      acertos.push('Sobrou espaço para lazer, e isso mantém o plano de pé.');
    } else {
      problemas.push('Orçamento sem nenhum lazer costuma ser abandonado no segundo mês.');
    }

    if (faltando.length > 0) pontos = Math.min(pontos, 50);
  }

  if (faltando.length === 0) acertos.unshift('Todas as contas essenciais estão pagas.');
  else problemas.unshift(`Ficou de fora: ${faltando.map((i) => i.nome).join(', ')}.`);

  return { pontos, total, sobra, acertos, problemas };
}

/** Melhor pontuação possível do desafio. Usado para garantir que o conteúdo é vencível. */
export function melhorPontuacao(no: NoOrcamento): number {
  const n = no.itens.length;
  let melhor = 0;
  for (let mascara = 0; mascara < 1 << n; mascara++) {
    const ids = no.itens.filter((_, i) => (mascara & (1 << i)) !== 0).map((i) => i.id);
    melhor = Math.max(melhor, avaliarOrcamento(no, ids).pontos);
  }
  return melhor;
}

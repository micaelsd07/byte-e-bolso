import type { Capitulo, Dificuldade, Exercicio, NoLicao } from './tipos';

/** Quantos exercícios, no máximo, entram na prova de uma unidade. */
export const EXERCICIOS_DA_PROVA = 8;
/** Segundos por exercício da prova. Quanto mais difícil a unidade, menos tempo. */
export const TEMPO_DA_PROVA: Record<Dificuldade, number> = { facil: 40, medio: 32, dificil: 26 };
/** Montar código pede mais toques: cada peça da resposta soma este tempo. */
export const SEGUNDOS_POR_PECA = 2;

/** Na prova, os exercícios de escrever vêm antes dos de escolher. */
const PESO: Record<Exercicio['tipo'], number> = { completar: 0, montar: 1, escolha: 2 };

/** Tempo, em segundos, para responder um exercício de uma fase com relógio. */
export function segundosDoExercicio(exercicio: Exercicio, base: number, extra = 0): number {
  return base + extra + (exercicio.tipo === 'montar' ? SEGUNDOS_POR_PECA * exercicio.pecas.length : 0);
}

/**
 * Prova da unidade: uma fase gerada a partir das lições dela, sem conteúdo novo.
 * Pega exercícios de todas as lições, em rodízio, e põe relógio em cada um. É a
 * última fase da unidade, então é ela que abre a unidade seguinte.
 * Unidade com menos de duas lições não tem prova.
 */
export function provaDaUnidade(unidade: Capitulo): NoLicao | null {
  const licoes = unidade.nos.filter((no): no is NoLicao => no.tipo === 'licao');
  if (licoes.length < 2) return null;

  // De cada lição, primeiro os exercícios mais difíceis; a ordem original desempata.
  const filas = licoes.map((licao, indice) =>
    licao.exercicios
      .map((exercicio, posicao) => ({ exercicio, posicao }))
      .sort((a, b) => PESO[a.exercicio.tipo] - PESO[b.exercicio.tipo] || a.posicao - b.posicao)
      .map(({ exercicio }) => ({ ...exercicio, id: `l${indice + 1}-${exercicio.id}` })),
  );

  const exercicios: Exercicio[] = [];
  for (let rodada = 0; exercicios.length < EXERCICIOS_DA_PROVA; rodada++) {
    const daRodada = filas.flatMap((fila) => fila.slice(rodada, rodada + 1));
    if (daRodada.length === 0) break;
    exercicios.push(...daRodada.slice(0, EXERCICIOS_DA_PROVA - exercicios.length));
  }

  return {
    tipo: 'licao',
    id: `prova-${unidade.id}`,
    titulo: 'Prova da unidade',
    categoria: 'tecnologia',
    resumo: `Revisão cronometrada de "${unidade.titulo}": ${exercicios.length} exercícios, sem resumo antes.`,
    recompensa: 350,
    metas: [10, 70, 100],
    teto: 100,
    tempo: TEMPO_DA_PROVA[unidade.dificuldade],
    explicacao: [
      {
        titulo: 'Valendo a unidade',
        texto:
          `São ${exercicios.length} exercícios tirados das lições desta unidade. Cada um tem relógio: se o tempo acabar, conta como erro e custa uma vida. ` +
          'Conclua com 1 estrela ou mais para abrir a próxima unidade.',
      },
    ],
    exercicios,
  };
}

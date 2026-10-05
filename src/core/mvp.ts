import type { Estado, Registro } from './tipos';

/**
 * MVP Score: 0 a 1000 por partida.
 *
 * Cada parcela é normalizada entre 0 e 1 antes de receber o peso, então não
 * existe valor que cresça só por jogar mais tempo. O score nunca é guardado:
 * é sempre recalculado a partir do histórico, e por isso editar o save não
 * permite "digitar" um MVP.
 */
export const PESOS_MVP = {
  conhecimento: 0.25,
  desempenho: 0.2,
  estrategia: 0.2,
  eficiencia: 0.15,
  consistencia: 0.1,
  conquistas: 0.1,
} as const;

export type ParcelaMvp = keyof typeof PESOS_MVP;
export type ParcelasMvp = Record<ParcelaMvp, number>;

const media = (v: number[]): number => (v.length === 0 ? 0 : v.reduce((s, n) => s + n, 0) / v.length);
const entre01 = (n: number): number => Math.min(1, Math.max(0, n));

function consistencia(historico: Registro[]): number {
  // Com menos de 3 passos não dá para falar em regularidade.
  if (historico.length < 3) return 0;
  const notas = historico.map((r) => r.nota);
  const m = media(notas);
  const desvio = Math.sqrt(media(notas.map((n) => (n - m) ** 2)));
  // O maior desvio possível para notas entre 0 e 1 é 0,5.
  return entre01(1 - desvio / 0.5) * m;
}

export function parcelasMvp(estado: Estado, totalConquistas: number): ParcelasMvp {
  const desafios = estado.historico.filter((r) => r.tipo !== 'decisao');
  const decisoes = estado.historico.filter((r) => r.tipo === 'decisao');
  return {
    conhecimento: entre01(media(estado.historico.map((r) => r.nota))),
    desempenho: entre01(media(desafios.map((r) => r.nota))),
    estrategia: entre01(media(decisoes.map((r) => r.nota))),
    eficiencia: entre01((estado.atributos.saudeFinanceira + estado.atributos.energia) / 200),
    consistencia: consistencia(estado.historico),
    conquistas: totalConquistas <= 0 ? 0 : entre01(estado.conquistas.length / totalConquistas),
  };
}

export function mvpScore(estado: Estado, totalConquistas: number): number {
  if (estado.historico.length === 0) return 0;
  const parcelas = parcelasMvp(estado, totalConquistas);
  let soma = 0;
  for (const chave of Object.keys(PESOS_MVP) as ParcelaMvp[]) soma += PESOS_MVP[chave] * parcelas[chave];
  return Math.round(1000 * soma);
}

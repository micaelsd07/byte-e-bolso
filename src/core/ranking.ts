import { APELIDO_PADRAO, AVATARES, limparApelido } from './jogo';

/** Quantos jogadores cabem no ranking do aparelho. */
export const TAMANHO_DO_RANKING = 10;

/**
 * Uma linha do ranking. Só tem o que o jogador escolheu na hora (apelido e
 * personagem) e o resultado dele: nada que identifique uma pessoa.
 */
export interface Colocado {
  apelido: string;
  avatar: string;
  estrelas: number;
  mvp: number;
}

/** O ranking é de quem escolheu um apelido: quem joga como visitante fica de fora. */
export function participa(apelido: string): boolean {
  return apelido !== APELIDO_PADRAO;
}

/** Mais estrelas primeiro; o MVP desempata, e o apelido deixa a ordem estável. */
function ordem(a: Colocado, b: Colocado): number {
  return b.estrelas - a.estrelas || b.mvp - a.mvp || a.apelido.localeCompare(b.apelido);
}

/**
 * Põe o jogador no ranking, ou atualiza a linha dele. Um resultado pior do que o
 * já registrado não apaga o melhor: recomeçar do zero não tira ninguém do lugar.
 */
export function registrar(ranking: readonly Colocado[], colocado: Colocado): Colocado[] {
  if (!participa(colocado.apelido) || colocado.estrelas <= 0) return [...ranking];
  const anterior = ranking.find((c) => c.apelido === colocado.apelido);
  if (anterior !== undefined && ordem(colocado, anterior) > 0) return [...ranking];
  return [...ranking.filter((c) => c.apelido !== colocado.apelido), colocado].sort(ordem).slice(0, TAMANHO_DO_RANKING);
}

/** Tira um apelido do ranking: é o que acontece com o nome antigo de quem troca de apelido. */
export function retirar(ranking: readonly Colocado[], apelido: string): Colocado[] {
  return ranking.filter((c) => c.apelido !== apelido);
}

/** Posição do jogador, a partir de 1, ou null se ele não está no ranking. */
export function posicao(ranking: readonly Colocado[], apelido: string): number | null {
  const indice = ranking.findIndex((c) => c.apelido === apelido);
  return indice < 0 ? null : indice + 1;
}

export function serializarRanking(ranking: readonly Colocado[]): string {
  return JSON.stringify(ranking);
}

const ehInteiro = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

/** Confere uma linha vinda de fora (do navegador ou do servidor). null se algo não bate. */
function lerColocado(item: unknown): Colocado | null {
  if (typeof item !== 'object' || item === null) return null;
  const { apelido, avatar, estrelas, mvp } = item as Record<string, unknown>;
  if (typeof apelido !== 'string' || limparApelido(apelido) !== apelido || !participa(apelido)) return null;
  if (typeof avatar !== 'string' || !(AVATARES as readonly string[]).includes(avatar)) return null;
  if (!ehInteiro(estrelas, 3000) || estrelas === 0 || !ehInteiro(mvp, 1000)) return null;
  return { apelido, avatar, estrelas, mvp };
}

/**
 * Lê o ranking guardado no navegador. Qualquer linha fora do formato faz o
 * ranking inteiro ser descartado, como acontece com um save adulterado.
 */
export function desserializarRanking(texto: string | null): Colocado[] {
  if (texto === null) return [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return [];
  }
  if (!Array.isArray(bruto) || bruto.length > TAMANHO_DO_RANKING) return [];

  const lido: Colocado[] = [];
  for (const item of bruto as unknown[]) {
    const colocado = lerColocado(item);
    if (colocado === null || lido.some((c) => c.apelido === colocado.apelido)) return [];
    lido.push(colocado);
  }
  return lido.sort(ordem);
}

/* ---------- ranking online ---------- */

/** Quantas linhas o servidor devolve, no máximo. */
export const TAMANHO_DO_RANKING_ONLINE = 50;

/** Uma linha do ranking mostrado na tela. `voce` marca a linha do próprio jogador. */
export interface ColocadoOnline extends Colocado {
  voce: boolean;
}

export interface RankingOnline {
  /** Os primeiros colocados, já em ordem. No ranking online, apelidos podem se repetir. */
  colocados: ColocadoOnline[];
  /** Posição do jogador, a partir de 1, ou null se ele não está no ranking. */
  posicao: number | null;
  total: number;
}

/**
 * Confere a resposta do servidor antes de ela chegar à tela. O que vem de fora
 * não é confiável: qualquer campo fora do formato faz a resposta inteira ser
 * recusada, e a tela avisa que o ranking online está indisponível.
 */
export function lerRankingOnline(bruto: unknown): RankingOnline | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const { colocados, posicao: lugar, total } = bruto as Record<string, unknown>;
  if (!Array.isArray(colocados) || colocados.length > TAMANHO_DO_RANKING_ONLINE) return null;
  if (!ehInteiro(total, 1_000_000) || total < colocados.length) return null;
  if (lugar !== null && (!ehInteiro(lugar, 1_000_000) || lugar < 1 || lugar > total)) return null;

  const lidos: ColocadoOnline[] = [];
  for (const item of colocados as unknown[]) {
    const colocado = lerColocado(item);
    if (colocado === null) return null;
    lidos.push({ ...colocado, voce: (item as Record<string, unknown>).voce === true });
  }
  // Só uma linha pode ser a do jogador.
  if (lidos.filter((c) => c.voce).length > 1) return null;
  return { colocados: lidos, posicao: lugar, total };
}

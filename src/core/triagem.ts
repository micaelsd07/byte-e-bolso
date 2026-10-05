import type { Carta, Lado, NoTriagem, Vantagens } from './tipos';

export const VIDAS = 3;
export const PONTOS_POR_ACERTO = 10;
/** A cada 3 acertos seguidos o multiplicador sobe um degrau. */
export const ACERTOS_POR_DEGRAU = 3;
export const COMBO_MAXIMO = 4;

export const PODERES = {
  /** O relógio anda na metade da velocidade por alguns segundos. */
  foco: { nome: 'Foco total', recarga: 20_000, duracao: 5_000 },
  /** Mostra para que lado vai a carta da vez. */
  dica: { nome: 'Consulta', recarga: 12_000, duracao: 0 },
  /** O próximo erro não custa vida nem quebra o combo. */
  escudo: { nome: 'Blindagem', recarga: 25_000, duracao: 0 },
} as const;
export type Poder = keyof typeof PODERES;
export const LISTA_PODERES = Object.keys(PODERES) as Poder[];

export interface Rodada {
  ordem: string[];
  posicao: number;
  semente: number;
  pontos: number;
  /** Acertos seguidos. */
  sequencia: number;
  melhorSequencia: number;
  acertos: number;
  vidas: number;
  comboMaximo: number;
  /** Milissegundos de jogo restantes. */
  tempo: number;
  focoRestante: number;
  escudo: boolean;
  dica: boolean;
  recargas: Record<Poder, number>;
  /** Cartas erradas, sem repetição: viram a revisão no fim da rodada. */
  erradas: string[];
  fim: null | 'tempo' | 'vidas';
}

/** Gerador determinístico (mulberry32): a mesma semente dá a mesma ordem de cartas. */
function sorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function embaralhar(ids: readonly string[], semente: number): string[] {
  const aleatorio = sorteio(semente);
  const lista = [...ids];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [lista[i], lista[j]] = [lista[j]!, lista[i]!];
  }
  return lista;
}

export function iniciarRodada(no: NoTriagem, vantagens: Vantagens, semente: number): Rodada {
  return {
    ordem: embaralhar(no.cartas.map((c) => c.id), semente),
    posicao: 0,
    semente,
    pontos: 0,
    sequencia: 0,
    melhorSequencia: 0,
    acertos: 0,
    vidas: VIDAS + vantagens.vidasExtras,
    comboMaximo: vantagens.comboMaximo,
    tempo: (no.duracao + vantagens.tempoExtra) * 1000,
    focoRestante: 0,
    escudo: false,
    dica: false,
    recargas: { foco: 0, dica: 0, escudo: 0 },
    erradas: [],
    fim: null,
  };
}

export function cartaAtual(rodada: Rodada, no: NoTriagem): Carta | null {
  if (rodada.fim !== null) return null;
  const id = rodada.ordem[rodada.posicao];
  return no.cartas.find((c) => c.id === id) ?? null;
}

export function multiplicador(rodada: Rodada): number {
  return Math.min(rodada.comboMaximo, 1 + Math.floor(rodada.sequencia / ACERTOS_POR_DEGRAU));
}

/** Avança o relógio. Com o Foco total ativo, o tempo de jogo corre pela metade. */
export function avancar(rodada: Rodada, ms: number): Rodada {
  if (rodada.fim !== null || ms <= 0) return rodada;
  const emFoco = Math.min(ms, rodada.focoRestante);
  const tempo = Math.max(0, rodada.tempo - (emFoco * 0.5 + (ms - emFoco)));
  const recargas = { ...rodada.recargas };
  for (const poder of LISTA_PODERES) recargas[poder] = Math.max(0, recargas[poder] - ms);
  return { ...rodada, tempo, focoRestante: rodada.focoRestante - emFoco, recargas, fim: tempo === 0 ? 'tempo' : null };
}

export interface Resposta {
  rodada: Rodada;
  carta: Carta;
  acertou: boolean;
  /** O erro foi absorvido pela Blindagem. */
  protegido: boolean;
  ganho: number;
}

export function responder(rodada: Rodada, no: NoTriagem, lado: Lado): Resposta | null {
  const carta = cartaAtual(rodada, no);
  if (carta === null) return null;

  let posicao = rodada.posicao + 1;
  let { ordem } = rodada;
  if (posicao >= ordem.length) {
    // O baralho acabou antes do tempo: embaralha de novo. Repetir é o que fixa.
    ordem = embaralhar(ordem, rodada.semente + rodada.acertos + rodada.erradas.length + 1);
    // Evita mostrar a mesma carta duas vezes seguidas.
    if (ordem.length > 1 && ordem[0] === carta.id) [ordem[0], ordem[1]] = [ordem[1]!, ordem[0]!];
    posicao = 0;
  }
  const base = { ...rodada, ordem, posicao, dica: false };

  if (carta.lado === lado) {
    const ganho = PONTOS_POR_ACERTO * multiplicador(rodada);
    const sequencia = rodada.sequencia + 1;
    return {
      carta,
      acertou: true,
      protegido: false,
      ganho,
      rodada: {
        ...base,
        pontos: rodada.pontos + ganho,
        sequencia,
        melhorSequencia: Math.max(rodada.melhorSequencia, sequencia),
        acertos: rodada.acertos + 1,
      },
    };
  }

  const erradas = rodada.erradas.includes(carta.id) ? rodada.erradas : [...rodada.erradas, carta.id];
  if (rodada.escudo) {
    return { carta, acertou: false, protegido: true, ganho: 0, rodada: { ...base, erradas, escudo: false } };
  }
  const vidas = rodada.vidas - 1;
  return {
    carta,
    acertou: false,
    protegido: false,
    ganho: 0,
    rodada: { ...base, erradas, vidas, sequencia: 0, fim: vidas <= 0 ? 'vidas' : null },
  };
}

export function podeUsar(rodada: Rodada, poder: Poder): boolean {
  if (rodada.fim !== null || rodada.recargas[poder] > 0) return false;
  if (poder === 'escudo') return !rodada.escudo;
  if (poder === 'dica') return !rodada.dica;
  return rodada.focoRestante === 0;
}

export function usarPoder(rodada: Rodada, poder: Poder): Rodada {
  if (!podeUsar(rodada, poder)) return rodada;
  const recargas = { ...rodada.recargas, [poder]: PODERES[poder].recarga };
  if (poder === 'foco') return { ...rodada, recargas, focoRestante: PODERES.foco.duracao };
  if (poder === 'dica') return { ...rodada, recargas, dica: true };
  return { ...rodada, recargas, escudo: true };
}

/** Carga da barra de recarga, de 0 (acabou de usar) a 1 (pronto). */
export function carga(rodada: Rodada, poder: Poder): number {
  return 1 - rodada.recargas[poder] / PODERES[poder].recarga;
}

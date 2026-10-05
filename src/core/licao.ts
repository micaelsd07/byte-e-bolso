import type { Exercicio, NoLicao } from './tipos';

export const VIDAS_DA_LICAO = 3;

/**
 * Deixa dois trechos de código comparáveis: ignora espaços onde eles não mudam
 * o sentido, trata aspas simples e duplas como iguais e desconsidera o ponto e
 * vírgula final. O código digitado não é executado: é comparado com as
 * respostas aceitas da lição.
 */
export function normalizar(codigo: string): string {
  return codigo
    .trim()
    .replace(/[‘’“”']/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s*([()[\]{},;:=+\-*/<>!%&|.])\s*/g, '$1')
    .replace(/;+$/, '');
}

/** Resposta do jogador: índice da opção, peças na ordem montada ou texto digitado. */
export type Resposta = number | readonly string[] | string;

export function conferir(exercicio: Exercicio, resposta: Resposta): boolean {
  if (exercicio.tipo === 'escolha') return resposta === exercicio.correta;
  if (exercicio.tipo === 'montar') {
    return Array.isArray(resposta) && resposta.length === exercicio.pecas.length && resposta.every((p, i) => p === exercicio.pecas[i]);
  }
  if (typeof resposta !== 'string') return false;
  const digitado = normalizar(resposta);
  return digitado !== '' && exercicio.respostas.some((r) => normalizar(r) === digitado);
}

/** A resposta certa em texto, para mostrar depois de um erro. */
export function gabarito(exercicio: Exercicio): string {
  if (exercicio.tipo === 'escolha') return exercicio.opcoes[exercicio.correta] ?? '';
  if (exercicio.tipo === 'montar') return exercicio.pecas.join(' ');
  return `${exercicio.antes}${exercicio.respostas[0] ?? ''}${exercicio.depois}`;
}

export interface Sessao {
  /** Ids dos exercícios que faltam. Quem erra volta para o fim da fila. */
  fila: string[];
  total: number;
  vidas: number;
  erros: number;
  /** Exercícios errados ao menos uma vez, sem repetição: viram a revisão. */
  errados: string[];
  fim: null | 'concluida' | 'vidas';
}

/** `vidas` são as vidas com que o jogador entra: as do perfil, no jogo. */
export function iniciarSessao(licao: NoLicao, vidas = VIDAS_DA_LICAO): Sessao {
  return {
    fila: licao.exercicios.map((e) => e.id),
    total: licao.exercicios.length,
    vidas,
    erros: 0,
    errados: [],
    fim: null,
  };
}

export function exercicioAtual(sessao: Sessao, licao: NoLicao): Exercicio | null {
  if (sessao.fim !== null) return null;
  return licao.exercicios.find((e) => e.id === sessao.fila[0]) ?? null;
}

/** Fração da lição já vencida, de 0 a 1. */
export function progresso(sessao: Sessao): number {
  return sessao.total === 0 ? 1 : (sessao.total - sessao.fila.length) / sessao.total;
}

export function responderExercicio(sessao: Sessao, licao: NoLicao, resposta: Resposta): { sessao: Sessao; acertou: boolean } | null {
  const exercicio = exercicioAtual(sessao, licao);
  if (exercicio === null) return null;
  const [, ...resto] = sessao.fila;

  if (conferir(exercicio, resposta)) {
    return { acertou: true, sessao: { ...sessao, fila: resto, fim: resto.length === 0 ? 'concluida' : null } };
  }
  const vidas = sessao.vidas - 1;
  return {
    acertou: false,
    sessao: {
      ...sessao,
      // O exercício errado volta no fim: a lição só termina quando ele for acertado.
      fila: [...resto, exercicio.id],
      vidas,
      erros: sessao.erros + 1,
      errados: sessao.errados.includes(exercicio.id) ? sessao.errados : [...sessao.errados, exercicio.id],
      fim: vidas <= 0 ? 'vidas' : null,
    },
  };
}

/**
 * Pontos da lição, de 0 a 100: 100 sem erro, 15 a menos por erro, no mínimo 10
 * para quem concluiu. Quem ficou sem vidas não pontua.
 */
export function pontosDaSessao(sessao: Sessao): number {
  if (sessao.fim !== 'concluida') return 0;
  return Math.max(10, 100 - 15 * sessao.erros);
}

/** Peças do exercício de montar, embaralhadas de forma repetível. */
export function pecasEmbaralhadas(pecas: readonly string[], extras: readonly string[], semente: number): string[] {
  const todas = [...pecas, ...extras];
  let a = semente >>> 0;
  for (let i = todas.length - 1; i > 0; i--) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    const j = a % (i + 1);
    [todas[i], todas[j]] = [todas[j]!, todas[i]!];
  }
  return todas;
}

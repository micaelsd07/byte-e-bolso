import type { Argumento, NoNegociacao, Perfil, TipoArgumento } from './tipos';

/** O argumento que funciona com cada tipo de cliente. */
export const ARGUMENTO_CERTO: Record<Perfil, Exclude<TipoArgumento, 'fraco'>> = {
  apressado: 'prazo',
  economico: 'valor',
  exigente: 'qualidade',
};

export type Efeito = 'forte' | 'medio' | 'ruim';

export interface Duelo {
  oferta: number;
  paciencia: number;
  usados: string[];
  fim: null | 'fechado' | 'desistiu';
}

export function iniciarDuelo(no: NoNegociacao): Duelo {
  return { oferta: no.ofertaInicial, paciencia: no.paciencia, usados: [], fim: null };
}

/** Preço justo do trabalho: horas vezes o valor da hora. Fechar abaixo disso é pagar para trabalhar. */
export function precoJusto(no: NoNegociacao): number {
  return no.horas * no.valorHora;
}

export function efeitoDo(argumento: Argumento, perfil: Perfil): Efeito {
  if (argumento.tipo === 'fraco') return 'ruim';
  return argumento.tipo === ARGUMENTO_CERTO[perfil] ? 'forte' : 'medio';
}

const FORCA: Record<Efeito, number> = { forte: 1, medio: 0.45, ruim: -0.5 };

export interface Jogada {
  duelo: Duelo;
  argumento: Argumento;
  efeito: Efeito;
  variacao: number;
}

/**
 * Usa um argumento. `precisao` vai de 0 a 1 e vem da barra de tempo: o mesmo
 * argumento rende mais quando dito na hora certa. Cada argumento gasta
 * paciência do cliente (o ruim gasta o dobro); com a paciência em zero, ele vai embora.
 */
export function argumentar(duelo: Duelo, no: NoNegociacao, argumentoId: string, precisao: number): Jogada | null {
  if (duelo.fim !== null || duelo.usados.includes(argumentoId)) return null;
  const argumento = no.argumentos.find((a) => a.id === argumentoId);
  if (argumento === undefined) return null;

  const efeito = efeitoDo(argumento, no.perfil);
  // Três argumentos fortes ditos com precisão total levam da oferta inicial ao máximo.
  const degrau = (no.maximo - no.ofertaInicial) / 3;
  const p = Math.min(1, Math.max(0, precisao));
  const bruto = efeito === 'ruim' ? degrau * FORCA.ruim : degrau * FORCA[efeito] * (0.4 + 0.6 * p);
  const oferta = Math.min(no.maximo, Math.max(Math.round(no.ofertaInicial / 2), Math.round(duelo.oferta + bruto)));
  const paciencia = Math.max(0, duelo.paciencia - (efeito === 'ruim' ? 2 : 1));

  return {
    argumento,
    efeito,
    variacao: oferta - duelo.oferta,
    duelo: { oferta, paciencia, usados: [...duelo.usados, argumentoId], fim: paciencia === 0 ? 'desistiu' : null },
  };
}

export function fechar(duelo: Duelo): Duelo {
  return duelo.fim === null ? { ...duelo, fim: 'fechado' } : duelo;
}

/** Valor que entra no caixa: o preço fechado, ou nada se o cliente foi embora. */
export function precoFechado(duelo: Duelo): number {
  return duelo.fim === 'fechado' ? duelo.oferta : 0;
}

/** Pontuação de 0 a 100: o preço fechado como fração do máximo que o cliente pagaria. */
export function pontosDoDuelo(duelo: Duelo, no: NoNegociacao): number {
  return Math.round((100 * precoFechado(duelo)) / no.maximo);
}

/** Melhor preço possível com precisão total. Usado para garantir que a fase é vencível. */
export function melhorPreco(no: NoNegociacao): number {
  const bons = no.argumentos
    .filter((a) => a.tipo !== 'fraco')
    .sort((a, b) => FORCA[efeitoDo(b, no.perfil)] - FORCA[efeitoDo(a, no.perfil)]);
  let duelo = iniciarDuelo(no);
  for (const argumento of bons) {
    // Para antes de gastar a última paciência: é preciso estar na mesa para fechar.
    if (duelo.paciencia <= 1) break;
    duelo = argumentar(duelo, no, argumento.id, 1)?.duelo ?? duelo;
  }
  return duelo.oferta;
}

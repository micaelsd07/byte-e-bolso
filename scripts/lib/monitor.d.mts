export interface Tentativa {
  codigo: number;
  tempo: number;
}

export interface Sonda extends Tentativa {
  data: string;
  ambiente: string;
  alvo: string;
  versao?: string;
}

export interface IssueAberta {
  number: number;
  title: string;
}

export interface AlertaAtivo {
  chave: string;
  sonda: Sonda;
}

export interface Decisao {
  abrir: { titulo: string; corpo: string }[];
  fechar: { numero: number; comentario: string }[];
}

export const LIMITE_LATENCIA: number;
export const CABECALHO: string;
export const MAXIMO_DE_LINHAS: number;
export const AMBIENTES: string[];
export const ALERTAS: string[];
export function resumir(tentativas: Tentativa[]): Tentativa;
export function linhaCsv(sonda: Sonda): string;
export function acrescentar(csv: string | null | undefined, sondas: Sonda[]): string;
export function alertasAtivos(sondas: Sonda[]): AlertaAtivo[];
export function decidir(sondas: Sonda[], issuesAbertas: IssueAberta[], execucao?: string): Decisao;

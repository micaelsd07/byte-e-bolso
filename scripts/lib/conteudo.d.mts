export interface ConteudoBruto {
  fases: { arquivo: string; dados: unknown }[];
  habilidades: unknown;
  conquistas: unknown;
}

export const PASTA_CONTEUDO: string;
export function carregarConteudo(pasta?: string): ConteudoBruto;
export function validarConteudo(conteudo: ConteudoBruto, pasta?: string): string[];

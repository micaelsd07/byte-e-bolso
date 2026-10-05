export interface ConteudoBruto {
  trilhas: { arquivo: string; dados: unknown }[];
  melhorias: unknown;
}

export const PASTA_CONTEUDO: string;
export function carregarConteudo(pasta?: string): ConteudoBruto;
export function validarConteudo(conteudo: ConteudoBruto, pasta?: string): string[];

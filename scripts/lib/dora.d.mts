export interface Deploy {
  sha: string;
  commitEm: string | null;
  producaoEm: string;
  sucesso: boolean;
}

export interface Entrada {
  deploys: Deploy[];
  rollbacks: { em: string }[];
  alertas: { titulo: string; abertoEm: string; fechadoEm: string | null }[];
  inicio: string;
  fim: string;
}

export interface Metricas {
  periodo: { inicio: string; fim: string; dias: number };
  frequenciaDeDeploy: { deploys: number; porSemana: number };
  leadTime: { horas: number | null; amostras: number; linhaDeBaseDias: number; vezesMaisRapido: number | null };
  taxaDeFalha: { deploys: number; falhas: number; percentual: number | null };
  tempoDeRecuperacao: { minutos: number | null; alertasFechados: number; alertasAbertos: number };
}

export const LINHA_DE_BASE_DIAS: number;
export function mediana(valores: number[]): number | null;
export function calcular(entrada: Entrada): Metricas;
export function paraMarkdown(metricas: Metricas): string;

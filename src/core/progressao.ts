import type { Passo, Registro } from './tipos';

export const XP_MAX: Record<Passo['tipo'], number> = { decisao: 30, orcamento: 50 };

export function xpDoPasso(tipo: Passo['tipo'], nota: number): number {
  return Math.round(Math.min(1, Math.max(0, nota)) * XP_MAX[tipo]);
}

/** XP acumulado necessário para chegar ao nível n: 0, 100, 300, 600, 1000… */
export function xpParaNivel(nivel: number): number {
  return 50 * nivel * (nivel - 1);
}

export function nivelPorXp(xp: number): number {
  const seguro = Math.max(0, xp);
  return Math.floor((1 + Math.sqrt(1 + seguro / 12.5)) / 2);
}

export function progressoNivel(xp: number): { nivel: number; atual: number; necessario: number } {
  const nivel = nivelPorXp(xp);
  const base = xpParaNivel(nivel);
  return { nivel, atual: Math.max(0, xp) - base, necessario: xpParaNivel(nivel + 1) - base };
}

/** Estrelas de uma fase, pela média das notas dos passos dela. */
export function estrelasDaFase(historico: Registro[], faseId: string): 0 | 1 | 2 | 3 {
  const notas = historico.filter((r) => r.faseId === faseId).map((r) => r.nota);
  if (notas.length === 0) return 0;
  const media = notas.reduce((s, n) => s + n, 0) / notas.length;
  if (media >= 0.8) return 3;
  if (media >= 0.55) return 2;
  return 1;
}

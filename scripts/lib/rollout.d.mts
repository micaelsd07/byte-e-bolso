export interface Rollout {
  estavel: string | null;
  anterior: string | null;
  canario: string | null;
  percentual: number;
}

export const VAZIO: Readonly<Rollout>;
export class ErroRollout extends Error {}
export function ler(texto: string | null | undefined): Rollout;
export function escrever(rollout: Rollout): string;
export function abrirCanario(rollout: Rollout, sha: string, percentual: number): Rollout;
export function promover(rollout: Rollout): Rollout;
export function rollback(rollout: Rollout): Rollout;
export function releasesNecessarias(rollout: Rollout): string[];

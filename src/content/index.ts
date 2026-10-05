import type { Catalogo } from '../core/save';
import type { Conquista, Fase, Habilidade } from '../core/tipos';
import conquistasJson from './conquistas.json';
import fase01 from './fases/fase-01.json';
import habilidadesJson from './habilidades.json';

// O formato é garantido antes daqui: scripts/validar-conteudo.mjs valida cada
// JSON contra o schema e roda como primeiro passo do build.
export const FASES = [fase01] as unknown as readonly Fase[];
export const HABILIDADES = habilidadesJson as unknown as readonly Habilidade[];
export const CONQUISTAS = conquistasJson as unknown as readonly Conquista[];

export const PRIMEIRA_FASE = FASES[0]!;

export function fasePorId(id: string): Fase | undefined {
  return FASES.find((f) => f.id === id);
}

export function proximaFase(id: string): Fase | undefined {
  const indice = FASES.findIndex((f) => f.id === id);
  return indice < 0 ? undefined : FASES[indice + 1];
}

export const CATALOGO: Catalogo = {
  fases: Object.fromEntries(FASES.map((f) => [f.id, f.passos.map((p) => p.id)])),
  conquistas: CONQUISTAS.map((c) => c.id),
  habilidades: HABILIDADES.map((h) => h.id),
};

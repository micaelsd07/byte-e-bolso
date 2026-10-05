import type { Catalogo } from '../core/save';
import type { Capitulo, Melhoria, No, Trilha } from '../core/tipos';
import melhoriasJson from './melhorias.json';
import c from './trilhas/c.json';
import carreira from './trilhas/carreira.json';
import cpp from './trilhas/cpp.json';
import css from './trilhas/css.json';
import html from './trilhas/html.json';
import java from './trilhas/java.json';
import javascript from './trilhas/javascript.json';
import python from './trilhas/python.json';

/** O que toda lição vale: fica aqui, e não repetido em cada JSON. */
const PADRAO_DA_LICAO = { categoria: 'tecnologia', recompensa: 200, metas: [10, 70, 100], teto: 100 } as const;

// O formato é garantido antes daqui: scripts/validar-conteudo.mjs valida cada
// JSON contra o schema e roda como primeiro passo do build.
function montar(bruto: unknown): Trilha {
  const trilha = bruto as Trilha;
  return {
    ...trilha,
    unidades: trilha.unidades.map((unidade) => ({
      ...unidade,
      nos: unidade.nos.map((no) => (no.tipo === 'licao' ? ({ ...PADRAO_DA_LICAO, ...no } as No) : no)),
    })),
  };
}

/** Na ordem em que aparecem para o jogador escolher. */
export const TRILHAS: readonly Trilha[] = [python, javascript, java, c, cpp, html, css, carreira].map(montar);
export const MELHORIAS = melhoriasJson as unknown as readonly Melhoria[];

export const UNIDADES: readonly Capitulo[] = TRILHAS.flatMap((t) => t.unidades);
const FASES: readonly No[] = UNIDADES.flatMap((u) => u.nos);

export function trilhaPorId(id: string | null): Trilha | undefined {
  return TRILHAS.find((t) => t.id === id);
}

export function trilhaDoNo(noId: string): Trilha | undefined {
  return TRILHAS.find((t) => t.unidades.some((u) => u.nos.some((n) => n.id === noId)));
}

export function fasesDa(trilha: Trilha): No[] {
  return trilha.unidades.flatMap((u) => u.nos);
}

export function noPorId(id: string): No | undefined {
  return FASES.find((n) => n.id === id);
}

/** A fase seguinte dentro da mesma trilha. */
export function noSeguinte(id: string): No | undefined {
  const trilha = trilhaDoNo(id);
  if (trilha === undefined) return undefined;
  const fases = fasesDa(trilha);
  return fases[fases.findIndex((n) => n.id === id) + 1];
}

export const CATALOGO: Catalogo = {
  tetos: Object.fromEntries(FASES.map((n) => [n.id, n.teto])),
  minimos: Object.fromEntries(FASES.map((n) => [n.id, n.metas[0]])),
  trilhas: Object.fromEntries(TRILHAS.map((t) => [t.id, fasesDa(t).map((n) => n.id)])),
  melhorias: MELHORIAS.map((m) => m.id),
};

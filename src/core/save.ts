import { LIMITES } from './atributos';
import { limparApelido } from './partida';
import { XP_MAX } from './progressao';
import { ATRIBUTOS, CATEGORIAS, type Atributos, type Estado, type Registro } from './tipos';

/** O que a validação precisa saber do conteúdo, sem depender de src/content. */
export interface Catalogo {
  /** id da fase -> ids dos passos, na ordem */
  fases: Record<string, readonly string[]>;
  conquistas: readonly string[];
  habilidades: readonly string[];
}

export function serializar(estado: Estado): string {
  return JSON.stringify(estado);
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehInteiro = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const semRepetidos = (v: readonly string[]): boolean => new Set(v).size === v.length;

function lerAtributos(v: unknown): Atributos | null {
  if (!ehObjeto(v)) return null;
  const atributos = {} as Atributos;
  for (const a of ATRIBUTOS) {
    const valor = v[a];
    if (!ehInteiro(valor, LIMITES[a].min, LIMITES[a].max)) return null;
    atributos[a] = valor;
  }
  return atributos;
}

function lerHistorico(v: unknown, catalogo: Catalogo): Registro[] | null {
  if (!Array.isArray(v)) return null;
  const vistos = new Set<string>();
  const historico: Registro[] = [];
  for (const item of v) {
    if (!ehObjeto(item)) return null;
    const { faseId, passoId, tipo, categoria, nota } = item;
    if (typeof faseId !== 'string' || typeof passoId !== 'string') return null;
    if (!catalogo.fases[faseId]?.includes(passoId)) return null;
    if (tipo !== 'decisao' && tipo !== 'orcamento') return null;
    if (!CATEGORIAS.some((c) => c === categoria)) return null;
    if (typeof nota !== 'number' || !(nota >= 0 && nota <= 1)) return null;
    // Um passo só é resolvido uma vez: repetição é recompensa duplicada.
    const chave = `${faseId}/${passoId}`;
    if (vistos.has(chave)) return null;
    vistos.add(chave);
    historico.push({ faseId, passoId, tipo, categoria: categoria as Registro['categoria'], nota });
  }
  return historico;
}

function listaDe(v: unknown, permitidos: readonly string[]): string[] | null {
  if (!Array.isArray(v) || !v.every((x): x is string => typeof x === 'string')) return null;
  return semRepetidos(v) && v.every((x) => permitidos.includes(x)) ? v : null;
}

/**
 * Lê um save vindo do armazenamento do navegador. Qualquer coisa fora do
 * formato, fora dos limites ou incoerente com o histórico devolve null, e o
 * jogo começa uma partida nova em vez de confiar no que leu.
 */
export function desserializar(texto: string, catalogo: Catalogo): Estado | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!ehObjeto(bruto) || bruto.versao !== 1) return null;

  const atributos = lerAtributos(bruto.atributos);
  const historico = lerHistorico(bruto.historico, catalogo);
  const conquistas = listaDe(bruto.conquistas, catalogo.conquistas);
  const fasesConcluidas = listaDe(bruto.fasesConcluidas, Object.keys(catalogo.fases));
  if (atributos === null || historico === null || conquistas === null || fasesConcluidas === null) return null;

  const { apelido, faseId, status, motivoDerrota, recargas } = bruto;
  if (typeof apelido !== 'string' || limparApelido(apelido) !== apelido) return null;
  if (typeof faseId !== 'string') return null;
  const passosDaFase = catalogo.fases[faseId];
  if (passosDaFase === undefined) return null;
  if (!ehInteiro(bruto.passo, 0, passosDaFase.length)) return null;
  if (status !== 'jogando' && status !== 'faseConcluida' && status !== 'derrota') return null;
  if (motivoDerrota !== null && motivoDerrota !== 'falencia' && motivoDerrota !== 'burnout') return null;
  if ((status === 'derrota') !== (motivoDerrota !== null)) return null;
  if (status === 'faseConcluida' && bruto.passo !== passosDaFase.length) return null;

  // Coerência com o histórico: rodada conta passos resolvidos e o XP tem teto por passo.
  if (bruto.rodada !== historico.length) return null;
  const xpMaximo = historico.reduce((s, r) => s + XP_MAX[r.tipo], 0);
  if (!ehInteiro(bruto.xp, 0, xpMaximo)) return null;
  if (!ehInteiro(bruto.rodadasNoVermelho, 0, historico.length)) return null;
  if (!ehInteiro(bruto.bonusDesafio, 0, 50)) return null;
  if (!fasesConcluidas.every((f) => historico.some((r) => r.faseId === f))) return null;

  if (!ehObjeto(recargas)) return null;
  const recargasLidas: Record<string, number> = {};
  for (const [id, rodada] of Object.entries(recargas)) {
    if (!catalogo.habilidades.includes(id) || !ehInteiro(rodada, 0, historico.length + 20)) return null;
    recargasLidas[id] = rodada;
  }

  return {
    versao: 1,
    apelido,
    atributos,
    xp: bruto.xp,
    faseId,
    passo: bruto.passo,
    rodada: bruto.rodada,
    recargas: recargasLidas,
    bonusDesafio: bruto.bonusDesafio,
    rodadasNoVermelho: bruto.rodadasNoVermelho,
    historico,
    conquistas,
    fasesConcluidas,
    status,
    motivoDerrota,
  };
}

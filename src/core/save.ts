import { AVATARES, VIDAS_MAXIMAS, limparApelido } from './jogo';
import type { Estado } from './tipos';

/** O que a validação precisa saber do conteúdo, sem depender de src/content. */
export interface Catalogo {
  /** id da fase -> maior pontuação que ela admite */
  tetos: Record<string, number>;
  /** id da trilha -> ids das fases dela, na ordem */
  trilhas: Record<string, readonly string[]>;
  /** id da fase -> pontos para 1 estrela */
  minimos: Record<string, number>;
  melhorias: readonly string[];
}

export const SALDO_MINIMO = -1_000_000;
export const SALDO_MAXIMO = 10_000_000;

export function serializar(estado: Estado): string {
  return JSON.stringify(estado);
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehInteiro = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/**
 * Lê um save vindo do armazenamento do navegador. Qualquer coisa fora do
 * formato, fora dos limites ou incoerente com a trilha devolve null, e o jogo
 * começa do zero em vez de confiar no que leu.
 */
export function desserializar(texto: string, catalogo: Catalogo): Estado | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!ehObjeto(bruto) || bruto.versao !== 2) return null;

  const { apelido, dinheiro, rodadas, melhorias, trilha, avatar, vidas, sequencia, ultimoDia, diaDasVidas } = bruto;
  if (typeof avatar !== 'string' || !(AVATARES as readonly string[]).includes(avatar)) return null;
  // Até 3 vidas além do máximo: é a folga das melhorias que dão vida extra.
  if (!ehInteiro(vidas, 0, VIDAS_MAXIMAS + 3)) return null;
  if (!ehInteiro(sequencia, 0, 5000)) return null;
  const ehDia = (v: unknown): v is string | null => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
  if (!ehDia(ultimoDia) || !ehDia(diaDasVidas)) return null;
  // Sequência sem dia de prática registrado, ou o contrário, é incoerente.
  if ((sequencia === 0) !== (ultimoDia === null)) return null;
  if (trilha !== null && (typeof trilha !== 'string' || catalogo.trilhas[trilha] === undefined)) return null;
  if (typeof apelido !== 'string' || limparApelido(apelido) !== apelido) return null;
  if (!ehInteiro(dinheiro, SALDO_MINIMO, SALDO_MAXIMO)) return null;

  if (!ehObjeto(bruto.nos)) return null;
  const nos: Record<string, number> = {};
  for (const [id, pontos] of Object.entries(bruto.nos)) {
    const teto = catalogo.tetos[id];
    if (teto === undefined || !ehInteiro(pontos, 0, teto)) return null;
    nos[id] = pontos;
  }
  // Uma fase só tem pontuação se a anterior rendeu ao menos 1 estrela: não se pula fase.
  for (const ordem of Object.values(catalogo.trilhas)) {
    for (let i = 1; i < ordem.length; i++) {
      const anterior = ordem[i - 1]!;
      if (nos[ordem[i]!] !== undefined && (nos[anterior] ?? 0) < (catalogo.minimos[anterior] ?? Infinity)) return null;
    }
  }
  // Cada fase pontuada foi jogada ao menos uma vez.
  if (!ehInteiro(rodadas, Object.keys(nos).length, 100_000)) return null;

  if (!Array.isArray(melhorias) || !melhorias.every((m): m is string => typeof m === 'string')) return null;
  if (new Set(melhorias).size !== melhorias.length) return null;
  if (!melhorias.every((m) => catalogo.melhorias.includes(m))) return null;

  return { versao: 2, apelido, avatar, trilha, vidas, sequencia, ultimoDia, diaDasVidas, dinheiro, nos, melhorias, rodadas };
}

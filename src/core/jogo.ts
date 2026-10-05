import { COMBO_MAXIMO } from './triagem';
import type { Capitulo, Estado, Melhoria, No, Vantagens } from './tipos';

export const DINHEIRO_INICIAL = 2500;
/** Contas da semana: toda rodada jogada cobra isto, mais a manutenção das melhorias. */
export const CUSTO_BASE = 60;
/** Juros por rodada sobre saldo negativo, como um cheque especial. */
export const JUROS = 0.08;
export const APELIDO_MAX = 16;
export const VIDAS_MAXIMAS = 5;
/** Preço, em dinheiro do jogo, para encher as vidas sem esperar o dia seguinte. */
export const CUSTO_RECARGA = 100;
/** Personagens disponíveis no perfil. */
export const AVATARES = ['foco', 'escudo', 'dica', 'moeda', 'cidade', 'negociacao'] as const;

/** Só letras, números, espaço, hífen e sublinhado: o apelido não é lugar para dado pessoal. */
export function limparApelido(bruto: string): string {
  const limpo = bruto
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, APELIDO_MAX);
  return limpo === '' ? 'Visitante' : limpo;
}

export function novoEstado(apelido: string): Estado {
  return {
    versao: 2,
    apelido: limparApelido(apelido),
    avatar: AVATARES[0],
    trilha: null,
    vidas: VIDAS_MAXIMAS,
    sequencia: 0,
    ultimoDia: null,
    diaDasVidas: null,
    dinheiro: DINHEIRO_INICIAL, nos: {},
    melhorias: [],
    rodadas: 0,
  };
}

/** Troca a trilha que o jogador está seguindo. O progresso das outras trilhas fica guardado. */
export function escolherTrilha(estado: Estado, trilhaId: string | null): Estado {
  return { ...estado, trilha: trilhaId };
}

export function estrelasPor(no: No, pontos: number): 0 | 1 | 2 | 3 {
  if (pontos >= no.metas[2]) return 3;
  if (pontos >= no.metas[1]) return 2;
  if (pontos >= no.metas[0]) return 1;
  return 0;
}

export function estrelasDoNo(estado: Estado, no: No): 0 | 1 | 2 | 3 {
  return estrelasPor(no, estado.nos[no.id] ?? 0);
}

/** A primeira fase está sempre aberta; cada uma das outras abre com 1 estrela na anterior. */
export function desbloqueado(estado: Estado, capitulos: readonly Capitulo[], noId: string): boolean {
  const trilha = capitulos.flatMap((c) => c.nos);
  const indice = trilha.findIndex((n) => n.id === noId);
  if (indice < 0) return false;
  if (indice === 0) return true;
  return estrelasDoNo(estado, trilha[indice - 1]!) >= 1;
}

/** Próxima fase a jogar: a primeira aberta que ainda não tem estrela. */
export function proximoNo(estado: Estado, capitulos: readonly Capitulo[]): No | null {
  const trilha = capitulos.flatMap((c) => c.nos);
  return trilha.find((n) => estrelasDoNo(estado, n) === 0) ?? null;
}

export function vantagens(estado: Estado, catalogo: readonly Melhoria[]): Vantagens {
  const v: Vantagens = { tempoExtra: 0, vidasExtras: 0, comboMaximo: COMBO_MAXIMO, renda: 0 };
  for (const melhoria of catalogo) {
    if (!estado.melhorias.includes(melhoria.id)) continue;
    const { efeito } = melhoria;
    if (efeito.tipo === 'tempo') v.tempoExtra += efeito.segundos;
    else if (efeito.tipo === 'vida') v.vidasExtras += 1;
    else if (efeito.tipo === 'combo') v.comboMaximo += 1;
    else if (efeito.tipo === 'renda') v.renda += efeito.percentual;
  }
  return v;
}

export function custoFixo(estado: Estado, catalogo: readonly Melhoria[]): number {
  return catalogo
    .filter((m) => estado.melhorias.includes(m.id))
    .reduce((soma, m) => soma + m.manutencao, CUSTO_BASE);
}

export type Compra = { ok: true; estado: Estado } | { ok: false; motivo: 'jaTem' | 'semDinheiro' };

export function comprar(estado: Estado, melhoria: Melhoria): Compra {
  if (estado.melhorias.includes(melhoria.id)) return { ok: false, motivo: 'jaTem' };
  // Não se compra fiado: com o saldo abaixo do preço (ou negativo), a compra espera.
  if (estado.dinheiro < melhoria.custo || estado.dinheiro < 0) return { ok: false, motivo: 'semDinheiro' };
  return {
    ok: true,
    estado: { ...estado, dinheiro: estado.dinheiro - melhoria.custo, melhorias: [...estado.melhorias, melhoria.id] },
  };
}

export interface Fechamento {
  pontos: number;
  estrelas: 0 | 1 | 2 | 3;
  recorde: boolean;
  ganho: number;
  custos: number;
  juros: number;
  saldoAntes: number;
  saldo: number;
}

/**
 * Fecha uma rodada: paga o que a fase rendeu, cobra o custo fixo e, se o saldo
 * já estava negativo, os juros. `ganhoDireto` é usado pela negociação, em que o
 * dinheiro que entra é o preço fechado com o cliente.
 */
export function concluirNo(
  estado: Estado,
  no: No,
  pontosBrutos: number,
  catalogo: readonly Melhoria[],
  ganhoDireto?: number,
): { estado: Estado; fechamento: Fechamento } {
  const pontos = Math.min(no.teto, Math.max(0, Math.round(pontosBrutos)));
  const anterior = estado.nos[no.id] ?? 0;
  const { renda } = vantagens(estado, catalogo);

  const proporcional = Math.round(no.recompensa * Math.min(1, pontos / no.metas[2]));
  const ganho = ganhoDireto !== undefined ? Math.max(0, Math.round(ganhoDireto)) : Math.round(proporcional * (1 + renda / 100));
  const custos = custoFixo(estado, catalogo);
  const juros = estado.dinheiro < 0 ? Math.ceil(-estado.dinheiro * JUROS) : 0;
  const saldo = estado.dinheiro + ganho - custos - juros;

  return {
    estado: {
      ...estado,
      dinheiro: saldo,
      rodadas: estado.rodadas + 1,
      nos: { ...estado.nos, [no.id]: Math.max(anterior, pontos) },
    },
    fechamento: {
      pontos,
      estrelas: estrelasPor(no, pontos),
      recorde: pontos > anterior,
      ganho,
      custos,
      juros,
      saldoAntes: estado.dinheiro,
      saldo,
    },
  };
}

export function totalEstrelas(estado: Estado, capitulos: readonly Capitulo[]): number {
  return capitulos.flatMap((c) => c.nos).reduce<number>((soma, no) => soma + estrelasDoNo(estado, no), 0);
}

/** Um nível a cada 3 estrelas. */
export function nivel(estado: Estado, capitulos: readonly Capitulo[]): number {
  return 1 + Math.floor(totalEstrelas(estado, capitulos) / 3);
}

/**
 * MVP Score, de 0 a 1000. Conta a melhor pontuação de cada fase (não a soma das
 * tentativas), então repetir uma fase só ajuda se o jogador jogar melhor.
 * Domínio das fases 70%, estrelas 20%, caixa no azul 10%.
 */
export function mvp(estado: Estado, capitulos: readonly Capitulo[]): number {
  const trilha = capitulos.flatMap((c) => c.nos);
  if (trilha.length === 0 || Object.keys(estado.nos).length === 0) return 0;
  const dominio = trilha.reduce((s, no) => s + Math.min(1, (estado.nos[no.id] ?? 0) / no.metas[2]), 0) / trilha.length;
  const estrelas = totalEstrelas(estado, capitulos) / (trilha.length * 3);
  const caixa = estado.dinheiro >= 0 ? 1 : 0;
  return Math.round(1000 * (0.7 * dominio + 0.2 * estrelas + 0.1 * caixa));
}

/* ---------- personagem, vidas e sequência de dias ---------- */

export function escolherAvatar(estado: Estado, avatar: string): Estado {
  return (AVATARES as readonly string[]).includes(avatar) ? { ...estado, avatar } : estado;
}

/** Título do personagem, pelo nível. */
export function tituloDoNivel(nivelAtual: number): string {
  if (nivelAtual >= 16) return 'Mestre do Código';
  if (nivelAtual >= 11) return 'Dev Sênior';
  if (nivelAtual >= 7) return 'Dev Pleno';
  if (nivelAtual >= 4) return 'Dev Júnior';
  if (nivelAtual >= 2) return 'Estagiário';
  return 'Aprendiz';
}

export function maximoDeVidas(estado: Estado, catalogo: readonly Melhoria[]): number {
  return VIDAS_MAXIMAS + vantagens(estado, catalogo).vidasExtras;
}

/** Dia anterior a uma data AAAA-MM-DD. */
export function diaAnterior(dia: string): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - 1);
  return data.toISOString().slice(0, 10);
}

/** Na primeira abertura de cada dia, as vidas voltam cheias. */
export function abrirDia(estado: Estado, hoje: string, maximo: number): Estado {
  if (estado.diaDasVidas === hoje) return estado;
  return { ...estado, vidas: Math.max(estado.vidas, maximo), diaDasVidas: hoje };
}

/**
 * Conta o dia de prática: no mesmo dia nada muda, no dia seguinte a sequência
 * cresce, e depois de um dia parado ela recomeça em 1.
 */
export function registrarPratica(estado: Estado, hoje: string): Estado {
  if (estado.ultimoDia === hoje) return estado;
  const seguida = estado.ultimoDia !== null && estado.ultimoDia === diaAnterior(hoje);
  return { ...estado, sequencia: seguida ? estado.sequencia + 1 : 1, ultimoDia: hoje };
}

export type Recarga = { ok: true; estado: Estado } | { ok: false; motivo: 'cheias' | 'semDinheiro' };

/** Enche as vidas na hora, pagando com o dinheiro do jogo. */
export function recarregarVidas(estado: Estado, maximo: number): Recarga {
  if (estado.vidas >= maximo) return { ok: false, motivo: 'cheias' };
  if (estado.dinheiro < CUSTO_RECARGA) return { ok: false, motivo: 'semDinheiro' };
  return { ok: true, estado: { ...estado, vidas: maximo, dinheiro: estado.dinheiro - CUSTO_RECARGA } };
}

import { lerRankingOnline, type Colocado, type RankingOnline } from '../core/ranking';
import { ambienteAtual } from './armazenamento';

/**
 * Ranking online, guardado em um banco Supabase.
 *
 * É uma camada opcional, e desligada por padrão: o jogador precisa entrar nela
 * pela aba Ranking. Só então o jogo envia o apelido, o personagem, as estrelas
 * e o MVP. Não vai e-mail, nome nem conta, porque o jogo não tem nada disso.
 *
 * O endereço e a chave pública do banco entram na hora do build (variáveis
 * BYTE_SUPABASE_URL e BYTE_SUPABASE_CHAVE) e não ficam no repositório. Sem
 * elas, como no build.zip aberto offline, o jogo fica só com o ranking do aparelho.
 * A chave é a "publishable key" do Supabase, feita para ficar no navegador: ela
 * só alcança as três funções do banco, que validam o que recebem.
 */
const URL_DO_BANCO = __RANKING_URL__.replace(/\/+$/, '');
const CHAVE = __RANKING_CHAVE__;
const LIMITE_MS = 8000;

const chaveLocal = (nome: string): string => `byte-e-bolso:${nome}:v1:${ambienteAtual()}`;

function ler(nome: string): string | null {
  try {
    return localStorage.getItem(chaveLocal(nome));
  } catch {
    return null;
  }
}

function gravar(nome: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chaveLocal(nome));
    else localStorage.setItem(chaveLocal(nome), valor);
  } catch {
    /* sem armazenamento: o ranking online fica desligado nesta sessão */
  }
}

export function rankingOnlineDisponivel(): boolean {
  return URL_DO_BANCO !== '' && CHAVE !== '';
}

/** O jogador escolheu entrar no ranking online neste aparelho? */
export function participaOnline(): boolean {
  return rankingOnlineDisponivel() && ler('ranking-online') === 'sim';
}

/** Identificador aleatório (UUID v4), sem relação com a pessoa nem com o aparelho. */
function novoIdentificador(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Identificador da linha deste jogador no ranking online. É criado aqui, fica só
 * no navegador e é o que permite atualizar ou apagar a própria pontuação.
 */
function dispositivo(): string {
  const guardado = ler('dispositivo');
  if (guardado !== null && /^[0-9a-f-]{36}$/.test(guardado)) return guardado;
  const novo = novoIdentificador();
  gravar('dispositivo', novo);
  return novo;
}

/**
 * Quem começa do zero é outro jogador: ganha outra linha e decide de novo se
 * entra no ranking online. A linha do jogador anterior fica como estava.
 */
export function esquecerJogadorOnline(): void {
  gravar('dispositivo', null);
  gravar('ranking-online', null);
}

/** Chama uma função do banco. Devolve `undefined` quando a rede ou o banco falham. */
async function chamar(funcao: string, corpo: Record<string, unknown>): Promise<unknown> {
  if (!rankingOnlineDisponivel()) return undefined;
  try {
    const resposta = await fetch(`${URL_DO_BANCO}/rest/v1/rpc/${funcao}`, {
      method: 'POST',
      headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(LIMITE_MS),
    });
    if (!resposta.ok) return undefined;
    // As funções que só gravam respondem sem corpo (204).
    return resposta.status === 204 ? null : ((await resposta.json()) as unknown);
  } catch {
    return undefined;
  }
}

/** Os primeiros colocados, a posição deste jogador e o total. `null` sem conexão ou com resposta inválida. */
export async function buscarRankingOnline(): Promise<RankingOnline | null> {
  // Quem não entrou no ranking só consulta: o identificador não é enviado.
  const corpo = participaOnline() ? { p_dispositivo: dispositivo() } : {};
  return lerRankingOnline(await chamar('ranking_online', corpo));
}

/** Envia a pontuação do jogador. Só faz algo se ele entrou no ranking online. */
export async function enviarPontuacao(colocado: Colocado): Promise<boolean> {
  if (!participaOnline()) return false;
  const resposta = await chamar('registrar_pontuacao', {
    p_dispositivo: dispositivo(),
    p_apelido: colocado.apelido,
    p_avatar: colocado.avatar,
    p_estrelas: colocado.estrelas,
    p_mvp: colocado.mvp,
  });
  return resposta !== undefined;
}

/** Entra no ranking online: a partir daqui, a pontuação é enviada a cada fase concluída. */
export function entrarNoRankingOnline(): void {
  gravar('ranking-online', 'sim');
}

/** Apaga a linha deste jogador no banco e para de enviar. */
export async function sairDoRankingOnline(): Promise<boolean> {
  const resposta = await chamar('sair_do_ranking', { p_dispositivo: dispositivo() });
  if (resposta === undefined) return false;
  gravar('ranking-online', null);
  return true;
}

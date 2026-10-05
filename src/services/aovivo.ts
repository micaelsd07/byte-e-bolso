import { lerAcoes, lerCambio, lerNoticias, type Cotacao, type Noticia } from '../core/mercado';

/**
 * Dados ao vivo: câmbio, bolsa e notícias de tecnologia.
 *
 * É uma camada opcional. O jogo inteiro funciona sem internet; quando a busca
 * falha, a tela mostra o último valor guardado ou avisa que está offline.
 * As três fontes são públicas e não pedem chave: nenhuma credencial entra no
 * repositório. A requisição não leva nenhum dado do jogador.
 */
export const FONTES = {
  cambio: {
    nome: 'AwesomeAPI',
    url: 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,BTC-BRL',
    validade: 30_000,
  },
  acoes: { nome: 'brapi', url: 'https://brapi.dev/api/quote/PETR4,VALE3,ITUB4,MGLU3', validade: 60_000 },
  noticias: {
    nome: 'TabNews',
    url: 'https://www.tabnews.com.br/api/v1/contents?strategy=relevant&per_page=12',
    validade: 300_000,
  },
} as const;

export interface AoVivo<T> {
  dados: T;
  /** Milissegundos desde 1970 em que os dados foram buscados. */
  quando: number;
  /** false quando a rede falhou e isto veio do que estava guardado. */
  atual: boolean;
}

const chave = (nome: string): string => `byte-e-bolso:aovivo:${nome}`;

function guardado<T>(nome: string): { dados: T; quando: number } | null {
  try {
    const bruto: unknown = JSON.parse(localStorage.getItem(chave(nome)) ?? 'null');
    if (typeof bruto !== 'object' || bruto === null) return null;
    const { dados, quando } = bruto as { dados?: unknown; quando?: unknown };
    return Array.isArray(dados) && typeof quando === 'number' ? { dados: dados as T, quando } : null;
  } catch {
    return null;
  }
}

async function buscar<T extends unknown[]>(
  nome: keyof typeof FONTES,
  ler: (bruto: unknown) => T,
): Promise<AoVivo<T> | null> {
  const fonte = FONTES[nome];
  const cache = guardado<T>(nome);
  if (cache !== null && Date.now() - cache.quando < fonte.validade) return { ...cache, atual: true };

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 7000);
  try {
    const resposta = await fetch(fonte.url, { signal: controle.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!resposta.ok) throw new Error(String(resposta.status));
    const dados = ler(await resposta.json());
    if (dados.length === 0) throw new Error('resposta vazia');
    const novo = { dados, quando: Date.now() };
    try {
      localStorage.setItem(chave(nome), JSON.stringify(novo));
    } catch {
      /* sem armazenamento: segue sem guardar */
    }
    return { ...novo, atual: true };
  } catch {
    return cache === null ? null : { ...cache, atual: false };
  } finally {
    clearTimeout(limite);
  }
}

export const buscarCambio = (): Promise<AoVivo<Cotacao[]> | null> => buscar('cambio', lerCambio);
export const buscarAcoes = (): Promise<AoVivo<Cotacao[]> | null> => buscar('acoes', lerAcoes);
export const buscarNoticias = (): Promise<AoVivo<Noticia[]> | null> => buscar('noticias', (b) => lerNoticias(b));

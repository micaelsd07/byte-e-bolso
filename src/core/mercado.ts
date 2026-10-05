/**
 * Leitura dos dados ao vivo (câmbio, bolsa e notícias). O que chega de uma API
 * externa é tratado como entrada não confiável: cada campo é conferido, texto é
 * cortado e link só passa se for https. Nada daqui entra em pontuação ou save.
 */

export interface Cotacao {
  codigo: string;
  nome: string;
  valor: number;
  /** Variação do dia, em porcentagem. */
  variacao: number;
}

export interface Noticia {
  titulo: string;
  url: string;
  autor: string;
  /** Data ISO de publicação. */
  data: string;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function numero(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export const MOEDAS: Record<string, string> = {
  USD: 'Dólar americano',
  EUR: 'Euro',
  GBP: 'Libra esterlina',
  ARS: 'Peso argentino',
  BTC: 'Bitcoin',
};

/** Resposta da AwesomeAPI: { USDBRL: { code, bid, pctChange, ... }, ... } */
export function lerCambio(bruto: unknown): Cotacao[] {
  if (!ehObjeto(bruto)) return [];
  const cotacoes: Cotacao[] = [];
  for (const item of Object.values(bruto)) {
    if (!ehObjeto(item) || typeof item.code !== 'string') continue;
    const nome = MOEDAS[item.code];
    const valor = numero(item.bid);
    const variacao = numero(item.pctChange);
    if (nome === undefined || valor === null || valor <= 0 || variacao === null) continue;
    cotacoes.push({ codigo: item.code, nome, valor, variacao });
  }
  return cotacoes;
}

/** Resposta da brapi: { results: [{ symbol, regularMarketPrice, regularMarketChangePercent }] } */
export function lerAcoes(bruto: unknown): Cotacao[] {
  if (!ehObjeto(bruto) || !Array.isArray(bruto.results)) return [];
  const cotacoes: Cotacao[] = [];
  for (const item of bruto.results) {
    if (!ehObjeto(item) || typeof item.symbol !== 'string' || !/^[A-Z]{4}\d{1,2}$/.test(item.symbol)) continue;
    const valor = numero(item.regularMarketPrice);
    const variacao = numero(item.regularMarketChangePercent);
    if (valor === null || valor <= 0 || variacao === null) continue;
    // Só o código de negociação: o jogo não exibe nome nem marca de empresa.
    cotacoes.push({ codigo: item.symbol, nome: 'Ação na B3', valor, variacao });
  }
  return cotacoes;
}

/** Resposta do TabNews: [{ title, slug, owner_username, published_at }] */
export function lerNoticias(bruto: unknown, limite = 12): Noticia[] {
  if (!Array.isArray(bruto)) return [];
  const noticias: Noticia[] = [];
  for (const item of bruto) {
    if (!ehObjeto(item)) continue;
    const { title, slug, owner_username: autor, published_at: data } = item;
    if (typeof title !== 'string' || typeof slug !== 'string' || typeof autor !== 'string') continue;
    // O endereço é montado aqui, com partes conferidas: nunca vem pronto da API.
    if (!/^[\w-]{1,200}$/.test(slug) || !/^[\w-]{1,60}$/.test(autor)) continue;
    const titulo = title.replace(/\s+/g, ' ').trim().slice(0, 140);
    if (titulo === '') continue;
    noticias.push({
      titulo,
      url: `https://www.tabnews.com.br/${autor}/${slug}`,
      autor,
      data: typeof data === 'string' && !Number.isNaN(Date.parse(data)) ? data : '',
    });
    if (noticias.length >= limite) break;
  }
  return noticias;
}

/** Quanto o caixa do jogo, em reais, compraria da moeda. */
export function converter(reais: number, cotacao: Cotacao): number {
  return reais / cotacao.valor;
}

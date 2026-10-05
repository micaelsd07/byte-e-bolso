/**
 * A cidade do jogo, desenhada por código em SVG isométrico. Não há imagem
 * externa: cada prédio é uma caixa com três faces e janelas, posicionada em uma
 * grade. A rua liga as fases, e quatro prédios são lugares que o jogador visita.
 */

const COLUNAS = 7;
const LINHAS = 10;
const MEIA_LARGURA = 40;
const MEIA_ALTURA = 26;
const ORIGEM_X = 410;
const ORIGEM_Y = 130;
export const LARGURA = 700;
export const ALTURA = 660;

type Celula = [coluna: number, linha: number];

/**
 * Rua que sobe a cidade em ziguezague, da frente (primeira fase) ao fundo
 * (chefe). Cada trecho tem 3 quadras, para as fases não ficarem coladas.
 */
const RUA: Celula[] = [
  [6, 9], [6, 8], [6, 7], [6, 6], [5, 6], [4, 6], [3, 6], [3, 5], [3, 4], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0],
];
/** Posições da rua em que ficam as fases, na ordem da trilha. */
const INDICES_DAS_PARADAS = [0, 3, 6, 9, 12, 15];

export type Lugar = 'empresa' | 'mercado' | 'cambio' | 'noticias';
const LUGARES_NA_GRADE: Record<Lugar, { celula: Celula; altura: number; cor: string }> = {
  empresa: { celula: [5, 9], altura: 44, cor: '#e0a821' },
  mercado: { celula: [6, 2], altura: 112, cor: '#3f7df0' },
  cambio: { celula: [2, 9], altura: 66, cor: '#22b77c' },
  noticias: { celula: [0, 7], altura: 58, cor: '#e25858' },
};

const PARQUES: Celula[] = [[4, 8], [1, 6], [5, 2], [2, 1], [4, 0]];
const PREDIOS = ['#3a4a7c', '#34416e', '#2e5a86', '#43518f', '#2d3b66', '#365f8c'];

/**
 * Altura máxima de um prédio para ele não esconder a rua que passa atrás dele.
 * Uma célula à frente de um trecho de rua (mesma coluna de tela, mais perto da
 * câmera) só pode subir até a altura em que ainda deixa o asfalto à vista.
 */
function alturaMaxima(celula: Celula): number {
  let limite = Infinity;
  for (const [rx, ry] of RUA) {
    const a = celula[0] - rx;
    const b = celula[1] - ry;
    if (a < 0 || b < 0 || a + b === 0 || Math.abs(a - b) > 1) continue;
    limite = Math.min(limite, (a + b) * MEIA_ALTURA - 34);
  }
  return limite;
}

const mesma = (a: Celula, b: Celula): boolean => a[0] === b[0] && a[1] === b[1];
const semente = (c: Celula): number => (Math.imul(c[0] + 11, 73856093) ^ Math.imul(c[1] + 7, 19349663)) >>> 0;

/** Canto de cima do losango do piso de uma célula. */
function topo([coluna, linha]: Celula): [number, number] {
  return [(coluna - linha) * MEIA_LARGURA + ORIGEM_X, (coluna + linha) * MEIA_ALTURA + ORIGEM_Y];
}

function tom(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (deslocamento: number): number => Math.min(255, Math.round(((n >> deslocamento) & 255) * fator));
  return `rgb(${canal(16)},${canal(8)},${canal(0)})`;
}

const pontos = (lista: number[][]): string => lista.map((p) => p.map((v) => Math.round(v * 10) / 10).join(',')).join(' ');

function piso(celula: Celula, cor: string, classe = ''): string {
  const [x, y] = topo(celula);
  const losango = pontos([[x, y], [x + MEIA_LARGURA, y + MEIA_ALTURA], [x, y + 2 * MEIA_ALTURA], [x - MEIA_LARGURA, y + MEIA_ALTURA]]);
  return `<polygon class="${classe}" points="${losango}" fill="${cor}"/>`;
}

function janelas(x: number, y: number, altura: number, lado: -1 | 1, s: number): string {
  let saida = '';
  // A base da face vai do canto da frente até o canto lateral do piso.
  const de = [x, y + 2 * MEIA_ALTURA];
  const ate = [x + lado * MEIA_LARGURA, y + MEIA_ALTURA];
  const em = (t: number): number[] => [de[0]! + (ate[0]! - de[0]!) * t, de[1]! + (ate[1]! - de[1]!) * t];
  let n = 0;
  for (let elevacao = 9; elevacao + 13 <= altura; elevacao += 19) {
    for (const t of [0.16, 0.58]) {
      const a = em(t);
      const b = em(t + 0.26);
      const acesa = ((s >> (n % 24)) & 3) !== 0;
      const pisca = acesa && (s + n) % 7 === 0;
      saida += `<polygon${pisca ? ' class="pisca"' : ''} points="${pontos([[a[0]!, a[1]! - elevacao], [b[0]!, b[1]! - elevacao], [b[0]!, b[1]! - elevacao - 9], [a[0]!, a[1]! - elevacao - 9]])}" fill="${acesa ? '#ffd76a' : '#1a2238'}"/>`;
      n++;
    }
  }
  return saida;
}

function predio(celula: Celula, altura: number, cor: string, classe = ''): string {
  const [x, y] = topo(celula);
  const L = MEIA_LARGURA;
  const A = MEIA_ALTURA;
  const s = semente(celula);
  const esquerda = pontos([[x - L, y + A - altura], [x, y + 2 * A - altura], [x, y + 2 * A], [x - L, y + A]]);
  const direita = pontos([[x, y + 2 * A - altura], [x + L, y + A - altura], [x + L, y + A], [x, y + 2 * A]]);
  const teto = pontos([[x, y - altura], [x + L, y + A - altura], [x, y + 2 * A - altura], [x - L, y + A - altura]]);
  return (
    `<g class="${classe}">` +
    `<polygon points="${esquerda}" fill="${tom(cor, 0.82)}"/>` +
    `<polygon points="${direita}" fill="${tom(cor, 0.58)}"/>` +
    `<polygon points="${teto}" fill="${tom(cor, 1.18)}"/>` +
    janelas(x, y, altura, -1, s) +
    janelas(x, y, altura, 1, s >>> 5) +
    '</g>'
  );
}

function arvores(celula: Celula): string {
  const [x, y] = topo(celula);
  return [[-10, 20], [9, 26], [0, 12]]
    .map(([dx, dy]) => `<ellipse cx="${x + dx!}" cy="${y + dy!}" rx="8" ry="10" fill="#2f8f6f"/><ellipse cx="${x + dx! - 2}" cy="${y + dy! - 3}" rx="4" ry="5" fill="#49b58e"/>`)
    .join('');
}

/** Marcação SVG da cidade. O conteúdo é fixo e gerado aqui: não leva dado do jogador. */
export function svgCidade(): string {
  let chao = '';
  let volumes = '';
  const lugares = Object.entries(LUGARES_NA_GRADE) as [Lugar, (typeof LUGARES_NA_GRADE)[Lugar]][];

  // De trás para a frente, para os prédios da frente cobrirem os de trás.
  for (let soma = 0; soma <= COLUNAS + LINHAS - 2; soma++) {
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
      const linha = soma - coluna;
      if (linha < 0 || linha >= LINHAS) continue;
      const celula: Celula = [coluna, linha];
      if (RUA.some((r) => mesma(r, celula))) {
        chao += piso(celula, '#161c2e', 'rua');
        continue;
      }
      chao += piso(celula, soma % 2 === 0 ? '#273150' : '#242d49');
      if (PARQUES.some((p) => mesma(p, celula))) {
        chao += piso(celula, '#1d4a44');
        volumes += arvores(celula);
        continue;
      }
      const lugar = lugares.find(([, l]) => mesma(l.celula, celula));
      if (lugar !== undefined) {
        volumes += predio(celula, lugar[1].altura, lugar[1].cor, `lugar lugar-${lugar[0]}`);
        continue;
      }
      const s = semente(celula);
      const altura = Math.min(26 + (s % 4) * 20, alturaMaxima(celula));
      // Sem altura livre, a quadra vira praça: a rua atrás dela continua à vista.
      if (altura < 16) chao += piso(celula, '#2c3860');
      else volumes += predio(celula, altura, PREDIOS[s % PREDIOS.length]!);
    }
  }

  const centros = RUA.map((c) => {
    const [x, y] = topo(c);
    return `${x},${y + MEIA_ALTURA}`;
  }).join(' ');

  return (
    `<svg viewBox="0 0 ${LARGURA} ${ALTURA}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
    chao +
    `<polyline class="faixa" points="${centros}" fill="none" stroke="#ffc93c" stroke-width="4" stroke-dasharray="10 12" stroke-linecap="round" stroke-linejoin="round"/>` +
    volumes +
    '</svg>'
  );
}

export interface Ponto {
  /** Posição em porcentagem da largura e da altura do desenho. */
  x: number;
  y: number;
}

function ponto(celula: Celula, elevacao = 0): Ponto {
  const [x, y] = topo(celula);
  return { x: (x / LARGURA) * 100, y: ((y + MEIA_ALTURA - elevacao) / ALTURA) * 100 };
}

/** Onde cada fase da trilha fica sobre a rua. */
export const PARADAS: readonly Ponto[] = INDICES_DAS_PARADAS.map((i) => ponto(RUA[i]!));

/** Onde fica a placa de cada lugar: acima do telhado do prédio. */
export const LUGARES: Record<Lugar, Ponto> = {
  // A placa da empresa fica abaixo do prédio: acima dela passa a rua com as fases.
  empresa: ponto(LUGARES_NA_GRADE.empresa.celula, -(MEIA_ALTURA + 12)),
  mercado: ponto(LUGARES_NA_GRADE.mercado.celula, LUGARES_NA_GRADE.mercado.altura + 14),
  cambio: ponto(LUGARES_NA_GRADE.cambio.celula, LUGARES_NA_GRADE.cambio.altura + 14),
  noticias: ponto(LUGARES_NA_GRADE.noticias.celula, LUGARES_NA_GRADE.noticias.altura + 14),
};

import { ATRIBUTOS, type Atributo, type Atributos, type Efeitos } from './tipos';

/** Dinheiro pode ficar negativo (é a dívida); o resto é uma escala de 0 a 100. */
export const LIMITES: Record<Atributo, { min: number; max: number }> = {
  dinheiro: { min: -1_000_000, max: 10_000_000 },
  energia: { min: 0, max: 100 },
  conhecimento: { min: 0, max: 100 },
  tecnica: { min: 0, max: 100 },
  reputacao: { min: 0, max: 100 },
  saudeFinanceira: { min: 0, max: 100 },
  seguranca: { min: 0, max: 100 },
  networking: { min: 0, max: 100 },
};

export function atributosIniciais(): Atributos {
  return {
    dinheiro: 2500,
    energia: 80,
    conhecimento: 5,
    tecnica: 0,
    reputacao: 10,
    saudeFinanceira: 50,
    seguranca: 20,
    networking: 0,
  };
}

export function limitar(atributo: Atributo, valor: number): number {
  const { min, max } = LIMITES[atributo];
  return Math.min(max, Math.max(min, Math.round(valor)));
}

export function aplicarEfeitos(atributos: Atributos, efeitos: Efeitos): Atributos {
  const novo = { ...atributos };
  for (const a of ATRIBUTOS) {
    const delta = efeitos[a];
    if (delta !== undefined) novo[a] = limitar(a, novo[a] + delta);
  }
  return novo;
}

/** O que mudou de verdade, já descontado o que bateu no teto ou no piso. */
export function efeitosReais(antes: Atributos, depois: Atributos): Efeitos {
  const reais: Efeitos = {};
  for (const a of ATRIBUTOS) {
    const delta = depois[a] - antes[a];
    if (delta !== 0) reais[a] = delta;
  }
  return reais;
}

export function somarEfeitos(...lista: Efeitos[]): Efeitos {
  const soma: Efeitos = {};
  for (const efeitos of lista) {
    for (const a of ATRIBUTOS) {
      const delta = efeitos[a];
      if (delta !== undefined) soma[a] = (soma[a] ?? 0) + delta;
    }
  }
  return soma;
}

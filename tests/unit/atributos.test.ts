import { describe, expect, it } from 'vitest';
import { aplicarEfeitos, atributosIniciais, efeitosReais, limitar, somarEfeitos } from '../../src/core/atributos';

describe('atributos', () => {
  it('aplica efeitos sem alterar o objeto original', () => {
    const antes = atributosIniciais();
    const depois = aplicarEfeitos(antes, { dinheiro: -1600, tecnica: 12 });
    expect(depois.dinheiro).toBe(900);
    expect(depois.tecnica).toBe(12);
    expect(antes.dinheiro).toBe(2500);
  });

  it('mantém as escalas entre 0 e 100', () => {
    const depois = aplicarEfeitos(atributosIniciais(), { energia: 500, reputacao: -500 });
    expect(depois.energia).toBe(100);
    expect(depois.reputacao).toBe(0);
  });

  it('deixa o dinheiro ficar negativo, porque dívida existe', () => {
    expect(aplicarEfeitos(atributosIniciais(), { dinheiro: -3000 }).dinheiro).toBe(-500);
  });

  it('arredonda valores quebrados', () => {
    expect(limitar('energia', 42.6)).toBe(43);
  });

  it('informa só o que mudou de verdade depois do teto', () => {
    const antes = { ...atributosIniciais(), energia: 90 };
    const depois = aplicarEfeitos(antes, { energia: 25, conhecimento: 0 });
    expect(efeitosReais(antes, depois)).toEqual({ energia: 10 });
  });

  it('soma listas de efeitos por atributo', () => {
    expect(somarEfeitos({ dinheiro: 100, energia: -5 }, { dinheiro: -30 }, {})).toEqual({ dinheiro: 70, energia: -5 });
  });
});

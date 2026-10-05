import { describe, expect, it } from 'vitest';
import { conquistasNovas } from '../../src/core/conquistas';
import { PESOS_MVP, mvpScore, parcelasMvp } from '../../src/core/mvp';
import { novoEstado } from '../../src/core/partida';
import type { Estado, Registro } from '../../src/core/tipos';
import { CONQUISTAS } from './apoio';

const reg = (nota: number, tipo: Registro['tipo'] = 'decisao', i = 0): Registro => ({
  faseId: 'f1',
  passoId: `p${i}`,
  tipo,
  categoria: 'tecnologia',
  nota,
});
const com = (historico: Registro[], extra: Partial<Estado> = {}): Estado => ({ ...novoEstado('Ana', 'f1'), historico, ...extra });

describe('MVP Score', () => {
  it('tem pesos que somam 100%', () => {
    const soma = Object.values(PESOS_MVP).reduce((s, p) => s + p, 0);
    expect(soma).toBeCloseTo(1, 10);
  });

  it('vale zero antes do primeiro passo', () => {
    expect(mvpScore(novoEstado('Ana', 'f1'), 4)).toBe(0);
  });

  it('chega a 1000 só com tudo no máximo', () => {
    const perfeito = com([reg(1, 'decisao', 0), reg(1, 'orcamento', 1), reg(1, 'decisao', 2)], {
      atributos: { ...novoEstado('Ana', 'f1').atributos, saudeFinanceira: 100, energia: 100 },
      conquistas: ['a', 'b', 'c', 'd'],
    });
    expect(mvpScore(perfeito, 4)).toBe(1000);
  });

  it('nunca sai do intervalo de 0 a 1000', () => {
    const exagerado = com([reg(1, 'decisao', 0), reg(1, 'orcamento', 1), reg(1, 'decisao', 2)], {
      conquistas: Array.from({ length: 50 }, (_, i) => `c${i}`),
    });
    expect(mvpScore(exagerado, 4)).toBeLessThanOrEqual(1000);
    expect(mvpScore(com([reg(0)]), 4)).toBeGreaterThanOrEqual(0);
  });

  it('não cresce por repetir muitos passos medianos', () => {
    const curto = com([0.5, 0.5, 0.5].map((n, i) => reg(n, 'decisao', i)));
    const longo = com(Array.from({ length: 60 }, (_, i) => reg(0.5, 'decisao', i)));
    expect(mvpScore(longo, 4)).toBe(mvpScore(curto, 4));
  });

  it('só conta consistência a partir de três passos e premia regularidade', () => {
    expect(parcelasMvp(com([reg(1), reg(1)]), 4).consistencia).toBe(0);
    const regular = parcelasMvp(com([0.8, 0.8, 0.8].map((n, i) => reg(n, 'decisao', i))), 4).consistencia;
    const instavel = parcelasMvp(com([1, 0.4, 1].map((n, i) => reg(n, 'decisao', i))), 4).consistencia;
    expect(regular).toBeCloseTo(0.8, 10);
    expect(instavel).toBeLessThan(regular);
  });

  it('separa desempenho (desafios) de estratégia (decisões)', () => {
    const p = parcelasMvp(com([reg(1, 'orcamento', 0), reg(0, 'decisao', 1)]), 4);
    expect(p.desempenho).toBe(1);
    expect(p.estrategia).toBe(0);
    expect(p.conhecimento).toBe(0.5);
  });
});

describe('conquistas', () => {
  it('não repete conquista que o jogador já tem', () => {
    const estado = com([], { fasesConcluidas: ['f1'], conquistas: ['fase'] });
    expect(conquistasNovas(estado, CONQUISTAS)).toEqual([]);
  });

  it('reconhece fase concluída, nota mínima e atributo mínimo', () => {
    const estado = com([reg(0.95, 'orcamento')], {
      fasesConcluidas: ['f1'],
      atributos: { ...novoEstado('Ana', 'f1').atributos, seguranca: 30 },
    });
    expect(conquistasNovas(estado, CONQUISTAS)).toEqual(['fase', 'azul', 'seguro']);
  });

  it('exige sequência perfeita sem falha no meio', () => {
    const quebrada = com([1, 1, 0.9, 1, 1].map((n, i) => reg(n, 'decisao', i)));
    const inteira = com([0.5, 1, 1, 1].map((n, i) => reg(n, 'decisao', i)));
    expect(conquistasNovas(quebrada, CONQUISTAS)).not.toContain('trinca');
    expect(conquistasNovas(inteira, CONQUISTAS)).toContain('trinca');
  });
});

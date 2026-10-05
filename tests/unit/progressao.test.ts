import { describe, expect, it } from 'vitest';
import { estrelasDaFase, nivelPorXp, progressoNivel, xpDoPasso, xpParaNivel } from '../../src/core/progressao';
import type { Registro } from '../../src/core/tipos';

const registro = (nota: number, faseId = 'f1'): Registro => ({
  faseId,
  passoId: `p${Math.random()}`,
  tipo: 'decisao',
  categoria: 'tecnologia',
  nota,
});

describe('progressão', () => {
  it('converte a nota do passo em XP com teto por tipo', () => {
    expect(xpDoPasso('decisao', 1)).toBe(30);
    expect(xpDoPasso('decisao', 2 / 3)).toBe(20);
    expect(xpDoPasso('orcamento', 0.5)).toBe(25);
    expect(xpDoPasso('orcamento', 7)).toBe(50);
    expect(xpDoPasso('decisao', -1)).toBe(0);
  });

  it('sobe de nível em 100, 300, 600 e 1000 de XP', () => {
    expect([1, 2, 3, 4, 5].map(xpParaNivel)).toEqual([0, 100, 300, 600, 1000]);
    expect(nivelPorXp(0)).toBe(1);
    expect(nivelPorXp(99)).toBe(1);
    expect(nivelPorXp(100)).toBe(2);
    expect(nivelPorXp(299)).toBe(2);
    expect(nivelPorXp(300)).toBe(3);
    expect(nivelPorXp(-50)).toBe(1);
  });

  it('informa quanto falta para o próximo nível', () => {
    expect(progressoNivel(150)).toEqual({ nivel: 2, atual: 50, necessario: 200 });
  });

  it('dá estrelas pela média das notas da fase', () => {
    expect(estrelasDaFase([registro(1), registro(0.8), registro(0.7)], 'f1')).toBe(3);
    expect(estrelasDaFase([registro(1), registro(0.3)], 'f1')).toBe(2);
    expect(estrelasDaFase([registro(0.3), registro(0)], 'f1')).toBe(1);
  });

  it('não dá estrela para fase sem passos resolvidos', () => {
    expect(estrelasDaFase([registro(1, 'outra')], 'f1')).toBe(0);
  });
});

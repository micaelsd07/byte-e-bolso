import { describe, expect, it } from 'vitest';
import { avaliarOrcamento, melhorPontuacao } from '../../src/core/orcamento';
import { ORCAMENTO, ORCAMENTO_IDEAL } from './apoio';

describe('orçamento', () => {
  it('dá 100 pontos para essenciais + futuro + lazer com a reserva batida', () => {
    const r = avaliarOrcamento(ORCAMENTO, ORCAMENTO_IDEAL);
    expect(r.pontos).toBe(100);
    expect(r.total).toBe(750);
    expect(r.sobra).toBe(250);
    expect(r.problemas).toEqual([]);
  });

  it('devolve a sobra como dinheiro e melhora a saúde financeira', () => {
    const { efeitos } = avaliarOrcamento(ORCAMENTO, ORCAMENTO_IDEAL);
    expect(efeitos).toEqual({ dinheiro: 250, saudeFinanceira: 10, energia: 6, conhecimento: 4 });
  });

  it('limita a 15 pontos quem gasta mais do que ganha e transforma o excesso em dívida', () => {
    const r = avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'curso', 'cinema', 'viagem']);
    expect(r.sobra).toBe(-350);
    expect(r.pontos).toBe(15);
    expect(r.efeitos.dinheiro).toBe(-350);
    expect(r.efeitos.saudeFinanceira).toBe(-7);
  });

  it('limita a 50 pontos quem deixa conta essencial de fora e cobra em reputação', () => {
    const r = avaliarOrcamento(ORCAMENTO, ['aluguel', 'curso', 'cinema']);
    expect(r.pontos).toBe(50);
    expect(r.efeitos.reputacao).toBe(-5);
    expect(r.problemas[0]).toContain('Luz');
  });

  it('pontua a reserva na proporção da meta', () => {
    const passo = { ...ORCAMENTO, renda: 800 };
    // 800 - 750 = 50 de sobra: metade da meta de 100.
    expect(avaliarOrcamento(passo, ORCAMENTO_IDEAL).pontos).toBe(40 + 13 + 20 + 15);
  });

  it('tira pontos e energia de um orçamento sem nenhum lazer', () => {
    const r = avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'curso']);
    expect(r.pontos).toBe(85);
    expect(r.efeitos.energia).toBe(-8);
  });

  it('não pontua investimento quando nada vai para o futuro', () => {
    expect(avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'cinema']).pontos).toBe(80);
  });

  it('ignora ids que não existem no desafio', () => {
    expect(avaliarOrcamento(ORCAMENTO, [...ORCAMENTO_IDEAL, 'inexistente']).total).toBe(750);
  });

  it('encontra a melhor pontuação possível do desafio', () => {
    expect(melhorPontuacao(ORCAMENTO)).toBe(100);
    expect(melhorPontuacao({ ...ORCAMENTO, renda: 300 })).toBeLessThan(70);
  });
});

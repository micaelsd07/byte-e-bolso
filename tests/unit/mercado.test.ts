import { describe, expect, it } from 'vitest';
import { converter, lerAcoes, lerCambio, lerNoticias } from '../../src/core/mercado';
import { avaliarOrcamento, melhorPontuacao } from '../../src/core/orcamento';
import { ORCAMENTO, ORCAMENTO_IDEAL } from './apoio';

describe('leitura do câmbio', () => {
  const resposta = {
    USDBRL: { code: 'USD', bid: '4.9912', pctChange: '-0.42' },
    EURBRL: { code: 'EUR', bid: '5.59', pctChange: '0.1' },
    XYZBRL: { code: 'XYZ', bid: '1', pctChange: '0' },
  };

  it('converte os campos de texto em número e ignora moeda desconhecida', () => {
    expect(lerCambio(resposta)).toEqual([
      { codigo: 'USD', nome: 'Dólar americano', valor: 4.9912, variacao: -0.42 },
      { codigo: 'EUR', nome: 'Euro', valor: 5.59, variacao: 0.1 },
    ]);
  });

  it('descarta item com valor inválido, zero ou ausente', () => {
    expect(lerCambio({ A: { code: 'USD', bid: 'abc', pctChange: '1' } })).toEqual([]);
    expect(lerCambio({ A: { code: 'USD', bid: '0', pctChange: '1' } })).toEqual([]);
    expect(lerCambio({ A: { code: 'USD', pctChange: '1' } })).toEqual([]);
    expect(lerCambio({ A: 'texto', B: null })).toEqual([]);
  });

  it('devolve lista vazia para qualquer coisa que não seja o formato esperado', () => {
    expect(lerCambio(null)).toEqual([]);
    expect(lerCambio('erro')).toEqual([]);
    expect(lerCambio([1, 2])).toEqual([]);
  });

  it('calcula quanto o caixa compraria da moeda', () => {
    expect(converter(2500, { codigo: 'USD', nome: 'Dólar americano', valor: 5, variacao: 0 })).toBe(500);
  });
});

describe('leitura da bolsa', () => {
  it('fica só com o código de negociação, o preço e a variação', () => {
    const resposta = { results: [{ symbol: 'PETR4', longName: 'Nome da empresa', regularMarketPrice: 55.83, regularMarketChangePercent: 9.11 }] };
    expect(lerAcoes(resposta)).toEqual([{ codigo: 'PETR4', nome: 'Ação na B3', valor: 55.83, variacao: 9.11 }]);
  });

  it('descarta código fora do padrão e preço inválido', () => {
    expect(lerAcoes({ results: [{ symbol: '<img onerror=x>', regularMarketPrice: 1, regularMarketChangePercent: 0 }] })).toEqual([]);
    expect(lerAcoes({ results: [{ symbol: 'VALE3', regularMarketPrice: null, regularMarketChangePercent: 0 }] })).toEqual([]);
    expect(lerAcoes({ results: 'x' })).toEqual([]);
    expect(lerAcoes({ error: true })).toEqual([]);
  });
});

describe('leitura das notícias', () => {
  const item = { title: '  Como funciona\n um laço  ', slug: 'como-funciona-um-laco', owner_username: 'ana_dev', published_at: '2026-10-05T12:00:00.000Z' };

  it('monta o endereço a partir de partes conferidas e limpa o título', () => {
    expect(lerNoticias([item])).toEqual([
      { titulo: 'Como funciona um laço', url: 'https://www.tabnews.com.br/ana_dev/como-funciona-um-laco', autor: 'ana_dev', data: '2026-10-05T12:00:00.000Z' },
    ]);
  });

  it('descarta item com slug ou autor que tentam mudar o endereço', () => {
    expect(lerNoticias([{ ...item, slug: '../../evil.example/x' }])).toEqual([]);
    expect(lerNoticias([{ ...item, owner_username: 'javascript:alert(1)' }])).toEqual([]);
    expect(lerNoticias([{ ...item, slug: 'a?b=c' }])).toEqual([]);
  });

  it('descarta item sem título e data inválida vira vazio', () => {
    expect(lerNoticias([{ ...item, title: '   ' }])).toEqual([]);
    expect(lerNoticias([{ ...item, title: 7 }])).toEqual([]);
    expect(lerNoticias([{ ...item, published_at: 'ontem' }])[0]?.data).toBe('');
  });

  it('corta títulos longos e respeita o limite de itens', () => {
    expect(lerNoticias([{ ...item, title: 'x'.repeat(500) }])[0]?.titulo).toHaveLength(140);
    expect(lerNoticias(Array.from({ length: 30 }, () => item), 5)).toHaveLength(5);
    expect(lerNoticias({ erro: true })).toEqual([]);
  });
});

describe('orçamento', () => {
  it('dá 100 pontos para essenciais + futuro + lazer com a reserva batida', () => {
    expect(avaliarOrcamento(ORCAMENTO, ORCAMENTO_IDEAL)).toMatchObject({ pontos: 100, total: 750, sobra: 250, problemas: [] });
  });

  it('limita a 15 pontos quem gasta mais do que ganha', () => {
    const r = avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'curso', 'cinema', 'viagem']);
    expect(r).toMatchObject({ sobra: -350, pontos: 15 });
    expect(avaliarOrcamento(ORCAMENTO, ['luz', 'viagem', 'curso', 'cinema', 'aluguel', 'x']).pontos).toBe(15);
    expect(avaliarOrcamento(ORCAMENTO, ['viagem', 'aluguel']).pontos).toBe(5);
  });

  it('limita a 50 pontos quem deixa conta essencial de fora', () => {
    const r = avaliarOrcamento(ORCAMENTO, ['aluguel', 'curso', 'cinema']);
    expect(r.pontos).toBe(50);
    expect(r.problemas[0]).toContain('Luz');
  });

  it('pontua a reserva na proporção da meta', () => {
    expect(avaliarOrcamento({ ...ORCAMENTO, renda: 800 }, ORCAMENTO_IDEAL).pontos).toBe(40 + 13 + 20 + 15);
    expect(avaliarOrcamento({ ...ORCAMENTO, metaReserva: 0 }, ORCAMENTO_IDEAL).pontos).toBe(100);
  });

  it('tira pontos de orçamento sem lazer e sem investimento', () => {
    expect(avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'curso']).pontos).toBe(85);
    expect(avaliarOrcamento(ORCAMENTO, ['aluguel', 'luz', 'cinema']).pontos).toBe(80);
  });

  it('encontra a melhor pontuação possível do desafio', () => {
    expect(melhorPontuacao(ORCAMENTO)).toBe(100);
    expect(melhorPontuacao({ ...ORCAMENTO, renda: 300 })).toBeLessThan(70);
  });
});

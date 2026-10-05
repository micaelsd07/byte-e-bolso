import { describe, expect, it } from 'vitest';
import { novoEstado } from '../../src/core/jogo';
import { desserializar, serializar } from '../../src/core/save';
import type { Estado } from '../../src/core/tipos';
import { CATALOGO } from './apoio';

const BASE: Estado = { ...novoEstado('Ana'), dinheiro: 3100, nos: { triagem: 250, orcamento: 80 }, melhorias: ['vida', 'tempo'], rodadas: 4 };

/** Serializa o estado com uma adulteração, como alguém faria editando o localStorage. */
const adulterar = (mudanca: (bruto: Record<string, any>) => void): string => {
  const bruto = JSON.parse(serializar(BASE));
  mudanca(bruto);
  return JSON.stringify(bruto);
};
const lido = (mudanca: (bruto: Record<string, any>) => void) => desserializar(adulterar(mudanca), CATALOGO);

describe('save', () => {
  it('lê de volta exatamente o que salvou', () => {
    expect(desserializar(serializar(BASE), CATALOGO)).toEqual(BASE);
    expect(desserializar(serializar(novoEstado('Ana')), CATALOGO)).toEqual(novoEstado('Ana'));
  });

  it('rejeita texto que não é JSON, JSON de outro formato e versão antiga', () => {
    expect(desserializar('{quebrado', CATALOGO)).toBeNull();
    expect(desserializar('[]', CATALOGO)).toBeNull();
    expect(desserializar('null', CATALOGO)).toBeNull();
    expect(lido((b) => (b.versao = 1))).toBeNull();
  });

  it('rejeita pontuação acima do teto da fase, negativa ou quebrada', () => {
    expect(lido((b) => (b.nos.triagem = 6000))).not.toBeNull();
    expect(lido((b) => (b.nos.triagem = 6001))).toBeNull();
    expect(lido((b) => (b.nos.orcamento = 101))).toBeNull();
    expect(lido((b) => (b.nos.triagem = -1))).toBeNull();
    expect(lido((b) => (b.nos.triagem = 250.5))).toBeNull();
    expect(lido((b) => (b.nos.triagem = '250'))).toBeNull();
  });

  it('rejeita fase que não existe no conteúdo', () => {
    expect(lido((b) => (b.nos['fase-secreta'] = 10))).toBeNull();
  });

  it('rejeita fase pontuada sem estrela na anterior: não se pula fase', () => {
    expect(lido((b) => (b.nos = { negociacao: 90 }))).toBeNull();
    expect(lido((b) => (b.nos = { triagem: 99, orcamento: 80 }))).toBeNull();
    expect(lido((b) => (b.nos = { triagem: 100, orcamento: 10 }))).not.toBeNull();
  });

  it('rejeita saldo fora dos limites ou que não é número inteiro', () => {
    expect(lido((b) => (b.dinheiro = 10_000_001))).toBeNull();
    expect(lido((b) => (b.dinheiro = '999999'))).toBeNull();
    expect(lido((b) => (b.dinheiro = 0.5))).toBeNull();
    expect(lido((b) => (b.dinheiro = -500))).not.toBeNull();
  });

  it('rejeita menos rodadas do que fases pontuadas', () => {
    expect(lido((b) => (b.rodadas = 1))).toBeNull();
    expect(lido((b) => (b.rodadas = 2))).not.toBeNull();
  });

  it('rejeita melhoria inexistente ou repetida', () => {
    expect(lido((b) => (b.melhorias = ['vitoria-garantida']))).toBeNull();
    expect(lido((b) => (b.melhorias = ['vida', 'vida']))).toBeNull();
    expect(lido((b) => (b.melhorias = 'vida'))).toBeNull();
  });

  it('aceita só trilha que existe no conteúdo', () => {
    expect(lido((b) => (b.trilha = 'teste'))?.trilha).toBe('teste');
    expect(lido((b) => (b.trilha = 'cobol'))).toBeNull();
    expect(lido((b) => (b.trilha = 7))).toBeNull();
    expect(lido((b) => delete b.trilha)).toBeNull();
  });

  it('confere a ordem dentro de cada trilha, sem misturar uma com a outra', () => {
    // A lição é a primeira fase da outra trilha: pode ter pontos sem depender da primeira.
    expect(lido((b) => (b.nos = { licao: 100 }))).not.toBeNull();
  });

  it('rejeita personagem inexistente e vidas fora do limite', () => {
    expect(lido((b) => (b.avatar = 'dragao'))).toBeNull();
    expect(lido((b) => (b.vidas = 99))).toBeNull();
    expect(lido((b) => (b.vidas = -1))).toBeNull();
    expect(lido((b) => (b.vidas = 0))).not.toBeNull();
  });

  it('rejeita sequência incoerente com o dia de prática e data mal formada', () => {
    expect(lido((b) => (b.sequencia = 9))).toBeNull();
    expect(lido((b) => (b.ultimoDia = '2026-10-05'))).toBeNull();
    expect(lido((b) => Object.assign(b, { sequencia: 9, ultimoDia: '2026-10-05' }))).not.toBeNull();
    expect(lido((b) => Object.assign(b, { sequencia: 9, ultimoDia: 'ontem' }))).toBeNull();
    expect(lido((b) => (b.diaDasVidas = '05/10/2026'))).toBeNull();
  });

  it('rejeita apelido com caracteres proibidos', () => {
    expect(lido((b) => (b.apelido = '<script>'))).toBeNull();
    expect(lido((b) => (b.apelido = 42))).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  argumentar,
  efeitoDo,
  fechar,
  iniciarDuelo,
  melhorPreco,
  pontosDoDuelo,
  precoFechado,
  precoJusto,
  type Duelo,
} from '../../src/core/negociacao';
import { NEGOCIACAO } from './apoio';

const usar = (duelo: Duelo, id: string, precisao = 1): Duelo => argumentar(duelo, NEGOCIACAO, id, precisao)!.duelo;

describe('negociação', () => {
  it('calcula o preço justo pelas horas de trabalho', () => {
    expect(precoJusto(NEGOCIACAO)).toBe(600);
  });

  it('classifica o argumento conforme o perfil do cliente', () => {
    const [valor, , prazo, , fraco] = NEGOCIACAO.argumentos;
    expect(efeitoDo(valor!, 'economico')).toBe('forte');
    expect(efeitoDo(prazo!, 'economico')).toBe('medio');
    expect(efeitoDo(prazo!, 'apressado')).toBe('forte');
    expect(efeitoDo(fraco!, 'exigente')).toBe('ruim');
  });

  it('sobe a oferta com argumento forte e gasta uma paciência', () => {
    const jogada = argumentar(iniciarDuelo(NEGOCIACAO), NEGOCIACAO, 'valor-1', 1)!;
    expect(jogada).toMatchObject({ efeito: 'forte', variacao: 200 });
    expect(jogada.duelo).toMatchObject({ oferta: 500, paciencia: 4, fim: null });
  });

  it('rende menos quando o argumento é dito fora de hora', () => {
    const naHora = usar(iniciarDuelo(NEGOCIACAO), 'valor-1', 1).oferta;
    const foraDeHora = usar(iniciarDuelo(NEGOCIACAO), 'valor-1', 0).oferta;
    expect(foraDeHora).toBe(380);
    expect(foraDeHora).toBeLessThan(naHora);
  });

  it('derruba a oferta e gasta o dobro de paciência com argumento ruim', () => {
    const jogada = argumentar(iniciarDuelo(NEGOCIACAO), NEGOCIACAO, 'fraco-1', 1)!;
    expect(jogada.variacao).toBe(-100);
    expect(jogada.duelo).toMatchObject({ oferta: 200, paciencia: 3 });
  });

  it('nunca passa do máximo do cliente nem cai abaixo da metade da oferta inicial', () => {
    let alto = iniciarDuelo({ ...NEGOCIACAO, paciencia: 8 });
    for (const id of ['valor-1', 'valor-2', 'prazo', 'qualidade']) alto = argumentar(alto, { ...NEGOCIACAO, paciencia: 8 }, id, 1)!.duelo;
    expect(alto.oferta).toBeLessThanOrEqual(900);

    let baixo = iniciarDuelo({ ...NEGOCIACAO, paciencia: 8 });
    for (const id of ['fraco-1', 'fraco-2']) baixo = argumentar(baixo, { ...NEGOCIACAO, paciencia: 8 }, id, 1)!.duelo;
    expect(baixo.oferta).toBe(150);
  });

  it('não deixa repetir argumento nem usar um que não existe', () => {
    const duelo = usar(iniciarDuelo(NEGOCIACAO), 'valor-1');
    expect(argumentar(duelo, NEGOCIACAO, 'valor-1', 1)).toBeNull();
    expect(argumentar(duelo, NEGOCIACAO, 'inventado', 1)).toBeNull();
  });

  it('faz o cliente ir embora quando a paciência chega a zero: quem força demais fica sem nada', () => {
    let duelo = iniciarDuelo(NEGOCIACAO);
    for (const id of ['valor-1', 'valor-2', 'prazo', 'qualidade']) duelo = usar(duelo, id);
    expect(duelo).toMatchObject({ paciencia: 1, fim: null });
    duelo = usar(duelo, 'fraco-1');
    expect(duelo.fim).toBe('desistiu');
    expect(precoFechado(duelo)).toBe(0);
    expect(pontosDoDuelo(duelo, NEGOCIACAO)).toBe(0);
    expect(argumentar(duelo, NEGOCIACAO, 'fraco-2', 1)).toBeNull();
  });

  it('fecha pelo valor que está na mesa e pontua pela fração do máximo', () => {
    const duelo = fechar(usar(usar(iniciarDuelo(NEGOCIACAO), 'valor-1'), 'valor-2'));
    expect(duelo.fim).toBe('fechado');
    expect(precoFechado(duelo)).toBe(700);
    expect(pontosDoDuelo(duelo, NEGOCIACAO)).toBe(78);
    expect(fechar(duelo)).toBe(duelo);
  });

  it('aceitar a primeira oferta fecha abaixo do preço justo', () => {
    const duelo = fechar(iniciarDuelo(NEGOCIACAO));
    expect(precoFechado(duelo)).toBeLessThan(precoJusto(NEGOCIACAO));
    expect(pontosDoDuelo(duelo, NEGOCIACAO)).toBe(33);
  });

  it('calcula o melhor preço possível parando antes da última paciência', () => {
    expect(melhorPreco(NEGOCIACAO)).toBe(880);
  });
});

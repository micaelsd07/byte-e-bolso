import { describe, expect, it } from 'vitest';
import {
  conferir,
  exercicioAtual,
  gabarito,
  iniciarSessao,
  normalizar,
  pecasEmbaralhadas,
  pontosDaSessao,
  progresso,
  responderExercicio,
  type Resposta,
  type Sessao,
} from '../../src/core/licao';
import { LICAO } from './apoio';

const [escolha, montar, completar] = LICAO.exercicios as [(typeof LICAO.exercicios)[0], (typeof LICAO.exercicios)[1], (typeof LICAO.exercicios)[2]];
const CERTAS: Record<string, Resposta> = { e1: 1, e2: ['print', '(', '"Oi"', ')'], e3: 'print' };
const ERRADAS: Record<string, Resposta> = { e1: 0, e2: ['echo', '(', '"Oi"', ')'], e3: 'echo' };

const responder = (sessao: Sessao, certo: boolean): Sessao => {
  const id = exercicioAtual(sessao, LICAO)!.id;
  return responderExercicio(sessao, LICAO, (certo ? CERTAS : ERRADAS)[id]!)!.sessao;
};

describe('comparação de código digitado', () => {
  it('ignora espaços que não mudam o sentido', () => {
    expect(normalizar('  print ( 7 )  ')).toBe(normalizar('print(7)'));
    expect(normalizar('x   =   5')).toBe('x=5');
    expect(normalizar('for (let i = 0; i < 5; i++)')).toBe(normalizar('for(let i=0;i<5;i++)'));
  });

  it('trata aspas simples, duplas e curvas do teclado do celular como iguais', () => {
    expect(normalizar("'Ana'")).toBe(normalizar('"Ana"'));
    expect(normalizar('“Ana”')).toBe(normalizar('"Ana"'));
  });

  it('desconsidera o ponto e vírgula final, mas não o do meio', () => {
    expect(normalizar('x = 1;')).toBe(normalizar('x = 1'));
    expect(normalizar('a; b')).not.toBe(normalizar('a b'));
  });

  it('não confunde nomes diferentes nem maiúsculas com minúsculas', () => {
    expect(normalizar('Print')).not.toBe(normalizar('print'));
    expect(normalizar('printf')).not.toBe(normalizar('print'));
    expect(normalizar('meu nome')).not.toBe(normalizar('meunome'));
  });
});

describe('conferência dos exercícios', () => {
  it('escolha: só o índice da opção certa', () => {
    expect(conferir(escolha, 1)).toBe(true);
    expect(conferir(escolha, 0)).toBe(false);
    expect(conferir(escolha, '1')).toBe(false);
  });

  it('montar: as peças certas, todas, na ordem certa', () => {
    expect(conferir(montar, ['print', '(', '"Oi"', ')'])).toBe(true);
    expect(conferir(montar, ['(', 'print', '"Oi"', ')'])).toBe(false);
    expect(conferir(montar, ['print', '(', '"Oi"'])).toBe(false);
    expect(conferir(montar, ['print', '(', '"Oi"', ')', 'echo'])).toBe(false);
    expect(conferir(montar, 'print("Oi")')).toBe(false);
  });

  it('completar: qualquer resposta aceita, com a comparação tolerante', () => {
    expect(conferir(completar, 'print')).toBe(true);
    expect(conferir(completar, '  print ')).toBe(true);
    expect(conferir(completar, 'console.log')).toBe(true);
    expect(conferir(completar, 'echo')).toBe(false);
    expect(conferir(completar, '')).toBe(false);
    expect(conferir(completar, '   ')).toBe(false);
  });

  it('mostra o gabarito de cada tipo', () => {
    expect(gabarito(escolha)).toBe('B');
    expect(gabarito(montar)).toBe('print ( "Oi" )');
    expect(gabarito(completar)).toBe('print(7)');
  });
});

describe('sessão da lição', () => {
  it('começa com 3 vidas, todos os exercícios na fila e progresso zero', () => {
    const sessao = iniciarSessao(LICAO);
    expect(sessao).toMatchObject({ fila: ['e1', 'e2', 'e3'], vidas: 3, erros: 0, fim: null });
    expect(progresso(sessao)).toBe(0);
    // No jogo, a lição começa com as vidas do perfil.
    expect(iniciarSessao(LICAO, 5).vidas).toBe(5);
    expect(iniciarSessao(LICAO, 1).vidas).toBe(1);
  });

  it('conclui com 100 pontos quando tudo é acertado de primeira', () => {
    let sessao = iniciarSessao(LICAO);
    for (let i = 0; i < 3; i++) sessao = responder(sessao, true);
    expect(sessao).toMatchObject({ fila: [], fim: 'concluida', erros: 0 });
    expect(progresso(sessao)).toBe(1);
    expect(pontosDaSessao(sessao)).toBe(100);
    expect(exercicioAtual(sessao, LICAO)).toBeNull();
    expect(responderExercicio(sessao, LICAO, 1)).toBeNull();
  });

  it('manda o exercício errado para o fim da fila e tira uma vida', () => {
    const sessao = responder(iniciarSessao(LICAO), false);
    expect(sessao).toMatchObject({ fila: ['e2', 'e3', 'e1'], vidas: 2, erros: 1, errados: ['e1'], fim: null });
    expect(progresso(sessao)).toBe(0);
  });

  it('só termina depois que o exercício errado é acertado, e desconta 15 pontos por erro', () => {
    let sessao = responder(iniciarSessao(LICAO), false);
    sessao = responder(responder(sessao, true), true);
    expect(sessao.fim).toBeNull();
    expect(exercicioAtual(sessao, LICAO)?.id).toBe('e1');
    sessao = responder(sessao, true);
    expect(sessao.fim).toBe('concluida');
    expect(pontosDaSessao(sessao)).toBe(85);
  });

  it('termina sem pontos quando as vidas acabam', () => {
    let sessao = iniciarSessao(LICAO);
    for (let i = 0; i < 3; i++) sessao = responder(sessao, false);
    expect(sessao).toMatchObject({ vidas: 0, fim: 'vidas' });
    expect(pontosDaSessao(sessao)).toBe(0);
  });

  it('não repete o mesmo exercício na lista de revisão', () => {
    let sessao = iniciarSessao(LICAO, 5);
    sessao = responder(sessao, false);
    sessao = responder(responder(sessao, true), true);
    sessao = responder(sessao, false);
    expect(sessao.errados).toEqual(['e1']);
    expect(sessao.erros).toBe(2);
  });

  it('conta os acertos seguidos e zera a sequência no erro', () => {
    let sessao = iniciarSessao(LICAO, 5);
    sessao = responder(responder(sessao, true), true);
    expect(sessao).toMatchObject({ seguidas: 2, melhorSequencia: 2 });
    sessao = responder(sessao, false);
    expect(sessao).toMatchObject({ seguidas: 0, melhorSequencia: 2 });
    sessao = responder(sessao, true);
    expect(sessao).toMatchObject({ seguidas: 1, melhorSequencia: 2, fim: 'concluida' });
  });

  it('trata o relógio zerado como erro: tira vida e devolve o exercício à fila', () => {
    const resultado = responderExercicio(iniciarSessao(LICAO), LICAO, null)!;
    expect(resultado.acertou).toBe(false);
    expect(resultado.sessao).toMatchObject({ fila: ['e2', 'e3', 'e1'], vidas: 2, erros: 1, errados: ['e1'], seguidas: 0 });
  });

  it('nunca dá menos de 10 pontos a quem concluiu', () => {
    const sessao: Sessao = { fila: [], total: 3, vidas: 1, erros: 9, errados: ['e1'], seguidas: 0, melhorSequencia: 2, fim: 'concluida' };
    expect(pontosDaSessao(sessao)).toBe(10);
  });

  it('embaralha as peças de forma repetível e sem perder nenhuma', () => {
    const a = pecasEmbaralhadas(['print', '(', ')'], ['echo'], 5);
    expect(a).toEqual(pecasEmbaralhadas(['print', '(', ')'], ['echo'], 5));
    expect([...a].sort()).toEqual(['(', ')', 'echo', 'print']);
  });
});

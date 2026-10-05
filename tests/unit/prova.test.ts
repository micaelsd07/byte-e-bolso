import { describe, expect, it } from 'vitest';
import { conferir, iniciarSessao, pontosDaSessao, responderExercicio, type Resposta } from '../../src/core/licao';
import { EXERCICIOS_DA_PROVA, SEGUNDOS_POR_PECA, TEMPO_DA_PROVA, provaDaUnidade, segundosDoExercicio } from '../../src/core/prova';
import type { Capitulo, Exercicio, NoLicao } from '../../src/core/tipos';
import { LICAO, TRIAGEM } from './apoio';

const licao = (id: string, exercicios: Exercicio[] = LICAO.exercicios): NoLicao => ({ ...LICAO, id, exercicios });
const unidade = (nos: Capitulo['nos'], dificuldade: Capitulo['dificuldade'] = 'facil'): Capitulo => ({
  id: 'u1',
  numero: 1,
  dificuldade,
  titulo: 'Unidade de teste',
  resumo: 'Resumo.',
  nos,
});
const certa = (e: Exercicio): Resposta => (e.tipo === 'escolha' ? e.correta : e.tipo === 'montar' ? e.pecas : e.respostas[0]!);

describe('prova da unidade', () => {
  it('não existe em unidade com menos de duas lições', () => {
    expect(provaDaUnidade(unidade([TRIAGEM, licao('a')]))).toBeNull();
    expect(provaDaUnidade(unidade([TRIAGEM]))).toBeNull();
  });

  it('pega exercícios de todas as lições, em rodízio, começando pelos de escrever', () => {
    const prova = provaDaUnidade(unidade([licao('a'), TRIAGEM, licao('b')]))!;
    expect(prova.id).toBe('prova-u1');
    // 1ª volta: o de completar de cada lição; depois os de montar; por fim os de escolher.
    expect(prova.exercicios.map((e) => e.id)).toEqual(['l1-e3', 'l2-e3', 'l1-e2', 'l2-e2', 'l1-e1', 'l2-e1']);
    expect(prova.exercicios.map((e) => e.tipo)).toEqual(['completar', 'completar', 'montar', 'montar', 'escolha', 'escolha']);
    expect(new Set(prova.exercicios.map((e) => e.id)).size).toBe(prova.exercicios.length);
  });

  it('para no limite de exercícios, sem deixar lição de fora', () => {
    const prova = provaDaUnidade(unidade([licao('a'), licao('b'), licao('c'), licao('d')]))!;
    expect(prova.exercicios).toHaveLength(EXERCICIOS_DA_PROVA);
    for (const n of [1, 2, 3, 4]) expect(prova.exercicios.some((e) => e.id.startsWith(`l${n}-`))).toBe(true);
    expect(prova.resumo).toContain(`${EXERCICIOS_DA_PROVA} exercícios`);
  });

  it('é uma lição jogável: aceita as respostas certas e fecha com 100 pontos', () => {
    const prova = provaDaUnidade(unidade([licao('a'), licao('b')]))!;
    let sessao = iniciarSessao(prova, 5);
    for (const e of prova.exercicios) {
      expect(conferir(e, certa(e))).toBe(true);
      sessao = responderExercicio(sessao, prova, certa(e))!.sessao;
    }
    expect(pontosDaSessao(sessao)).toBe(100);
    expect(prova.metas[0]).toBeLessThanOrEqual(prova.teto);
    expect(prova.explicacao).toHaveLength(1);
  });

  it('dá menos tempo quanto mais difícil a unidade', () => {
    const tempo = (d: Capitulo['dificuldade']): number => provaDaUnidade(unidade([licao('a'), licao('b')], d))!.tempo!;
    expect(tempo('facil')).toBe(TEMPO_DA_PROVA.facil);
    expect(tempo('facil')).toBeGreaterThan(tempo('medio'));
    expect(tempo('medio')).toBeGreaterThan(tempo('dificil'));
  });

  it('soma tempo por peça nos exercícios de montar e o tempo extra das melhorias', () => {
    const [escolha, montar] = LICAO.exercicios as [Exercicio, Extract<Exercicio, { tipo: 'montar' }>];
    expect(segundosDoExercicio(escolha, 30)).toBe(30);
    expect(segundosDoExercicio(montar, 30)).toBe(30 + SEGUNDOS_POR_PECA * montar.pecas.length);
    expect(segundosDoExercicio(escolha, 30, 5)).toBe(35);
  });
});

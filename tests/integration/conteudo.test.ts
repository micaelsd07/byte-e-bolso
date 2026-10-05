import { describe, expect, it } from 'vitest';
import { carregarConteudo, validarConteudo } from '../../scripts/lib/conteudo.mjs';
import { CATALOGO, MELHORIAS, TRILHAS, UNIDADES, fasesDa } from '../../src/content';
import { conferir, iniciarSessao, pontosDaSessao, responderExercicio, type Resposta } from '../../src/core/licao';
import type { Exercicio } from '../../src/core/tipos';
import { melhorPreco, precoJusto } from '../../src/core/negociacao';
import { melhorPontuacao } from '../../src/core/orcamento';

const TRILHA = UNIDADES.flatMap((u) => u.nos);
const certa = (e: Exercicio): Resposta => (e.tipo === 'escolha' ? e.correta : e.tipo === 'montar' ? e.pecas : e.respostas[0]!);

describe('conteúdo real do jogo', () => {
  const conteudo = carregarConteudo();

  it('passa no schema e nas checagens de referência', () => {
    expect(validarConteudo(conteudo)).toEqual([]);
  });

  it('entrega no jogo exatamente as trilhas que estão na pasta de conteúdo', () => {
    const naPasta = conteudo.trilhas.map((t) => (t.dados as { id: string }).id).sort();
    expect(TRILHAS.map((t) => t.id).sort()).toEqual(naPasta);
    expect(Object.keys(CATALOGO.trilhas).sort()).toEqual(naPasta);
  });

  it('tem as sete linguagens, cada uma com ao menos 4 lições', () => {
    for (const id of ['python', 'javascript', 'java', 'c', 'cpp', 'html', 'css']) {
      const trilha = TRILHAS.find((t) => t.id === id);
      expect(trilha, id).toBeDefined();
      expect(fasesDa(trilha!).filter((n) => n.tipo === 'licao').length, id).toBeGreaterThanOrEqual(4);
    }
  });

  it('aceita a resposta certa de cada exercício e recusa uma errada', () => {
    let conferidos = 0;
    for (const no of TRILHA) {
      if (no.tipo !== 'licao') continue;
      for (const e of no.exercicios) {
        const onde = `${no.id}/${e.id}`;
        expect(conferir(e, certa(e)), onde).toBe(true);
        if (e.tipo === 'escolha') expect(conferir(e, (e.correta + 1) % e.opcoes.length), onde).toBe(false);
        if (e.tipo === 'montar') expect(conferir(e, [e.extras[0]!, ...e.pecas.slice(1)]), onde).toBe(false);
        if (e.tipo === 'completar') expect(conferir(e, 'resposta errada'), onde).toBe(false);
        conferidos++;
      }
    }
    expect(conferidos).toBeGreaterThanOrEqual(140);
  });

  it('tem os três níveis de dificuldade nas trilhas de linguagem que foram ampliadas', () => {
    const niveis = new Set(UNIDADES.map((u) => u.dificuldade));
    expect([...niveis].sort()).toEqual(['dificil', 'facil', 'medio']);
    for (const trilha of TRILHAS) expect(trilha.unidades[0]!.dificuldade, trilha.id).toBe('facil');
    expect(TRILHA.filter((n) => n.tipo === 'licao').length).toBeGreaterThanOrEqual(70);
  });

  it('tem toda lição concluível com 100 pontos, e os três tipos de exercício em cada trilha de linguagem', () => {
    for (const no of TRILHA) {
      if (no.tipo !== 'licao') continue;
      let sessao = iniciarSessao(no);
      for (const e of no.exercicios) sessao = responderExercicio(sessao, no, certa(e))!.sessao;
      expect(pontosDaSessao(sessao), no.id).toBe(100);
    }
    for (const trilha of TRILHAS.filter((t) => t.id !== 'carreira')) {
      const tipos = new Set(fasesDa(trilha).flatMap((n) => (n.tipo === 'licao' ? n.exercicios.map((e) => e.tipo) : [])));
      expect(tipos.size, trilha.id).toBe(3);
    }
  });

  it('fecha cada unidade de linguagem com uma prova cronometrada, montada das lições dela', () => {
    for (const trilha of TRILHAS) {
      for (const unidade of trilha.unidades) {
        const provas = unidade.nos.filter((n) => n.tipo === 'licao' && n.tempo !== undefined);
        if (trilha.id === 'carreira') {
          expect(provas, unidade.id).toHaveLength(0);
          continue;
        }
        expect(provas, unidade.id).toHaveLength(1);
        const prova = unidade.nos.at(-1)!;
        expect(prova.id, unidade.id).toBe(`prova-${unidade.id}`);
        if (prova.tipo !== 'licao') continue;
        expect(prova.exercicios.length, unidade.id).toBeGreaterThanOrEqual(4);
        // Todo exercício da prova veio de uma lição da mesma unidade.
        const daUnidade = unidade.nos.flatMap((n) => (n.tipo === 'licao' && n.tempo === undefined ? n.exercicios.map((e) => e.pergunta) : []));
        for (const e of prova.exercicios) expect(daUnidade, `${unidade.id}/${e.id}`).toContain(e.pergunta);
      }
    }
  });

  it('tem toda fase vencível com 3 estrelas', () => {
    for (const no of TRILHA) {
      if (no.tipo === 'orcamento') expect(melhorPontuacao(no), no.id).toBeGreaterThanOrEqual(no.metas[2]);
      if (no.tipo === 'negociacao') {
        expect(Math.round((100 * melhorPreco(no)) / no.maximo), no.id).toBeGreaterThanOrEqual(no.metas[2]);
        expect(melhorPreco(no), no.id).toBeGreaterThan(precoJusto(no));
      }
      if (no.tipo === 'triagem') {
        // Com o combo no teto, as 3 estrelas pedem bem menos do que uma carta por segundo.
        const cartasNecessarias = 9 + Math.ceil((no.metas[2] - 180) / 40);
        expect(cartasNecessarias, no.id).toBeLessThanOrEqual(no.duracao * 0.75);
      }
    }
  });

  it('não deixa ganhar a fase relâmpago arrastando tudo para o mesmo lado', () => {
    for (const no of TRILHA) {
      if (no.tipo !== 'triagem') continue;
      const direita = no.cartas.filter((c) => c.lado === 'direita').length / no.cartas.length;
      expect(direita, no.id).toBeGreaterThan(0.35);
      expect(direita, no.id).toBeLessThan(0.65);
    }
  });

  it('tem ao menos uma melhoria gratuita e uma que é só enfeite', () => {
    expect(MELHORIAS.some((m) => m.custo === 0 && m.manutencao === 0)).toBe(true);
    expect(MELHORIAS.some((m) => m.efeito.tipo === 'enfeite')).toBe(true);
  });
});

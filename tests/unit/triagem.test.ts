import { describe, expect, it } from 'vitest';
import {
  PODERES,
  avancar,
  carga,
  cartaAtual,
  embaralhar,
  iniciarRodada,
  multiplicador,
  podeUsar,
  responder,
  usarPoder,
  type Rodada,
} from '../../src/core/triagem';
import type { Lado } from '../../src/core/tipos';
import { SEM_VANTAGENS, TRIAGEM } from './apoio';

const nova = (semente = 7): Rodada => iniciarRodada(TRIAGEM, SEM_VANTAGENS, semente);
const certo = (r: Rodada): Lado => cartaAtual(r, TRIAGEM)!.lado;
const errado = (r: Rodada): Lado => (certo(r) === 'direita' ? 'esquerda' : 'direita');
const acertar = (r: Rodada, vezes: number): Rodada => {
  for (let i = 0; i < vezes; i++) r = responder(r, TRIAGEM, certo(r))!.rodada;
  return r;
};

describe('fase relâmpago', () => {
  it('embaralha de forma repetível: a mesma semente dá a mesma ordem', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(embaralhar(ids, 42)).toEqual(embaralhar(ids, 42));
    expect(embaralhar(ids, 42)).not.toEqual(embaralhar(ids, 43));
    expect([...embaralhar(ids, 42)].sort()).toEqual(ids);
  });

  it('começa com 3 vidas, o tempo da fase e nenhum ponto', () => {
    const r = nova();
    expect(r).toMatchObject({ vidas: 3, tempo: 30_000, pontos: 0, fim: null });
    expect(cartaAtual(r, TRIAGEM)).not.toBeNull();
  });

  it('aplica as vantagens das melhorias: tempo, vida e teto do combo', () => {
    const r = iniciarRodada(TRIAGEM, { tempoExtra: 5, vidasExtras: 1, comboMaximo: 5, renda: 0 }, 1);
    expect(r).toMatchObject({ vidas: 4, tempo: 35_000, comboMaximo: 5 });
  });

  it('paga 10 pontos por acerto e sobe o multiplicador a cada 3 seguidos', () => {
    let r = nova();
    const ganhos: number[] = [];
    for (let i = 0; i < 7; i++) {
      const resposta = responder(r, TRIAGEM, certo(r))!;
      ganhos.push(resposta.ganho);
      r = resposta.rodada;
    }
    expect(ganhos).toEqual([10, 10, 10, 20, 20, 20, 30]);
    expect(r.pontos).toBe(120);
    expect(r.melhorSequencia).toBe(7);
  });

  it('limita o multiplicador ao teto do combo', () => {
    expect(multiplicador(acertar(nova(), 40))).toBe(4);
    const comCurso = iniciarRodada(TRIAGEM, { ...SEM_VANTAGENS, comboMaximo: 5 }, 7);
    expect(multiplicador(acertar(comCurso, 40))).toBe(5);
  });

  it('no erro: perde uma vida, zera o combo e guarda a carta para a revisão', () => {
    const r = acertar(nova(), 4);
    const carta = cartaAtual(r, TRIAGEM)!;
    const resposta = responder(r, TRIAGEM, errado(r))!;
    expect(resposta.acertou).toBe(false);
    expect(resposta.rodada).toMatchObject({ vidas: 2, sequencia: 0, pontos: r.pontos, erradas: [carta.id] });
    expect(multiplicador(resposta.rodada)).toBe(1);
  });

  it('termina quando as vidas acabam e não aceita mais respostas', () => {
    let r = nova();
    for (let i = 0; i < 3; i++) r = responder(r, TRIAGEM, errado(r))!.rodada;
    expect(r.fim).toBe('vidas');
    expect(cartaAtual(r, TRIAGEM)).toBeNull();
    expect(responder(r, TRIAGEM, 'direita')).toBeNull();
  });

  it('termina quando o tempo acaba', () => {
    const r = avancar(nova(), 30_000);
    expect(r).toMatchObject({ tempo: 0, fim: 'tempo' });
    expect(avancar(r, 1000)).toBe(r);
  });

  it('reembaralha quando o baralho acaba, sem repetir a mesma carta em seguida', () => {
    let r = nova();
    const vistas: string[] = [];
    for (let i = 0; i < 30; i++) {
      vistas.push(cartaAtual(r, TRIAGEM)!.id);
      r = responder(r, TRIAGEM, certo(r))!.rodada;
    }
    expect(r.fim).toBeNull();
    for (let i = 1; i < vistas.length; i++) expect(vistas[i], `posição ${i}`).not.toBe(vistas[i - 1]);
  });

  it('não repete a mesma carta na lista de revisão', () => {
    const r = iniciarRodada(TRIAGEM, { ...SEM_VANTAGENS, vidasExtras: 50 }, 3);
    let atual = r;
    for (let i = 0; i < 30; i++) atual = responder(atual, TRIAGEM, errado(atual))!.rodada;
    expect(new Set(atual.erradas).size).toBe(atual.erradas.length);
    expect(atual.erradas.length).toBeLessThanOrEqual(TRIAGEM.cartas.length);
  });
});

describe('poderes e recarga', () => {
  it('Foco total faz o relógio andar pela metade enquanto dura', () => {
    const r = avancar(usarPoder(nova(), 'foco'), 4000);
    expect(r.tempo).toBe(30_000 - 2000);
    // 5 s de foco (2,5 s de jogo) + 3 s normais.
    expect(avancar(usarPoder(nova(), 'foco'), 8000).tempo).toBe(30_000 - 2500 - 3000);
  });

  it('entra em recarga depois do uso e volta a ficar disponível com o tempo', () => {
    let r = usarPoder(nova(), 'dica');
    expect(podeUsar(r, 'dica')).toBe(false);
    expect(carga(r, 'dica')).toBe(0);
    r = responder(r, TRIAGEM, certo(r))!.rodada;
    r = avancar(r, PODERES.dica.recarga / 2);
    expect(carga(r, 'dica')).toBe(0.5);
    expect(podeUsar(avancar(r, PODERES.dica.recarga / 2), 'dica')).toBe(true);
  });

  it('Consulta vale só para a carta da vez', () => {
    const r = usarPoder(nova(), 'dica');
    expect(r.dica).toBe(true);
    expect(responder(r, TRIAGEM, certo(r))!.rodada.dica).toBe(false);
  });

  it('Blindagem absorve um erro: não perde vida nem combo, uma vez só', () => {
    const r = usarPoder(acertar(nova(), 4), 'escudo');
    const resposta = responder(r, TRIAGEM, errado(r))!;
    expect(resposta.protegido).toBe(true);
    expect(resposta.rodada).toMatchObject({ vidas: 3, sequencia: 4, escudo: false });
    expect(responder(resposta.rodada, TRIAGEM, errado(resposta.rodada))!.rodada.vidas).toBe(2);
  });

  it('não deixa usar poder em recarga, já ativo ou com a rodada encerrada', () => {
    const comEscudo = usarPoder(nova(), 'escudo');
    expect(usarPoder(comEscudo, 'escudo')).toBe(comEscudo);
    const encerrada = avancar(nova(), 60_000);
    expect(podeUsar(encerrada, 'foco')).toBe(false);
    expect(usarPoder(encerrada, 'foco')).toBe(encerrada);
  });
});

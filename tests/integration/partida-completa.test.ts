import { describe, expect, it } from 'vitest';
import { CATALOGO, MELHORIAS, TRILHAS, fasesDa, trilhaPorId } from '../../src/content';
import { iniciarSessao, pontosDaSessao, responderExercicio } from '../../src/core/licao';
import { comprar, concluirNo, desbloqueado, mvp, novoEstado, proximoNo, totalEstrelas, vantagens } from '../../src/core/jogo';
import { argumentar, fechar, iniciarDuelo, pontosDoDuelo, precoFechado } from '../../src/core/negociacao';
import { avaliarOrcamento, melhorPontuacao } from '../../src/core/orcamento';
import { desserializar, serializar } from '../../src/core/save';
import { avancar, cartaAtual, iniciarRodada, responder } from '../../src/core/triagem';
import type { Estado, No } from '../../src/core/tipos';

type Habilidade = 'craque' | 'distraido';

const CARREIRA = trilhaPorId('carreira')!;
const CAPITULOS = CARREIRA.unidades;
const TRILHA = fasesDa(CARREIRA);

/** Joga uma fase pelo core, do jeito que a tela faria, e devolve pontos e ganho direto. */
function jogarNo(no: No, estado: Estado, habilidade: Habilidade): { pontos: number; ganho?: number } {
  if (no.tipo === 'licao') {
    let sessao = iniciarSessao(no);
    for (const e of no.exercicios) {
      const certa = e.tipo === 'escolha' ? e.correta : e.tipo === 'montar' ? e.pecas : e.respostas[0]!;
      sessao = responderExercicio(sessao, no, habilidade === 'craque' ? certa : 'errado')!.sessao;
      if (sessao.fim !== null) break;
    }
    return { pontos: pontosDaSessao(sessao) };
  }
  if (no.tipo === 'triagem') {
    let rodada = iniciarRodada(no, vantagens(estado, MELHORIAS), 12345);
    let jogadas = 0;
    // Craque: uma carta por segundo, sempre certa. Distraído: erra uma a cada três.
    while (rodada.fim === null) {
      const carta = cartaAtual(rodada, no)!;
      const errar = habilidade === 'distraido' && jogadas % 3 === 2;
      const lado = errar ? (carta.lado === 'direita' ? 'esquerda' : 'direita') : carta.lado;
      rodada = responder(rodada, no, lado)!.rodada;
      rodada = avancar(rodada, 1000);
      jogadas++;
    }
    return { pontos: rodada.pontos };
  }
  if (no.tipo === 'orcamento') {
    if (habilidade === 'distraido') return { pontos: avaliarOrcamento(no, no.itens.map((i) => i.id)).pontos };
    const alvo = melhorPontuacao(no);
    for (let mascara = 0; mascara < 1 << no.itens.length; mascara++) {
      const ids = no.itens.filter((_, i) => (mascara & (1 << i)) !== 0).map((i) => i.id);
      if (avaliarOrcamento(no, ids).pontos === alvo) return { pontos: alvo };
    }
    return { pontos: 0 };
  }
  let duelo = iniciarDuelo(no);
  if (habilidade === 'craque') {
    for (const argumento of no.argumentos.filter((a) => a.tipo !== 'fraco')) {
      if (duelo.paciencia <= 1) break;
      duelo = argumentar(duelo, no, argumento.id, 1)!.duelo;
    }
  }
  duelo = fechar(duelo);
  return { pontos: pontosDoDuelo(duelo, no), ganho: precoFechado(duelo) };
}

function jogarTrilha(habilidade: Habilidade, trilha = CARREIRA): Estado {
  let estado = novoEstado('Teste');
  for (const no of fasesDa(trilha)) {
    if (!desbloqueado(estado, trilha.unidades, no.id)) break;
    const { pontos, ganho } = jogarNo(no, estado, habilidade);
    estado = concluirNo(estado, no, pontos, MELHORIAS, ganho).estado;
    // O jogo salva depois de cada fase: o que foi salvo precisa voltar igual.
    expect(desserializar(serializar(estado), CATALOGO), `save depois de ${no.id}`).toEqual(estado);
  }
  return estado;
}

describe('trilha completa com o conteúdo real', () => {
  it('um jogador que acerta tudo fecha o capítulo com 3 estrelas em todas as fases', () => {
    const fim = jogarTrilha('craque');
    expect(totalEstrelas(fim, CAPITULOS)).toBe(TRILHA.length * 3);
    expect(proximoNo(fim, CAPITULOS)).toBeNull();
    expect(mvp(fim, CAPITULOS)).toBe(1000);
    expect(fim.dinheiro).toBeGreaterThan(2500);
  });

  it('um jogador distraído avança menos, ganha menos e fica com MVP baixo', () => {
    const craque = jogarTrilha('craque');
    const distraido = jogarTrilha('distraido');
    expect(totalEstrelas(distraido, CAPITULOS)).toBeLessThan(totalEstrelas(craque, CAPITULOS));
    expect(distraido.dinheiro).toBeLessThan(craque.dinheiro);
    expect(mvp(distraido, CAPITULOS)).toBeLessThan(600);
  });

  it('toda trilha pode ser concluída com 3 estrelas em todas as fases', () => {
    for (const trilha of TRILHAS) {
      const fim = jogarTrilha('craque', trilha);
      expect(totalEstrelas(fim, trilha.unidades), trilha.id).toBe(fasesDa(trilha).length * 3);
      expect(mvp(fim, trilha.unidades), trilha.id).toBe(1000);
    }
  });

  it('quem erra tudo em uma lição fica sem vidas, sem pontos e sem abrir a seguinte', () => {
    const python = trilhaPorId('python')!;
    const fim = jogarTrilha('distraido', python);
    expect(totalEstrelas(fim, python.unidades)).toBe(0);
    expect(fim.rodadas).toBe(1);
    expect(proximoNo(fim, python.unidades)?.id).toBe(fasesDa(python)[0]!.id);
  });

  it('a compra parcelada custa mais do que rende em uma fase comum', () => {
    const parcelado = MELHORIAS.find((m) => m.id === 'notebook-parcelado')!;
    const compra = comprar(novoEstado('Teste'), parcelado);
    if (!compra.ok) throw new Error('compra recusada');
    const fase = TRILHA[0]!;
    const sem = concluirNo(novoEstado('Teste'), fase, fase.metas[2], MELHORIAS).fechamento;
    const com = concluirNo(compra.estado, fase, fase.metas[2], MELHORIAS).fechamento;
    expect(com.ganho - sem.ganho).toBeLessThan(com.custos - sem.custos);
  });

  it('todas as melhorias reais podem ser compradas e salvas', () => {
    let estado: Estado = { ...novoEstado('Teste'), dinheiro: 50_000 };
    for (const melhoria of MELHORIAS) {
      const compra = comprar(estado, melhoria);
      expect(compra.ok, melhoria.id).toBe(true);
      if (compra.ok) estado = compra.estado;
    }
    expect(desserializar(serializar(estado), CATALOGO)).toEqual(estado);
  });
});

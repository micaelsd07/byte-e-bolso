import { describe, expect, it } from 'vitest';
import { CATALOGO, CONQUISTAS, FASES, HABILIDADES, PRIMEIRA_FASE } from '../../src/content';
import { usarHabilidade } from '../../src/core/habilidades';
import { mvpScore } from '../../src/core/mvp';
import { melhorPontuacao, avaliarOrcamento } from '../../src/core/orcamento';
import { novoEstado, passoAtual, resolverDecisao, resolverOrcamento } from '../../src/core/partida';
import { estrelasDaFase } from '../../src/core/progressao';
import { desserializar, serializar } from '../../src/core/save';
import type { Estado, Fase, PassoOrcamento } from '../../src/core/tipos';

type Estrategia = 'melhor' | 'pior';

function melhorSelecao(passo: PassoOrcamento): string[] {
  const alvo = melhorPontuacao(passo);
  for (let mascara = 0; mascara < 1 << passo.itens.length; mascara++) {
    const ids = passo.itens.filter((_, i) => (mascara & (1 << i)) !== 0).map((i) => i.id);
    if (avaliarOrcamento(passo, ids).pontos === alvo) return ids;
  }
  return [];
}

/** Joga a fase inteira pelo core, salvando e relendo o save a cada passo, como o jogo faz. */
function jogar(fase: Fase, estrategia: Estrategia): Estado {
  let estado = novoEstado('Teste', fase.id);
  for (;;) {
    const passo = passoAtual(estado, fase);
    if (passo === null) return estado;
    const resultado =
      passo.tipo === 'decisao'
        ? resolverDecisao(
            estado,
            fase,
            [...passo.opcoes].sort((a, b) => (estrategia === 'melhor' ? b.merito - a.merito : a.merito - b.merito))[0]!.id,
            CONQUISTAS,
          )
        : resolverOrcamento(
            estado,
            fase,
            estrategia === 'melhor' ? melhorSelecao(passo) : passo.itens.map((i) => i.id),
            CONQUISTAS,
          );
    if (resultado === null) throw new Error(`passo ${passo.id} recusado`);
    const relido = desserializar(serializar(resultado.estado), CATALOGO);
    expect(relido, `save depois de ${passo.id}`).toEqual(resultado.estado);
    estado = resultado.estado;
  }
}

describe('partida completa com o conteúdo real', () => {
  it('conclui a Fase 1 com três estrelas jogando bem', () => {
    const fim = jogar(PRIMEIRA_FASE, 'melhor');
    expect(fim.status).toBe('faseConcluida');
    expect(fim.fasesConcluidas).toEqual([PRIMEIRA_FASE.id]);
    expect(estrelasDaFase(fim.historico, PRIMEIRA_FASE.id)).toBe(3);
    expect(fim.conquistas).toEqual(expect.arrayContaining(['primeiro-setup', 'no-azul', 'faro-fino', 'tres-em-linha']));
    expect(fim.atributos.dinheiro).toBeGreaterThan(0);
    expect(mvpScore(fim, CONQUISTAS.length)).toBeGreaterThan(900);
  });

  it('pune as piores escolhas sem travar: a partida termina e o MVP fica baixo', () => {
    const fim = jogar(PRIMEIRA_FASE, 'pior');
    expect(fim.status).not.toBe('jogando');
    expect(mvpScore(fim, CONQUISTAS.length)).toBeLessThan(400);
  });

  it('aceita qualquer opção de qualquer decisão de todas as fases', () => {
    for (const fase of FASES) {
      fase.passos.forEach((passo, indice) => {
        if (passo.tipo !== 'decisao') return;
        for (const opcao of passo.opcoes) {
          const estado = { ...novoEstado('Teste', fase.id), passo: indice };
          expect(resolverDecisao(estado, fase, opcao.id, CONQUISTAS), `${fase.id}/${passo.id}/${opcao.id}`).not.toBeNull();
        }
      });
    }
  });

  it('salva e relê a recarga de todas as habilidades reais', () => {
    let estado = novoEstado('Teste', PRIMEIRA_FASE.id);
    for (const habilidade of HABILIDADES) {
      const uso = usarHabilidade(estado, habilidade);
      expect(uso.ok, habilidade.id).toBe(true);
      if (uso.ok) estado = uso.estado;
    }
    expect(desserializar(serializar(estado), CATALOGO)).toEqual(estado);
  });
});

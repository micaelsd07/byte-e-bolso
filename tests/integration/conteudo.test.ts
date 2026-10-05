import { describe, expect, it } from 'vitest';
import { carregarConteudo, validarConteudo } from '../../scripts/lib/conteudo.mjs';
import { CATALOGO, CONQUISTAS, FASES, HABILIDADES } from '../../src/content';
import { melhorPontuacao } from '../../src/core/orcamento';

describe('conteúdo real do jogo', () => {
  const conteudo = carregarConteudo();

  it('passa no schema e nas checagens de referência', () => {
    expect(validarConteudo(conteudo)).toEqual([]);
  });

  it('entrega no jogo exatamente as fases que estão na pasta de conteúdo', () => {
    const naPasta = conteudo.fases.map((f) => (f.dados as { id: string }).id);
    expect(FASES.map((f) => f.id)).toEqual(naPasta);
    expect(Object.keys(CATALOGO.fases)).toEqual(naPasta);
  });

  it('tem todo desafio de orçamento vencível com 90 pontos ou mais', () => {
    const orcamentos = FASES.flatMap((f) => f.passos).filter((p) => p.tipo === 'orcamento');
    expect(orcamentos.length).toBeGreaterThan(0);
    for (const passo of orcamentos) expect(melhorPontuacao(passo), passo.id).toBeGreaterThanOrEqual(90);
  });

  it('tem toda conquista alcançável com as fases e os atributos que existem', () => {
    for (const conquista of CONQUISTAS) {
      const { condicao } = conquista;
      if (condicao.tipo === 'faseConcluida') expect(CATALOGO.fases[condicao.faseId], conquista.id).toBeDefined();
      if (condicao.tipo === 'notaMinima') {
        const existe = FASES.some((f) => f.passos.some((p) => p.tipo === condicao.passoTipo));
        expect(existe, conquista.id).toBe(true);
      }
    }
    expect(HABILIDADES.length).toBeGreaterThanOrEqual(3);
  });
});

import { describe, expect, it } from 'vitest';
import { TAMANHO_DO_RANKING, desserializarRanking, participa, posicao, registrar, retirar, serializarRanking, type Colocado } from '../../src/core/ranking';

const de = (apelido: string, estrelas: number, mvp = 100, avatar = 'foco'): Colocado => ({ apelido, avatar, estrelas, mvp });

describe('ranking do aparelho', () => {
  it('só aceita quem escolheu um apelido e já tem estrela', () => {
    expect(participa('Ana')).toBe(true);
    expect(participa('Visitante')).toBe(false);
    expect(registrar([], de('Visitante', 9))).toEqual([]);
    expect(registrar([], de('Ana', 0))).toEqual([]);
    expect(registrar([], de('Ana', 3))).toEqual([de('Ana', 3)]);
  });

  it('ordena por estrelas, desempata pelo MVP e depois pelo apelido', () => {
    let ranking = registrar([], de('Caio', 6, 200));
    ranking = registrar(ranking, de('Ana', 9, 100));
    ranking = registrar(ranking, de('Bia', 6, 300));
    ranking = registrar(ranking, de('Abel', 6, 300));
    expect(ranking.map((c) => c.apelido)).toEqual(['Ana', 'Abel', 'Bia', 'Caio']);
    expect(posicao(ranking, 'Bia')).toBe(3);
    expect(posicao(ranking, 'Zeca')).toBeNull();
  });

  it('atualiza a linha de quem melhora e mantém o recorde de quem recomeça do zero', () => {
    const inicial = [de('Ana', 6, 200)];
    expect(registrar(inicial, de('Ana', 9, 250))).toEqual([de('Ana', 9, 250)]);
    expect(registrar(inicial, de('Ana', 3, 900))).toEqual(inicial);
    // Mesmo resultado com outro personagem: a linha acompanha a troca.
    expect(registrar(inicial, de('Ana', 6, 200, 'foguete'))).toEqual([de('Ana', 6, 200, 'foguete')]);
  });

  it('guarda no máximo dez jogadores, os de melhor resultado', () => {
    let ranking: Colocado[] = [];
    for (let i = 1; i <= TAMANHO_DO_RANKING + 3; i++) ranking = registrar(ranking, de(`Jogador ${i}`, i));
    expect(ranking).toHaveLength(TAMANHO_DO_RANKING);
    expect(ranking[0]!.estrelas).toBe(TAMANHO_DO_RANKING + 3);
    expect(posicao(ranking, 'Jogador 1')).toBeNull();
  });

  it('tira do ranking o apelido antigo de quem troca de nome', () => {
    expect(retirar([de('Ana', 6), de('Bia', 3)], 'Ana')).toEqual([de('Bia', 3)]);
  });

  it('volta do armazenamento igual ao que foi guardado, e em ordem', () => {
    const ranking = [de('Ana', 9), de('Bia', 3)];
    expect(desserializarRanking(serializarRanking(ranking))).toEqual(ranking);
    expect(desserializarRanking(serializarRanking([de('Bia', 3), de('Ana', 9)]))).toEqual(ranking);
    expect(desserializarRanking(null)).toEqual([]);
  });

  it('descarta o ranking inteiro quando alguma linha foi adulterada', () => {
    const ruins: unknown[] = [
      'isto não é JSON',
      { apelido: 'Ana' },
      [null],
      [{ apelido: 'Ana <b>', avatar: 'foco', estrelas: 3, mvp: 1 }],
      [{ apelido: 'Visitante', avatar: 'foco', estrelas: 3, mvp: 1 }],
      [de('Ana', 3), de('Ana', 6)],
      [de('Ana', 3, 100, 'dragao')],
      [de('Ana', 0)],
      [de('Ana', 3.5)],
      [de('Ana', 99_999)],
      [de('Ana', 3, 1001)],
      Array.from({ length: TAMANHO_DO_RANKING + 1 }, (_, i) => de(`J${i}`, 3)),
    ];
    for (const ruim of ruins) expect(desserializarRanking(typeof ruim === 'string' ? ruim : JSON.stringify(ruim)), JSON.stringify(ruim)).toEqual([]);
  });
});

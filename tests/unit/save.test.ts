import { describe, expect, it } from 'vitest';
import { novoEstado, resolverDecisao, resolverOrcamento } from '../../src/core/partida';
import { desserializar, serializar } from '../../src/core/save';
import type { Estado } from '../../src/core/tipos';
import { CATALOGO, CONQUISTAS, FASE, ORCAMENTO_IDEAL } from './apoio';

function partidaEmAndamento(): Estado {
  const d1 = resolverDecisao(novoEstado('Ana', 'f1'), FASE, 'boa', CONQUISTAS)!.estado;
  return resolverOrcamento(d1, FASE, ORCAMENTO_IDEAL, CONQUISTAS)!.estado;
}

/** Serializa o estado com uma adulteração, como alguém faria editando o localStorage. */
const adulterar = (mudanca: (bruto: Record<string, any>) => void): string => {
  const bruto = JSON.parse(serializar(partidaEmAndamento()));
  mudanca(bruto);
  return JSON.stringify(bruto);
};

describe('save', () => {
  it('lê de volta exatamente o que salvou', () => {
    const estado = partidaEmAndamento();
    expect(desserializar(serializar(estado), CATALOGO)).toEqual(estado);
  });

  it('rejeita texto que não é JSON, JSON de outro formato e versão desconhecida', () => {
    expect(desserializar('{quebrado', CATALOGO)).toBeNull();
    expect(desserializar('[]', CATALOGO)).toBeNull();
    expect(desserializar('null', CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.versao = 2)), CATALOGO)).toBeNull();
  });

  it('rejeita XP acima do que o histórico permite', () => {
    // Dois passos resolvidos valem no máximo 30 + 50 de XP.
    expect(desserializar(adulterar((b) => (b.xp = 80)), CATALOGO)).not.toBeNull();
    expect(desserializar(adulterar((b) => (b.xp = 81)), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.xp = -1)), CATALOGO)).toBeNull();
  });

  it('rejeita atributo fora da escala ou que não é número inteiro', () => {
    expect(desserializar(adulterar((b) => (b.atributos.energia = 101)), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.atributos.reputacao = -1)), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.atributos.dinheiro = '9999999')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.atributos.dinheiro = 1e12)), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => delete b.atributos.seguranca), CATALOGO)).toBeNull();
  });

  it('rejeita o mesmo passo resolvido duas vezes (recompensa repetida)', () => {
    const texto = adulterar((b) => {
      b.historico.push({ ...b.historico[0] });
      b.rodada = 3;
    });
    expect(desserializar(texto, CATALOGO)).toBeNull();
  });

  it('rejeita nota fora de 0 a 1 e passo que não existe no conteúdo', () => {
    expect(desserializar(adulterar((b) => (b.historico[0].nota = 1.5)), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.historico[0].passoId = 'inventado')), CATALOGO)).toBeNull();
  });

  it('rejeita rodada que não bate com o histórico', () => {
    expect(desserializar(adulterar((b) => (b.rodada = 40)), CATALOGO)).toBeNull();
  });

  it('rejeita conquista inexistente, repetida ou fase concluída sem histórico', () => {
    expect(desserializar(adulterar((b) => (b.conquistas = ['mvp-da-semana'])), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.conquistas = ['azul', 'azul'])), CATALOGO)).toBeNull();
    expect(
      desserializar(
        adulterar((b) => {
          b.historico = [];
          b.rodada = 0;
          b.xp = 0;
          b.rodadasNoVermelho = 0;
          b.fasesConcluidas = ['f1'];
        }),
        CATALOGO,
      ),
    ).toBeNull();
  });

  it('rejeita status incoerente com o motivo da derrota e com o passo', () => {
    expect(desserializar(adulterar((b) => (b.status = 'derrota')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.motivoDerrota = 'falencia')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.status = 'faseConcluida')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.passo = 99)), CATALOGO)).toBeNull();
  });

  it('rejeita apelido com caracteres proibidos, recarga de habilidade inexistente e fase desconhecida', () => {
    expect(desserializar(adulterar((b) => (b.apelido = '<script>')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.recargas = { 'vitoria-instantanea': 0 })), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.faseId = 'fase-99')), CATALOGO)).toBeNull();
    expect(desserializar(adulterar((b) => (b.bonusDesafio = 500)), CATALOGO)).toBeNull();
  });
});

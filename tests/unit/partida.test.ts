import { describe, expect, it } from 'vitest';
import {
  iniciarFase,
  limparApelido,
  novoEstado,
  passoAtual,
  resolverDecisao,
  resolverOrcamento,
} from '../../src/core/partida';
import type { Estado } from '../../src/core/tipos';
import { CONQUISTAS, FASE, ORCAMENTO_IDEAL } from './apoio';

const decidir = (estado: Estado, opcao: string): Estado => {
  const r = resolverDecisao(estado, FASE, opcao, CONQUISTAS);
  if (r === null) throw new Error('decisão recusada');
  return r.estado;
};
const orcar = (estado: Estado, ids: string[]): Estado => {
  const r = resolverOrcamento(estado, FASE, ids, CONQUISTAS);
  if (r === null) throw new Error('orçamento recusado');
  return r.estado;
};

describe('apelido', () => {
  it('remove caracteres que não são letra, número, espaço, hífen ou sublinhado', () => {
    expect(limparApelido('  <b>Ana</b>@mail.com  ')).toBe('bAnabmailcom');
    expect(limparApelido('João_dev-01')).toBe('João_dev-01');
  });

  it('corta em 16 caracteres e usa Visitante quando fica vazio', () => {
    expect(limparApelido('a'.repeat(40))).toHaveLength(16);
    expect(limparApelido('   ')).toBe('Visitante');
    expect(limparApelido('@#$%')).toBe('Visitante');
  });
});

describe('partida', () => {
  it('começa com R$ 2.500, no primeiro passo e sem histórico', () => {
    const estado = novoEstado('Ana', 'f1');
    expect(estado.atributos.dinheiro).toBe(2500);
    expect(estado.status).toBe('jogando');
    expect(passoAtual(estado, FASE)?.id).toBe('d1');
    expect(estado.historico).toEqual([]);
  });

  it('aplica a decisão: efeitos, XP, histórico e avanço de passo', () => {
    const r = resolverDecisao(novoEstado('Ana', 'f1'), FASE, 'boa', CONQUISTAS);
    expect(r?.estado.atributos.dinheiro).toBe(2400);
    expect(r?.estado.atributos.conhecimento).toBe(15);
    expect(r?.estado.xp).toBe(30);
    expect(r?.estado.passo).toBe(1);
    expect(r?.estado.rodada).toBe(1);
    expect(r?.estado.historico).toEqual([{ faseId: 'f1', passoId: 'd1', tipo: 'decisao', categoria: 'tecnologia', nota: 1 }]);
    expect(r?.feedback.aprendizado).toBe('Boa escolha.');
    expect(r?.feedback.efeitos).toEqual({ dinheiro: -100, conhecimento: 10 });
  });

  it('recusa opção inexistente e tipo de passo errado', () => {
    const estado = novoEstado('Ana', 'f1');
    expect(resolverDecisao(estado, FASE, 'nao-existe', CONQUISTAS)).toBeNull();
    expect(resolverOrcamento(estado, FASE, [], CONQUISTAS)).toBeNull();
  });

  it('recusa orçamento com item que não pertence ao desafio', () => {
    const estado = decidir(novoEstado('Ana', 'f1'), 'boa');
    expect(resolverOrcamento(estado, FASE, ['aluguel', 'iate'], CONQUISTAS)).toBeNull();
  });

  it('conclui a fase no último passo e entrega as conquistas', () => {
    let estado = decidir(novoEstado('Ana', 'f1'), 'boa');
    estado = orcar(estado, ORCAMENTO_IDEAL);
    const fim = resolverDecisao(estado, FASE, 'boa', CONQUISTAS);
    expect(fim?.estado.status).toBe('faseConcluida');
    expect(fim?.estado.fasesConcluidas).toEqual(['f1']);
    expect(fim?.estado.conquistas).toEqual(['azul', 'fase', 'seguro', 'trinca']);
    expect(fim?.feedback.conquistasNovas).toEqual(['fase', 'seguro', 'trinca']);
    expect(passoAtual(fim!.estado, FASE)).toBeNull();
  });

  it('avisa na primeira rodada no vermelho e decreta falência na segunda', () => {
    const r1 = resolverDecisao(novoEstado('Ana', 'f1'), FASE, 'ruim', CONQUISTAS);
    expect(r1?.estado.atributos.dinheiro).toBe(-500);
    expect(r1?.estado.status).toBe('jogando');
    expect(r1?.feedback.alerta).toContain('negativa');

    const r2 = resolverOrcamento(r1!.estado, FASE, ['aluguel', 'luz', 'viagem'], CONQUISTAS);
    expect(r2?.estado.status).toBe('derrota');
    expect(r2?.estado.motivoDerrota).toBe('falencia');
    expect(r2?.feedback.conquistasNovas).toEqual([]);
  });

  it('zera a contagem do vermelho quando o saldo volta a ficar positivo', () => {
    const estado = decidir(novoEstado('Ana', 'f1'), 'ruim');
    // 1000 de renda - 600 de essenciais = 400 de sobra: saldo vai de -300 para +100.
    const aindaNegativo = { ...estado, atributos: { ...estado.atributos, dinheiro: -300 } };
    const r = resolverOrcamento(aindaNegativo, FASE, ['aluguel', 'luz'], CONQUISTAS);
    expect(r?.estado.atributos.dinheiro).toBe(100);
    expect(r?.estado.rodadasNoVermelho).toBe(0);
    expect(r?.estado.status).toBe('jogando');
  });

  it('termina em esgotamento quando a energia chega a zero', () => {
    const cansado = { ...novoEstado('Ana', 'f1'), atributos: { ...novoEstado('Ana', 'f1').atributos, energia: 40 } };
    const r = resolverDecisao(cansado, FASE, 'exaustiva', CONQUISTAS);
    expect(r?.estado.status).toBe('derrota');
    expect(r?.estado.motivoDerrota).toBe('burnout');
  });

  it('não aceita mais jogadas depois da derrota', () => {
    const derrotado: Estado = { ...novoEstado('Ana', 'f1'), status: 'derrota', motivoDerrota: 'burnout' };
    expect(resolverDecisao(derrotado, FASE, 'boa', CONQUISTAS)).toBeNull();
  });

  it('aplica o Foco total uma vez só e sem passar de 100 pontos', () => {
    const estado = { ...decidir(novoEstado('Ana', 'f1'), 'boa'), bonusDesafio: 20 };
    const semLazer = resolverOrcamento(estado, FASE, ['aluguel', 'luz', 'curso'], CONQUISTAS);
    expect(semLazer?.feedback.nota).toBe(1); // 85 * 1,2 = 102, limitado a 100
    expect(semLazer?.estado.bonusDesafio).toBe(0);

    const semFuturo = resolverOrcamento(estado, FASE, ['aluguel', 'luz', 'cinema'], CONQUISTAS);
    expect(semFuturo?.feedback.nota).toBe(0.96); // 80 * 1,2
  });

  it('só inicia a próxima fase depois de concluir a atual', () => {
    const jogando = novoEstado('Ana', 'f1');
    expect(iniciarFase(jogando, 'f2')).toBe(jogando);

    const concluida: Estado = { ...jogando, status: 'faseConcluida', passo: 3, xp: 80 };
    const seguinte = iniciarFase(concluida, 'f2');
    expect(seguinte).toMatchObject({ faseId: 'f2', passo: 0, status: 'jogando', xp: 80 });
  });
});

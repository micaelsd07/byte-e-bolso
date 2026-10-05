import { describe, expect, it } from 'vitest';
import {
  abrirDia,
  comprar,
  concluirNo,
  diaAnterior,
  escolherAvatar,
  escolherTrilha,
  maximoDeVidas,
  recarregarVidas,
  registrarPratica,
  renomear,
  tituloDoNivel,
  custoFixo,
  desbloqueado,
  estrelasPor,
  limparApelido,
  mvp,
  nivel,
  novoEstado,
  proximoNo,
  totalEstrelas,
  vantagens,
} from '../../src/core/jogo';
import type { Estado } from '../../src/core/tipos';
import { CAPITULOS, MELHORIAS, NEGOCIACAO, ORCAMENTO, TRIAGEM } from './apoio';

const com = (extra: Partial<Estado>): Estado => ({ ...novoEstado('Ana'), ...extra });
const melhoria = (id: string) => MELHORIAS.find((m) => m.id === id)!;

describe('apelido', () => {
  it('remove caracteres que não são letra, número, espaço, hífen ou sublinhado', () => {
    expect(limparApelido('  <b>Ana</b>@mail.com  ')).toBe('bAnabmailcom');
    expect(limparApelido('João_dev-01')).toBe('João_dev-01');
  });

  it('corta em 16 caracteres e usa Visitante quando fica vazio', () => {
    expect(limparApelido('a'.repeat(40))).toHaveLength(16);
    expect(limparApelido('@#$%')).toBe('Visitante');
  });

  it('pode ser trocado no perfil, com a mesma limpeza e sem mexer no progresso', () => {
    const antes = com({ dinheiro: 900, nos: { triagem: 300 }, rodadas: 1 });
    const depois = renomear(antes, '  Mica<script>  ');
    expect(depois.apelido).toBe('Micascript');
    expect(depois).toMatchObject({ dinheiro: 900, nos: { triagem: 300 }, rodadas: 1 });
    expect(renomear(antes, '!!!').apelido).toBe('Visitante');
  });
});

describe('trilha', () => {
  it('começa com R$ 2.500, sem fases jogadas e só a primeira aberta', () => {
    const estado = novoEstado('Ana');
    expect(estado).toMatchObject({ trilha: null, dinheiro: 2500, nos: {}, melhorias: [], rodadas: 0 });
    expect(desbloqueado(estado, CAPITULOS, 'triagem')).toBe(true);
    expect(desbloqueado(estado, CAPITULOS, 'orcamento')).toBe(false);
    expect(desbloqueado(estado, CAPITULOS, 'inexistente')).toBe(false);
    expect(proximoNo(estado, CAPITULOS)?.id).toBe('triagem');
  });

  it('troca de trilha sem mexer no progresso', () => {
    const estado = com({ nos: { triagem: 400 }, dinheiro: 3000 });
    expect(escolherTrilha(estado, 'python')).toEqual({ ...estado, trilha: 'python' });
    expect(escolherTrilha(estado, null).trilha).toBeNull();
  });

  it('dá estrelas pelas metas da fase', () => {
    expect([0, 99, 100, 199, 200, 399, 400, 9999].map((p) => estrelasPor(TRIAGEM, p))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('abre a fase seguinte com 1 estrela na anterior', () => {
    expect(desbloqueado(com({ nos: { triagem: 99 } }), CAPITULOS, 'orcamento')).toBe(false);
    const estado = com({ nos: { triagem: 100 } });
    expect(desbloqueado(estado, CAPITULOS, 'orcamento')).toBe(true);
    expect(desbloqueado(estado, CAPITULOS, 'negociacao')).toBe(false);
    expect(proximoNo(estado, CAPITULOS)?.id).toBe('orcamento');
  });

  it('não tem próxima fase quando todas têm estrela', () => {
    expect(proximoNo(com({ nos: { triagem: 400, orcamento: 90, negociacao: 90 } }), CAPITULOS)).toBeNull();
  });

  it('soma estrelas e sobe um nível a cada 3', () => {
    const estado = com({ nos: { triagem: 400, orcamento: 75 } });
    expect(totalEstrelas(estado, CAPITULOS)).toBe(5);
    expect(nivel(estado, CAPITULOS)).toBe(2);
    expect(nivel(novoEstado('Ana'), CAPITULOS)).toBe(1);
  });
});

describe('caixa da empresa', () => {
  it('paga a fase na proporção dos pontos e cobra o custo fixo', () => {
    const { estado, fechamento } = concluirNo(novoEstado('Ana'), TRIAGEM, 200, MELHORIAS);
    expect(fechamento).toMatchObject({ pontos: 200, estrelas: 2, recorde: true, ganho: 150, custos: 60, juros: 0, saldo: 2590 });
    expect(estado).toMatchObject({ dinheiro: 2590, rodadas: 1, nos: { triagem: 200 } });
  });

  it('não paga mais do que a recompensa cheia, por mais pontos que a rodada tenha', () => {
    expect(concluirNo(novoEstado('Ana'), TRIAGEM, 5000, MELHORIAS).fechamento.ganho).toBe(300);
  });

  it('guarda só a melhor pontuação, mas cobra o custo de toda rodada', () => {
    const primeira = concluirNo(novoEstado('Ana'), TRIAGEM, 300, MELHORIAS).estado;
    const { estado, fechamento } = concluirNo(primeira, TRIAGEM, 120, MELHORIAS);
    expect(fechamento.recorde).toBe(false);
    expect(estado.nos.triagem).toBe(300);
    expect(estado.rodadas).toBe(2);
    expect(estado.dinheiro).toBe(primeira.dinheiro + 90 - 60);
  });

  it('descarta pontuação acima do teto da fase e abaixo de zero', () => {
    expect(concluirNo(novoEstado('Ana'), TRIAGEM, 999_999, MELHORIAS).estado.nos.triagem).toBe(6000);
    expect(concluirNo(novoEstado('Ana'), ORCAMENTO, -50, MELHORIAS).fechamento.pontos).toBe(0);
  });

  it('na negociação, o que entra no caixa é o preço fechado', () => {
    const { fechamento } = concluirNo(novoEstado('Ana'), NEGOCIACAO, 78, MELHORIAS, 700);
    expect(fechamento).toMatchObject({ ganho: 700, estrelas: 2, saldo: 2500 + 700 - 60 });
    expect(concluirNo(novoEstado('Ana'), NEGOCIACAO, 0, MELHORIAS, 0).fechamento).toMatchObject({ ganho: 0, estrelas: 0 });
  });

  it('cobra 8% de juros por rodada sobre o saldo negativo', () => {
    const { fechamento } = concluirNo(com({ dinheiro: -1000 }), TRIAGEM, 400, MELHORIAS);
    expect(fechamento).toMatchObject({ juros: 80, ganho: 300, custos: 60, saldo: -840 });
  });

  it('soma a manutenção das melhorias ao custo fixo', () => {
    expect(custoFixo(novoEstado('Ana'), MELHORIAS)).toBe(60);
    expect(custoFixo(com({ melhorias: ['tempo', 'renda'] }), MELHORIAS)).toBe(110);
  });

  it('aumenta a renda das fases com a melhoria de renda', () => {
    expect(concluirNo(com({ melhorias: ['renda'] }), TRIAGEM, 400, MELHORIAS).fechamento.ganho).toBe(375);
  });
});

describe('melhorias', () => {
  it('compra descontando do caixa', () => {
    const compra = comprar(novoEstado('Ana'), melhoria('renda'));
    expect(compra).toMatchObject({ ok: true, estado: { dinheiro: 900, melhorias: ['renda'] } });
  });

  it('recusa comprar duas vezes, sem dinheiro ou com o saldo negativo', () => {
    expect(comprar(com({ melhorias: ['renda'] }), melhoria('renda'))).toEqual({ ok: false, motivo: 'jaTem' });
    expect(comprar(com({ dinheiro: 1599 }), melhoria('renda'))).toEqual({ ok: false, motivo: 'semDinheiro' });
    expect(comprar(com({ dinheiro: -1 }), melhoria('vida'))).toEqual({ ok: false, motivo: 'semDinheiro' });
  });

  it('transforma as melhorias em vantagens dentro das fases', () => {
    expect(vantagens(novoEstado('Ana'), MELHORIAS)).toEqual({ tempoExtra: 0, vidasExtras: 0, comboMaximo: 4, renda: 0 });
    expect(vantagens(com({ melhorias: ['vida', 'tempo', 'combo', 'renda', 'enfeite'] }), MELHORIAS)).toEqual({
      tempoExtra: 5,
      vidasExtras: 1,
      comboMaximo: 5,
      renda: 25,
    });
  });
});

describe('personagem, vidas e sequência de dias', () => {
  it('começa com 5 vidas, sem sequência e com o primeiro personagem', () => {
    expect(novoEstado('Ana')).toMatchObject({ avatar: 'foco', vidas: 5, sequencia: 0, ultimoDia: null, diaDasVidas: null });
  });

  it('troca de personagem só para um que existe', () => {
    expect(escolherAvatar(novoEstado('Ana'), 'escudo').avatar).toBe('escudo');
    const estado = novoEstado('Ana');
    expect(escolherAvatar(estado, 'dragao')).toBe(estado);
  });

  it('dá o título do personagem pelo nível', () => {
    expect([1, 2, 4, 7, 11, 16].map(tituloDoNivel)).toEqual(['Aprendiz', 'Estagiário', 'Dev Júnior', 'Dev Pleno', 'Dev Sênior', 'Mestre do Código']);
  });

  it('enche as vidas na primeira abertura de cada dia, e só nela', () => {
    const gasto = com({ vidas: 1, diaDasVidas: '2026-10-05' });
    expect(abrirDia(gasto, '2026-10-05', 5)).toBe(gasto);
    expect(abrirDia(gasto, '2026-10-06', 5)).toMatchObject({ vidas: 5, diaDasVidas: '2026-10-06' });
    // Quem tem vida extra de melhoria não perde ao virar o dia.
    expect(abrirDia(com({ vidas: 6, diaDasVidas: null }), '2026-10-06', 5).vidas).toBe(6);
  });

  it('soma a vida extra da melhoria ao máximo', () => {
    expect(maximoDeVidas(novoEstado('Ana'), MELHORIAS)).toBe(5);
    expect(maximoDeVidas(com({ melhorias: ['vida'] }), MELHORIAS)).toBe(6);
  });

  it('recarrega as vidas pagando R$ 100, se houver vida faltando e dinheiro', () => {
    expect(recarregarVidas(com({ vidas: 0 }), 5)).toMatchObject({ ok: true, estado: { vidas: 5, dinheiro: 2400 } });
    expect(recarregarVidas(novoEstado('Ana'), 5)).toEqual({ ok: false, motivo: 'cheias' });
    expect(recarregarVidas(com({ vidas: 2, dinheiro: 99 }), 5)).toEqual({ ok: false, motivo: 'semDinheiro' });
  });

  it('calcula o dia anterior, inclusive na virada de mês e de ano', () => {
    expect(diaAnterior('2026-10-06')).toBe('2026-10-05');
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2027-01-01')).toBe('2026-12-31');
  });

  it('conta a sequência: mesmo dia mantém, dia seguinte soma, dia pulado recomeça', () => {
    const d1 = registrarPratica(novoEstado('Ana'), '2026-10-05');
    expect(d1).toMatchObject({ sequencia: 1, ultimoDia: '2026-10-05' });
    expect(registrarPratica(d1, '2026-10-05')).toBe(d1);
    const d2 = registrarPratica(d1, '2026-10-06');
    expect(d2.sequencia).toBe(2);
    expect(registrarPratica(d2, '2026-10-09')).toMatchObject({ sequencia: 1, ultimoDia: '2026-10-09' });
  });
});

describe('MVP Score', () => {
  it('vale zero antes da primeira fase', () => {
    expect(mvp(novoEstado('Ana'), CAPITULOS)).toBe(0);
  });

  it('chega a 1000 com todas as fases no máximo e o caixa no azul', () => {
    expect(mvp(com({ nos: { triagem: 400, orcamento: 90, negociacao: 90 } }), CAPITULOS)).toBe(1000);
  });

  it('não passa de 1000 nem com pontuação muito acima da meta', () => {
    expect(mvp(com({ nos: { triagem: 6000, orcamento: 100, negociacao: 100 } }), CAPITULOS)).toBe(1000);
  });

  it('não cresce por jogar mais rodadas com a mesma pontuação', () => {
    const umaVez = com({ nos: { triagem: 200 }, rodadas: 1 });
    expect(mvp({ ...umaVez, rodadas: 500 }, CAPITULOS)).toBe(mvp(umaVez, CAPITULOS));
  });

  it('perde a parcela do caixa com o saldo negativo', () => {
    const nos = { triagem: 400, orcamento: 90, negociacao: 90 };
    expect(mvp(com({ nos, dinheiro: -1 }), CAPITULOS)).toBe(900);
  });
});

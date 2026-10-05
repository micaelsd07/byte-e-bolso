import { describe, expect, it } from 'vitest';
import { cargaCooldown, disponivel, piorOpcao, rodadasRestantes, usarHabilidade } from '../../src/core/habilidades';
import { novoEstado, resolverDecisao } from '../../src/core/partida';
import type { Estado, PassoDecisao } from '../../src/core/tipos';
import { CONQUISTAS, DESCANSO, DICA, FASE, FOCO } from './apoio';

const usar = (estado: Estado, habilidade = DICA): Estado => {
  const uso = usarHabilidade(estado, habilidade);
  if (!uso.ok) throw new Error(uso.motivo);
  return uso.estado;
};

describe('habilidades e cooldown', () => {
  it('começa com todas as habilidades prontas e a barra cheia', () => {
    const estado = novoEstado('Ana', 'f1');
    expect(disponivel(estado, DICA)).toBe(true);
    expect(cargaCooldown(estado, DICA)).toBe(1);
  });

  it('entra em recarga depois do uso e recusa um segundo uso', () => {
    const estado = usar(novoEstado('Ana', 'f1'));
    expect(rodadasRestantes(estado, DICA)).toBe(2);
    expect(cargaCooldown(estado, DICA)).toBe(0);
    expect(usarHabilidade(estado, DICA)).toEqual({ ok: false, motivo: 'recarregando' });
  });

  it('recarrega uma rodada a cada passo resolvido', () => {
    let estado = usar(novoEstado('Ana', 'f1'));
    estado = resolverDecisao(estado, FASE, 'boa', CONQUISTAS)!.estado;
    expect(rodadasRestantes(estado, DICA)).toBe(1);
    expect(cargaCooldown(estado, DICA)).toBe(0.5);
    expect(disponivel(estado, DICA)).toBe(false);

    estado = { ...estado, rodada: estado.rodada + 1 };
    expect(disponivel(estado, DICA)).toBe(true);
  });

  it('mantém a recarga de cada habilidade separada', () => {
    const estado = usar(novoEstado('Ana', 'f1'));
    expect(disponivel(estado, DESCANSO)).toBe(true);
  });

  it('Recuperação devolve energia respeitando o teto de 100', () => {
    const cansado = { ...novoEstado('Ana', 'f1'), atributos: { ...novoEstado('Ana', 'f1').atributos, energia: 30 } };
    expect(usar(cansado, DESCANSO).atributos.energia).toBe(55);
    expect(usar(novoEstado('Ana', 'f1'), DESCANSO).atributos.energia).toBe(100);
  });

  it('Foco total guarda o bônus para o próximo desafio', () => {
    expect(usar(novoEstado('Ana', 'f1'), FOCO).bonusDesafio).toBe(20);
  });

  it('não deixa usar habilidade com a partida encerrada', () => {
    const fim: Estado = { ...novoEstado('Ana', 'f1'), status: 'derrota', motivoDerrota: 'burnout' };
    expect(usarHabilidade(fim, DICA)).toEqual({ ok: false, motivo: 'partidaEncerrada' });
    expect(disponivel(fim, DICA)).toBe(false);
  });

  it('Análise rápida aponta a opção de menor mérito', () => {
    expect(piorOpcao(FASE.passos[0] as PassoDecisao)).toBe('ruim');
  });

  it('Análise rápida não risca nada quando só há duas opções', () => {
    const passo = FASE.passos[0] as PassoDecisao;
    expect(piorOpcao({ ...passo, opcoes: passo.opcoes.slice(0, 2) })).toBeNull();
  });
});

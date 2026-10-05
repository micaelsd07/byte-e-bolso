import { aplicarEfeitos } from './atributos';
import type { EfeitoHabilidade, Estado, Habilidade, PassoDecisao } from './tipos';

export function rodadasRestantes(estado: Estado, habilidade: Habilidade): number {
  const volta = estado.recargas[habilidade.id];
  return volta === undefined ? 0 : Math.max(0, volta - estado.rodada);
}

export function disponivel(estado: Estado, habilidade: Habilidade): boolean {
  return estado.status === 'jogando' && rodadasRestantes(estado, habilidade) === 0;
}

/** Carga da barra de CD, de 0 (acabou de usar) a 1 (pronta). */
export function cargaCooldown(estado: Estado, habilidade: Habilidade): number {
  if (habilidade.cooldown <= 0) return 1;
  return 1 - Math.min(1, rodadasRestantes(estado, habilidade) / habilidade.cooldown);
}

export type UsoHabilidade =
  | { ok: true; estado: Estado; efeito: EfeitoHabilidade }
  | { ok: false; motivo: 'recarregando' | 'partidaEncerrada' };

export function usarHabilidade(estado: Estado, habilidade: Habilidade): UsoHabilidade {
  if (estado.status !== 'jogando') return { ok: false, motivo: 'partidaEncerrada' };
  if (rodadasRestantes(estado, habilidade) > 0) return { ok: false, motivo: 'recarregando' };

  const novo: Estado = {
    ...estado,
    recargas: { ...estado.recargas, [habilidade.id]: estado.rodada + habilidade.cooldown },
  };
  const { efeito } = habilidade;
  if (efeito.tipo === 'energia') {
    novo.atributos = aplicarEfeitos(estado.atributos, { energia: efeito.valor });
  } else if (efeito.tipo === 'bonusDesafio') {
    novo.bonusDesafio = efeito.percentual;
  }
  return { ok: true, estado: novo, efeito };
}

/** Opção que a Análise rápida risca: a de menor mérito (a primeira, em caso de empate). */
export function piorOpcao(passo: PassoDecisao): string | null {
  let pior: PassoDecisao['opcoes'][number] | null = null;
  for (const opcao of passo.opcoes) {
    if (pior === null || opcao.merito < pior.merito) pior = opcao;
  }
  return pior === null || passo.opcoes.length < 3 ? null : pior.id;
}

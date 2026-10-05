import { TRILHAS, fasesDa } from '../content';
import { estrelasDoNo } from '../core/jogo';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';
import { barra } from '../ui/formato';
import { iconeDaTrilha } from '../ui/icones';

export interface AcoesTrilhas {
  escolher(trilhaId: string): void;
}

/** Escolha do que aprender: um bloco por trilha, com o progresso de cada uma. */
export function telaTrilhas(estado: Estado, acoes: AcoesTrilhas): HTMLElement {
  const blocos = TRILHAS.map((trilha) => {
    const fases = fasesDa(trilha);
    const total = fases.length * 3;
    const feitas = fases.reduce<number>((soma, no) => soma + estrelasDoNo(estado, no), 0);
    return h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'trilha relevo', 'data-testid': `trilha-${trilha.id}`, title: trilha.resumo, onclick: () => acoes.escolher(trilha.id) },
        iconeDaTrilha(trilha.id, 'trilha-icone'),
        h('strong', {}, trilha.nome),
        h('span', { class: 'trilha-progresso' }, `${fases.length} fases · ${feitas} de ${total} estrelas`),
        barra(total === 0 ? 0 : feitas / total, `Progresso em ${trilha.nome}`),
      ),
    );
  });

  return h(
    'div',
    { class: 'escolha-trilha' },
    h('div', {}, h('p', { class: 'sobretitulo' }, 'Aprender'), h('h1', { tabindex: -1 }, 'O que você quer aprender?')),
    h('p', { class: 'contexto' }, 'Escolha uma trilha. Dá para trocar quando quiser: o progresso de cada uma fica guardado.'),
    h('ul', { class: 'trilhas' }, ...blocos),
  );
}

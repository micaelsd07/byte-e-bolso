import { UNIDADES } from '../content';
import { nivel } from '../core/jogo';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';
import { dinheiro } from '../ui/formato';
import { icone, type Icone } from '../ui/icones';

export type Aba = 'cidade' | 'empresa' | 'mercado' | 'noticias' | 'perfil';

const ABAS: { id: Aba; rotulo: string; icone: Icone }[] = [
  { id: 'cidade', rotulo: 'Aprender', icone: 'cidade' },
  { id: 'empresa', rotulo: 'Empresa', icone: 'empresa' },
  { id: 'mercado', rotulo: 'Mercado', icone: 'mercado' },
  { id: 'noticias', rotulo: 'Notícias', icone: 'noticias' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
];

/** Moldura das telas fora das fases: personagem, vidas, sequência e caixa em cima; navegação embaixo. */
export function casca(aba: Aba, estado: Estado, conteudo: HTMLElement, ir: (aba: Aba) => void): HTMLElement {
  const negativo = estado.dinheiro < 0;
  return h(
    'div',
    { class: 'tela casca' },
    h(
      'header',
      { class: 'topo' },
      h(
        'button',
        { type: 'button', class: 'jogador', 'aria-label': `Perfil de ${estado.apelido}`, 'data-testid': 'abrir-perfil', onclick: () => ir('perfil') },
        h('span', { class: `avatar av-${estado.avatar}`, 'aria-hidden': 'true' }, icone(estado.avatar as Icone)),
        h('span', { class: 'jogador-texto' }, h('strong', { 'data-testid': 'apelido-atual' }, estado.apelido), h('small', {}, `Nível ${nivel(estado, UNIDADES)}`)),
      ),
      h(
        'div',
        { class: 'pilulas' },
        h('span', { class: estado.vidas > 0 ? 'pilula vida' : 'pilula vida vazia', 'data-testid': 'vidas-totais', 'aria-label': `${estado.vidas} vidas` }, icone('coracao'), String(estado.vidas)),
        h('span', { class: 'pilula fogo', 'data-testid': 'sequencia', 'aria-label': `Sequência de ${estado.sequencia} dias` }, icone('foco'), String(estado.sequencia)),
        h('span', { class: negativo ? 'pilula negativo' : 'pilula', 'data-testid': 'saldo' }, icone('moeda'), dinheiro(estado.dinheiro)),
      ),
    ),
    h('main', { class: 'miolo' }, conteudo),
    h(
      'nav',
      { class: 'abas', 'aria-label': 'Seções do jogo' },
      ...ABAS.map((a) =>
        h(
          'button',
          {
            type: 'button',
            class: a.id === aba ? 'aba ativa' : 'aba',
            'aria-current': a.id === aba ? 'page' : null,
            'data-testid': `aba-${a.id}`,
            onclick: () => ir(a.id),
          },
          icone(a.icone),
          h('span', {}, a.rotulo),
        ),
      ),
    ),
  );
}

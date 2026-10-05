import { participa, posicao, type Colocado } from '../core/ranking';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';
import { icone, type Icone } from '../ui/icones';

export interface AcoesRanking {
  irParaPerfil(): void;
  limpar(): void;
}

/** Ordem em que os três primeiros aparecem no pódio: 2º à esquerda, 1º no meio, 3º à direita. */
const PODIO = [2, 1, 3] as const;

function degrau(lugar: number, colocado: Colocado | undefined, voce: boolean): HTMLElement {
  const classes = ['degrau', `lugar-${lugar}`, voce ? 'voce' : '', colocado === undefined ? 'vago' : ''].filter(Boolean).join(' ');
  return h(
    'li',
    { class: classes, 'data-testid': colocado === undefined ? null : `colocado-${lugar}` },
    colocado === undefined
      ? h('span', { class: 'avatar vazio', 'aria-hidden': 'true' }, '?')
      : h('span', { class: `avatar av-${colocado.avatar}`, 'aria-hidden': 'true' }, icone(colocado.avatar as Icone)),
    h('strong', {}, colocado?.apelido ?? 'Vago'),
    h('span', { class: 'colocado-pontos' }, colocado === undefined ? '' : `${colocado.estrelas} ★`),
    h('b', { class: 'pedestal' }, `${lugar}º`),
  );
}

/**
 * Ranking do aparelho: quem jogou neste navegador, por estrelas. Só aparece para
 * quem escolheu um apelido; quem joga como visitante vê o convite.
 */
export function telaRanking(estado: Estado, ranking: readonly Colocado[], acoes: AcoesRanking): HTMLElement {
  const titulo = h('div', {}, h('p', { class: 'sobretitulo' }, 'Neste aparelho'), h('h1', { tabindex: -1 }, 'Ranking'));
  const nota = h('p', { class: 'ajuda' }, 'O ranking mostra quem jogou neste navegador. Fica guardado só aqui: nada é enviado para fora.');

  if (!participa(estado.apelido)) {
    return h(
      'div',
      { class: 'ranking', 'data-testid': 'ranking' },
      titulo,
      h(
        'section',
        { class: 'relevo bloco' },
        h('p', { class: 'aviso neutro', 'data-testid': 'ranking-convite' }, icone('trofeu'), 'O ranking é de quem tem apelido. Escolha o seu no perfil para ver o pódio e a sua posição.'),
        h('button', { type: 'button', class: 'botao', 'data-testid': 'ir-para-perfil', onclick: () => acoes.irParaPerfil() }, 'Escolher um apelido'),
      ),
      nota,
    );
  }

  const lugar = posicao(ranking, estado.apelido);
  const resto = ranking.slice(3);
  return h(
    'div',
    { class: 'ranking', 'data-testid': 'ranking' },
    titulo,
    h(
      'section',
      { class: 'relevo sua-posicao', 'data-testid': 'minha-posicao' },
      icone('trofeu'),
      lugar === null
        ? h('p', {}, h('strong', {}, 'Você ainda não está no ranking.'), ' Ganhe a primeira estrela para entrar.')
        : h('p', {}, 'Você está em ', h('strong', {}, `${lugar}º lugar`), ` de ${ranking.length}.`),
    ),
    ranking.length === 0
      ? h('p', { class: 'contexto' }, 'Ninguém pontuou neste aparelho ainda. Conclua uma fase para abrir o pódio.')
      : h('ol', { class: 'podio', 'aria-label': 'Pódio' }, ...PODIO.map((n) => degrau(n, ranking[n - 1], ranking[n - 1]?.apelido === estado.apelido))),
    resto.length > 0
      ? h(
          'ol',
          { class: 'colocados', start: 4 },
          ...resto.map((c, i) =>
            h(
              'li',
              { class: c.apelido === estado.apelido ? 'colocado voce' : 'colocado', 'data-testid': `colocado-${i + 4}` },
              h('b', { class: 'lugar' }, `${i + 4}º`),
              h('span', { class: `avatar av-${c.avatar}`, 'aria-hidden': 'true' }, icone(c.avatar as Icone)),
              h('strong', {}, c.apelido),
              h('span', { class: 'colocado-pontos' }, `${c.estrelas} ★`, h('small', {}, `MVP ${c.mvp}`)),
            ),
          ),
        )
      : null,
    nota,
    ranking.length > 0
      ? h(
          'button',
          {
            type: 'button',
            class: 'botao secundario pequeno',
            'data-testid': 'limpar-ranking',
            onclick: () => {
              if (window.confirm('Apagar o ranking deste aparelho?')) acoes.limpar();
            },
          },
          'Limpar ranking',
        )
      : null,
  );
}

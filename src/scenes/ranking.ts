import { participa, posicao, type Colocado, type ColocadoOnline } from '../core/ranking';
import type { Estado } from '../core/tipos';
import { buscarRankingOnline, participaOnline, rankingOnlineDisponivel } from '../services/rankingOnline';
import { h } from '../ui/dom';
import { icone, type Icone } from '../ui/icones';

export interface AcoesRanking {
  irParaPerfil(): void;
  limpar(): void;
  /** Entra no ranking online e envia a pontuação atual. */
  entrarOnline(): void;
  /** Apaga a pontuação do banco e para de enviar. */
  sairOnline(): void;
}

type Visao = 'aparelho' | 'online';
/** A visão escolhida vale enquanto o jogo estiver aberto, mesmo trocando de aba. */
let visao: Visao = 'aparelho';

/** Ordem em que os três primeiros aparecem no pódio: 2º à esquerda, 1º no meio, 3º à direita. */
const PODIO = [2, 1, 3] as const;

function degrau(lugar: number, colocado: ColocadoOnline | undefined): HTMLElement {
  const classes = ['degrau', `lugar-${lugar}`, colocado?.voce ? 'voce' : '', colocado === undefined ? 'vago' : ''].filter(Boolean).join(' ');
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

/** A posição do jogador, o pódio e a lista do 4º lugar em diante. Serve às duas visões. */
function quadro(lista: readonly ColocadoOnline[], lugar: number | null, total: number, vazio: string): HTMLElement[] {
  const resto = lista.slice(3);
  const partes: (HTMLElement | null)[] = [
    h(
      'section',
      { class: 'relevo sua-posicao', 'data-testid': 'minha-posicao' },
      icone('trofeu'),
      lugar === null
        ? h('p', {}, h('strong', {}, 'Você ainda não está neste ranking.'), ' ', vazio)
        : h('p', {}, 'Você está em ', h('strong', {}, `${lugar}º lugar`), ` de ${total}.`),
    ),
    lista.length === 0
      ? h('p', { class: 'contexto' }, 'Ninguém pontuou aqui ainda.')
      : h('ol', { class: 'podio', 'aria-label': 'Pódio' }, ...PODIO.map((n) => degrau(n, lista[n - 1]))),
    resto.length > 0
      ? h(
          'ol',
          { class: 'colocados', start: 4 },
          ...resto.map((c, i) =>
            h(
              'li',
              { class: c.voce ? 'colocado voce' : 'colocado', 'data-testid': `colocado-${i + 4}` },
              h('b', { class: 'lugar' }, `${i + 4}º`),
              h('span', { class: `avatar av-${c.avatar}`, 'aria-hidden': 'true' }, icone(c.avatar as Icone)),
              h('strong', {}, c.apelido),
              h('span', { class: 'colocado-pontos' }, `${c.estrelas} ★`, h('small', {}, `MVP ${c.mvp}`)),
            ),
          ),
        )
      : null,
  ];
  return partes.filter((p): p is HTMLElement => p !== null);
}

/**
 * Ranking: quem jogou neste aparelho e, para quem escolher entrar, o ranking
 * online. Só aparece para quem tem apelido; quem joga como visitante vê o convite.
 */
export function telaRanking(estado: Estado, ranking: readonly Colocado[], acoes: AcoesRanking): HTMLElement {
  const titulo = h('div', {}, h('p', { class: 'sobretitulo' }, 'Quem está na frente'), h('h1', { tabindex: -1 }, 'Ranking'));

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
    );
  }

  const corpo = h('div', { class: 'ranking-corpo' });
  const raiz = h('div', { class: 'ranking', 'data-testid': 'ranking' }, titulo);

  function doAparelho(): void {
    const lista = ranking.map((c) => ({ ...c, voce: c.apelido === estado.apelido }));
    corpo.replaceChildren(
      ...quadro(lista, posicao(ranking, estado.apelido), ranking.length, 'Ganhe a primeira estrela para entrar.'),
      h('p', { class: 'ajuda' }, 'Mostra quem jogou neste navegador. Fica guardado só aqui: nada é enviado para fora.'),
      ...(ranking.length > 0
        ? [
            h(
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
            ),
          ]
        : []),
    );
  }

  function online(): void {
    if (!rankingOnlineDisponivel()) {
      corpo.replaceChildren(h('p', { class: 'aviso neutro', 'data-testid': 'online-indisponivel' }, icone('trofeu'), 'O ranking online não está ligado nesta versão do jogo. O ranking do aparelho funciona normalmente.'));
      return;
    }
    const dentro = participaOnline();
    const adesao = dentro
      ? h(
          'section',
          { class: 'relevo bloco' },
          h('p', { class: 'ajuda' }, 'Você está no ranking online. A cada fase concluída, o jogo envia o seu apelido, o personagem, as estrelas e o MVP. Nada mais.'),
          h(
            'button',
            {
              type: 'button',
              class: 'botao secundario pequeno',
              'data-testid': 'sair-online',
              onclick: () => {
                if (window.confirm('Sair do ranking online e apagar a sua pontuação de lá?')) acoes.sairOnline();
              },
            },
            'Sair do ranking online',
          ),
        )
      : h(
          'section',
          { class: 'relevo bloco' },
          h('p', {}, 'Entrar no ranking online é opcional e não pede cadastro.'),
          h('p', { class: 'ajuda' }, 'O jogo envia só o apelido, o personagem, as estrelas e o MVP, que ficam visíveis para todos. Não use o seu nome completo como apelido. Dá para sair quando quiser, e a pontuação é apagada.'),
          h('button', { type: 'button', class: 'botao', 'data-testid': 'entrar-online', onclick: () => acoes.entrarOnline() }, `Entrar como ${estado.apelido}`),
        );

    const lista = h('div', { class: 'ranking-corpo', 'aria-live': 'polite' }, h('p', { class: 'carregando' }, 'Buscando o ranking…'));
    corpo.replaceChildren(adesao, lista);
    void buscarRankingOnline().then((resultado) => {
      if (!lista.isConnected) return;
      if (resultado === null) {
        lista.replaceChildren(h('p', { class: 'aviso', 'data-testid': 'online-offline' }, 'Sem conexão com o ranking online agora. Tente de novo mais tarde.'));
        return;
      }
      lista.replaceChildren(...quadro(resultado.colocados, resultado.posicao, resultado.total, dentro ? 'Conclua uma fase para aparecer.' : 'Entre no ranking online para aparecer.'));
    });
  }

  const botoes = (['aparelho', 'online'] as const).map((qual) =>
    h(
      'button',
      {
        type: 'button',
        class: 'visao',
        role: 'tab',
        'data-testid': `ranking-${qual}`,
        onclick: () => {
          visao = qual;
          mostrar();
        },
      },
      qual === 'aparelho' ? 'Neste aparelho' : 'Online',
    ),
  );

  function mostrar(): void {
    botoes.forEach((b, i) => {
      const ativa = (i === 0 ? 'aparelho' : 'online') === visao;
      b.classList.toggle('ativa', ativa);
      b.setAttribute('aria-selected', String(ativa));
    });
    if (visao === 'online') online();
    else doAparelho();
  }

  raiz.append(h('div', { class: 'visoes', role: 'tablist', 'aria-label': 'Qual ranking mostrar' }, ...botoes), corpo);
  mostrar();
  return raiz;
}

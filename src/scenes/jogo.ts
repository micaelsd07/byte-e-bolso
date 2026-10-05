import { CONQUISTAS, HABILIDADES } from '../content';
import { LIMITES } from '../core/atributos';
import { cargaCooldown, disponivel, rodadasRestantes } from '../core/habilidades';
import { mvpScore } from '../core/mvp';
import { avaliarOrcamento } from '../core/orcamento';
import { passoAtual } from '../core/partida';
import { progressoNivel } from '../core/progressao';
import {
  ATRIBUTOS,
  type Estado,
  type Fase,
  type Feedback,
  type Habilidade,
  type PassoDecisao,
  type PassoOrcamento,
} from '../core/tipos';
import { h, vibrar } from '../ui/dom';
import { ROTULO_ATRIBUTO, ROTULO_CATEGORIA, ROTULO_CLASSE, barra, dinheiro, extrato } from '../ui/formato';

export interface VisaoJogo {
  estado: Estado;
  fase: Fase;
  feedback: Feedback | null;
  dica: string | null;
  riscada: string | null;
  /** Itens marcados no orçamento. Mora fora da cena para sobreviver a um novo render. */
  selecao: Set<string>;
}

export interface AcoesJogo {
  escolher(opcaoId: string): void;
  fecharOrcamento(): void;
  usar(habilidadeId: string): void;
  continuar(): void;
}

function hud(estado: Estado, fase: Fase, emFeedback: boolean): HTMLElement {
  const { nivel } = progressoNivel(estado.xp);
  const feitos = Math.min(fase.passos.length, emFeedback ? estado.passo : estado.passo + 1);
  const item = (rotulo: string, valor: string, id: string) =>
    h('div', { class: 'hud-item' }, h('span', { class: 'hud-rotulo' }, rotulo), h('span', { class: 'num', 'data-testid': id }, valor));

  return h(
    'header',
    { class: 'hud' },
    h(
      'div',
      { class: 'hud-linha' },
      item('Dinheiro', dinheiro(estado.atributos.dinheiro), 'hud-dinheiro'),
      item('Energia', `${estado.atributos.energia}%`, 'hud-energia'),
      item('Nível', String(nivel), 'hud-nivel'),
      item('MVP', String(mvpScore(estado, CONQUISTAS.length)), 'hud-mvp'),
    ),
    h(
      'div',
      { class: 'hud-fase' },
      h('span', {}, `Fase ${fase.numero} · ${fase.titulo}`),
      h('span', { class: 'num', 'data-testid': 'progresso' }, `${feitos}/${fase.passos.length}`),
    ),
    barra(estado.passo / fase.passos.length, 'Progresso da fase', 'fina'),
  );
}

function painelAtributos(estado: Estado): HTMLElement {
  const linhas = ATRIBUTOS.filter((a) => a !== 'dinheiro').map((a) =>
    h(
      'li',
      { class: 'atributo' },
      h('span', {}, ROTULO_ATRIBUTO[a]),
      h('span', { class: 'num' }, String(estado.atributos[a])),
      barra(estado.atributos[a] / LIMITES[a].max, ROTULO_ATRIBUTO[a], 'fina'),
    ),
  );
  return h(
    'details',
    // No desktop há espaço para a coluna lateral aberta; no celular ela fica recolhida.
    { class: 'atributos', open: window.matchMedia('(min-width: 960px)').matches },
    h('summary', {}, 'Seus atributos'),
    h('ul', {}, ...linhas),
  );
}

function decisao(passo: PassoDecisao, visao: VisaoJogo, acoes: AcoesJogo): HTMLElement {
  const opcoes = passo.opcoes.map((opcao) => {
    const riscada = visao.riscada === opcao.id;
    return h(
      'li',
      {},
      h(
        'button',
        {
          type: 'button',
          class: riscada ? 'opcao riscada' : 'opcao',
          disabled: riscada,
          'data-testid': `opcao-${opcao.id}`,
          onclick: () => {
            vibrar();
            acoes.escolher(opcao.id);
          },
        },
        opcao.texto,
        riscada ? h('span', { class: 'opcao-nota' }, 'Descartada pela Análise rápida') : null,
      ),
    );
  });
  return h('ul', { class: 'opcoes' }, ...opcoes);
}

function orcamento(passo: PassoOrcamento, visao: VisaoJogo, acoes: AcoesJogo): HTMLElement {
  const resumo = h('div', { class: 'orcamento-resumo', 'aria-live': 'polite' });

  const atualizar = (): void => {
    const { total, sobra } = avaliarOrcamento(passo, [...visao.selecao]);
    resumo.replaceChildren(
      h('div', {}, h('span', {}, 'Renda'), h('span', { class: 'num' }, dinheiro(passo.renda))),
      h('div', {}, h('span', {}, 'Marcado'), h('span', { class: 'num', 'data-testid': 'orcamento-total' }, dinheiro(total))),
      h(
        'div',
        { class: sobra < 0 ? 'negativo' : '' },
        h('span', {}, sobra < 0 ? 'Faltam' : 'Sobra'),
        h('span', { class: 'num', 'data-testid': 'orcamento-sobra' }, dinheiro(Math.abs(sobra))),
      ),
      h('p', { class: 'ajuda' }, `Meta de reserva: ${dinheiro(passo.metaReserva)}`),
    );
  };

  const itens = passo.itens.map((item) => {
    const caixa = h('input', {
      type: 'checkbox',
      checked: visao.selecao.has(item.id),
      'data-testid': `item-${item.id}`,
      onchange: () => {
        if (caixa.checked) visao.selecao.add(item.id);
        else visao.selecao.delete(item.id);
        atualizar();
      },
    });
    return h(
      'li',
      {},
      h(
        'label',
        { class: 'item-orcamento' },
        caixa,
        h('span', { class: 'item-nome' }, item.nome, h('span', { class: `selo ${item.classe}` }, ROTULO_CLASSE[item.classe])),
        h('span', { class: 'num' }, dinheiro(item.valor)),
      ),
    );
  });

  atualizar();
  return h(
    'div',
    { class: 'orcamento' },
    h('ul', { class: 'itens-orcamento' }, ...itens),
    resumo,
    h(
      'button',
      {
        type: 'button',
        class: 'botao',
        'data-testid': 'fechar-orcamento',
        onclick: () => {
          vibrar();
          acoes.fecharOrcamento();
        },
      },
      'Fechar orçamento',
    ),
  );
}

function botaoHabilidade(habilidade: Habilidade, visao: VisaoJogo, acoes: AcoesJogo): HTMLElement {
  const { estado } = visao;
  const passo = passoAtual(estado, visao.fase);
  const restantes = rodadasRestantes(estado, habilidade);
  // Análise rápida só faz sentido em decisão; Foco total, só antes de um desafio.
  const semAlvo =
    (habilidade.efeito.tipo === 'eliminarPior' && passo?.tipo !== 'decisao') ||
    (habilidade.efeito.tipo === 'dica' && visao.dica !== null) ||
    (habilidade.efeito.tipo === 'energia' && estado.atributos.energia >= LIMITES.energia.max) ||
    (habilidade.efeito.tipo === 'bonusDesafio' && estado.bonusDesafio > 0);
  const pronta = disponivel(estado, habilidade) && !semAlvo;
  const situacao = restantes > 0 ? `${restantes} ${restantes === 1 ? 'rodada' : 'rodadas'}` : pronta ? 'Pronta' : 'Sem uso';

  return h(
    'button',
    {
      type: 'button',
      class: 'habilidade',
      disabled: !pronta,
      title: habilidade.descricao,
      'aria-label': `${habilidade.nome}. ${habilidade.descricao} ${situacao}.`,
      'data-testid': `habilidade-${habilidade.id}`,
      onclick: () => acoes.usar(habilidade.id),
    },
    h('span', { class: 'habilidade-nome' }, habilidade.nome),
    barra(cargaCooldown(estado, habilidade), `Recarga de ${habilidade.nome}`, 'cd'),
    h('span', { class: 'habilidade-situacao num' }, situacao),
  );
}

function painelFeedback(feedback: Feedback, acoes: AcoesJogo): HTMLElement {
  const conquistas = feedback.conquistasNovas
    .map((id) => CONQUISTAS.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  return h(
    'section',
    { class: 'cartao resultado', 'aria-live': 'polite', 'data-testid': 'feedback' },
    h('p', { class: 'sobretitulo' }, feedback.detalhes.length > 0 ? 'Resultado do desafio' : 'Você escolheu'),
    h('h1', { tabindex: -1 }, feedback.titulo),
    extrato(feedback.efeitos),
    feedback.detalhes.length > 0 ? h('ul', { class: 'detalhes' }, ...feedback.detalhes.map((d) => h('li', {}, d))) : null,
    h('div', { class: 'aprendizado' }, h('h2', {}, 'Aprendizado'), h('p', {}, feedback.aprendizado)),
    h('p', { class: 'xp num' }, `+ ${feedback.xp} XP`),
    feedback.alerta !== null ? h('p', { class: 'alerta', role: 'alert' }, feedback.alerta) : null,
    ...conquistas.map((c) => h('p', { class: 'conquista-nova' }, h('strong', {}, `Conquista: ${c.titulo}. `), c.descricao)),
    h('button', { type: 'button', class: 'botao', 'data-testid': 'continuar', onclick: () => acoes.continuar() }, 'Continuar'),
  );
}

export function telaJogo(visao: VisaoJogo, acoes: AcoesJogo): HTMLElement {
  const { estado, fase, feedback } = visao;
  const passo = passoAtual(estado, fase);

  let corpo: HTMLElement;
  if (feedback !== null) {
    corpo = painelFeedback(feedback, acoes);
  } else if (passo !== null) {
    corpo = h(
      'section',
      { class: 'cartao passo', 'data-testid': `passo-${passo.id}` },
      h('p', { class: 'sobretitulo' }, ROTULO_CATEGORIA[passo.categoria]),
      h('h1', { tabindex: -1 }, passo.titulo),
      h('p', { class: 'contexto' }, passo.contexto),
      visao.dica !== null ? h('p', { class: 'dica', 'data-testid': 'dica' }, h('strong', {}, 'Dica: '), visao.dica) : null,
      estado.bonusDesafio > 0 && passo.tipo !== 'decisao'
        ? h('p', { class: 'dica' }, `Foco total ativo: este desafio vale ${estado.bonusDesafio}% a mais.`)
        : null,
      passo.tipo === 'decisao' ? decisao(passo, visao, acoes) : orcamento(passo, visao, acoes),
    );
  } else {
    corpo = h('section', { class: 'cartao' }, h('h1', { tabindex: -1 }, 'Fase encerrada'));
  }

  return h(
    'div',
    { class: 'tela jogo' },
    hud(estado, fase, feedback !== null),
    h('main', { class: 'jogo-corpo' }, corpo, painelAtributos(estado)),
    feedback === null && passo !== null
      ? h(
          'nav',
          { class: 'habilidades', 'aria-label': 'Habilidades' },
          ...HABILIDADES.map((hab) => botaoHabilidade(hab, visao, acoes)),
        )
      : null,
  );
}

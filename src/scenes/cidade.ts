import { CUSTO_RECARGA, desbloqueado, estrelasDoNo, proximoNo } from '../core/jogo';
import type { Dificuldade, Estado, No, Trilha } from '../core/tipos';
import { aoEntrar, h } from '../ui/dom';
import { ROTULO_CATEGORIA, barra, dinheiro, estrelas } from '../ui/formato';
import { icone, type Icone } from '../ui/icones';

export type Lugar = 'empresa' | 'mercado' | 'cambio' | 'noticias';

export interface AcoesCidade {
  jogar(noId: string): void;
  visitar(lugar: Lugar): void;
  trocarTrilha(): void;
  verUnidade(indice: number): void;
  recarregarVidas(): void;
}

const LUGARES: { id: Lugar; texto: string; icone: Icone }[] = [
  { id: 'empresa', texto: 'Empresa', icone: 'empresa' },
  { id: 'mercado', texto: 'Bolsa', icone: 'mercado' },
  { id: 'cambio', texto: 'Câmbio', icone: 'cambio' },
  { id: 'noticias', texto: 'Notícias', icone: 'noticias' },
];

/** Prova é uma lição com relógio: ganha nome e ícone próprios na lista. */
const ehProva = (no: No): boolean => no.tipo === 'licao' && no.tempo !== undefined;

function rotuloDoTipo(no: No): string {
  if (ehProva(no)) return 'Prova cronometrada';
  if (no.tipo === 'licao') return 'Lição';
  if (no.tipo === 'triagem') return 'Fase relâmpago';
  return no.tipo === 'orcamento' ? 'Quebra-cabeça' : 'Disputa';
}

export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** Fases da trilha: uma unidade por vez, com as fases em lista e a escolhida aberta. */
export function telaCidade(estado: Estado, trilha: Trilha, unidadeVista: number | null, acoes: AcoesCidade): HTMLElement {
  const unidades = trilha.unidades;
  const atual = proximoNo(estado, unidades);
  // Sem escolha do jogador, abre a unidade onde está a próxima fase a jogar.
  const daProxima = unidades.findIndex((u) => u.nos.some((n) => n.id === atual?.id));
  const indiceDaUnidade = Math.min(unidades.length - 1, Math.max(0, unidadeVista ?? (daProxima >= 0 ? daProxima : unidades.length - 1)));
  const unidade = unidades[indiceDaUnidade]!;
  const fases = unidade.nos;
  let selecionado: No = fases.find((n) => n.id === atual?.id) ?? fases[0]!;

  const ficha = h('div', { class: 'ficha', 'aria-live': 'polite' });

  const itens = fases.map((no, indice) => {
    const aberto = desbloqueado(estado, unidades, no.id);
    const conquistadas = estrelasDoNo(estado, no);
    const classes = ['parada', ehProva(no) || no.tipo === 'negociacao' ? 'chefe' : '', aberto ? '' : 'fechada', atual?.id === no.id ? 'atual' : '', conquistadas > 0 ? 'feita' : '']
      .filter(Boolean)
      .join(' ');
    let marca: HTMLElement;
    if (!aberto) marca = icone('cadeado');
    else if (conquistadas > 0) marca = icone('certo');
    else if (ehProva(no)) marca = icone('relogio');
    else if (no.tipo === 'negociacao') marca = icone('trofeu');
    else marca = h('b', {}, String(indice + 1));

    const botao = h(
      'button',
      {
        type: 'button',
        class: classes,
        'data-testid': `parada-${no.id}`,
        'aria-label': `Fase ${indice + 1}: ${no.titulo}. ${aberto ? `${conquistadas} de 3 estrelas` : 'Bloqueada'}`,
        onclick: () => selecionar(indice),
      },
      h('span', { class: 'bolha' }, marca),
      h('span', { class: 'parada-texto' }, h('strong', {}, no.titulo), h('small', {}, no.tipo === 'licao' ? `${rotuloDoTipo(no)} · ${no.exercicios.length} exercícios` : rotuloDoTipo(no))),
      aberto ? estrelas(conquistadas, 'mini') : null,
    );
    return h('li', { class: 'fase-item' }, botao);
  });

  function selecionar(indice: number): void {
    selecionado = fases[indice]!;
    itens.forEach((item, i) => item.classList.toggle('escolhida', i === indice));
    desenharFicha();
    // A ficha abre logo abaixo da fase escolhida.
    itens[indice]!.append(ficha);
  }

  function desenharFicha(): void {
    const no = selecionado;
    const aberto = desbloqueado(estado, unidades, no.id);
    const recorde = estado.nos[no.id];
    // Lição gasta vida a cada erro: sem vida, não dá para começar.
    const semVidas = no.tipo === 'licao' && estado.vidas <= 0;
    let acao: HTMLElement;
    if (!aberto) {
      acao = h('p', { class: 'aviso' }, icone('cadeado'), 'Ganhe 1 estrela na fase anterior para abrir esta.');
    } else if (semVidas) {
      acao = h(
        'div',
        { class: 'sem-vidas' },
        h('p', { class: 'aviso' }, icone('coracao'), 'Você está sem vidas. Elas voltam amanhã, ou você recarrega agora.'),
        h(
          'button',
          { type: 'button', class: 'botao', 'data-testid': 'recarregar', disabled: estado.dinheiro < CUSTO_RECARGA, onclick: () => acoes.recarregarVidas() },
          estado.dinheiro < CUSTO_RECARGA ? `Recarga custa ${dinheiro(CUSTO_RECARGA)}` : `Recarregar vidas por ${dinheiro(CUSTO_RECARGA)}`,
        ),
      );
    } else {
      acao = h('button', { type: 'button', class: 'botao brilho', 'data-testid': 'jogar', onclick: () => acoes.jogar(no.id) }, recorde !== undefined ? 'Jogar de novo' : 'Jogar');
    }
    ficha.replaceChildren(
      h('div', { class: 'ficha-topo' }, h('span', { class: `selo cat-${no.categoria}` }, ROTULO_CATEGORIA[no.categoria]), h('span', { class: 'selo' }, rotuloDoTipo(no))),
      h('h2', { 'data-testid': 'ficha-titulo' }, `${fases.indexOf(no) + 1}. ${no.titulo}`),
      h('p', {}, no.resumo),
      h(
        'p',
        { class: 'ficha-detalhe' },
        no.tipo === 'negociacao' ? 'Vale o preço que você fechar' : `Vale até ${dinheiro(no.recompensa)}`,
        recorde !== undefined ? ` · Seu recorde: ${recorde} pontos` : '',
      ),
      acao,
    );
  }
  selecionar(fases.indexOf(selecionado));

  const totalDaUnidade = fases.length * 3;
  const feitasNaUnidade = fases.reduce<number>((s, n) => s + estrelasDoNo(estado, n), 0);

  const abas = unidades.map((u, i) => {
    const aberta = desbloqueado(estado, unidades, u.nos[0]!.id);
    const total = u.nos.length * 3;
    const feitas = u.nos.reduce<number>((s, n) => s + estrelasDoNo(estado, n), 0);
    return h(
      'button',
      {
        type: 'button',
        class: i === indiceDaUnidade ? 'unidade ativa' : 'unidade',
        'aria-current': i === indiceDaUnidade ? 'true' : null,
        'data-testid': `unidade-${i + 1}`,
        onclick: () => acoes.verUnidade(i),
      },
      h('span', { class: `selo dif-${u.dificuldade}` }, aberta ? ROTULO_DIFICULDADE[u.dificuldade] : 'Fechada'),
      h('strong', {}, `${i + 1}. ${u.titulo}`),
      h('small', {}, `${feitas}/${total} estrelas`),
    );
  });

  const raiz = h(
    'div',
    { class: 'cidade' },
    h(
      'div',
      { class: 'cidade-titulo' },
      h('div', {}, h('p', { class: 'sobretitulo' }, `${trilha.nome} · Unidade ${indiceDaUnidade + 1} de ${unidades.length}`), h('h1', { tabindex: -1 }, unidade.titulo)),
      h('button', { type: 'button', class: 'redondo', 'aria-label': 'Trocar trilha', title: 'Trocar trilha', 'data-testid': 'trocar-trilha', onclick: () => acoes.trocarTrilha() }, icone('grade')),
    ),
    unidades.length > 1 ? h('nav', { class: 'unidades', 'aria-label': 'Unidades da trilha' }, ...abas) : null,
    h(
      'section',
      { class: 'relevo unidade-resumo' },
      h('p', {}, unidade.resumo),
      barra(feitasNaUnidade / totalDaUnidade, 'Progresso na unidade'),
      h('small', {}, `${feitasNaUnidade} de ${totalDaUnidade} estrelas nesta unidade`),
    ),
    h('ol', { class: 'fases' }, ...itens),
    h(
      'nav',
      { class: 'atalhos', 'aria-label': 'Fora das lições' },
      ...LUGARES.map((lugar) =>
        h('button', { type: 'button', class: `atalho relevo atalho-${lugar.id}`, 'data-testid': `lugar-${lugar.id}`, onclick: () => acoes.visitar(lugar.id) }, icone(lugar.icone), h('span', {}, lugar.texto)),
      ),
    ),
  );

  // A fase da vez pode estar no fim da lista: a tela já abre com ela à vista.
  const daVez = fases.indexOf(selecionado);
  if (daVez > 0) aoEntrar(raiz, () => itens[daVez]!.scrollIntoView({ block: 'center' }));
  return raiz;
}

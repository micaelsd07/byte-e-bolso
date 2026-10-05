import { CUSTO_RECARGA, desbloqueado, estrelasDoNo, proximoNo } from '../core/jogo';
import type { Dificuldade, Estado, No, Trilha } from '../core/tipos';
import { LUGARES, PARADAS, svgCidade, type Lugar } from '../ui/cidade';
import { h } from '../ui/dom';
import { ROTULO_CATEGORIA, dinheiro, estrelas } from '../ui/formato';
import { icone, type Icone } from '../ui/icones';

export interface AcoesCidade {
  jogar(noId: string): void;
  visitar(lugar: Lugar): void;
  trocarTrilha(): void;
  verUnidade(indice: number): void;
  recarregarVidas(): void;
}

const ROTULO_LUGAR: Record<Lugar, { texto: string; icone: Icone }> = {
  empresa: { texto: 'Sua empresa', icone: 'empresa' },
  mercado: { texto: 'Bolsa', icone: 'mercado' },
  cambio: { texto: 'Câmbio', icone: 'cambio' },
  noticias: { texto: 'Notícias', icone: 'noticias' },
};

const ROTULO_TIPO: Record<No['tipo'], string> = {
  triagem: 'Fase relâmpago',
  orcamento: 'Quebra-cabeça',
  negociacao: 'Disputa',
  licao: 'Lição',
};

export const ROTULO_DIFICULDADE: Record<Dificuldade, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

/** Mapa da trilha: uma unidade por vez, com as fases sobre a rua da cidade. */
export function telaCidade(estado: Estado, trilha: Trilha, unidadeVista: number | null, acoes: AcoesCidade): HTMLElement {
  const unidades = trilha.unidades;
  const atual = proximoNo(estado, unidades);
  // Sem escolha do jogador, abre a unidade onde está a próxima fase a jogar.
  const daProxima = unidades.findIndex((u) => u.nos.some((n) => n.id === atual?.id));
  const indiceDaUnidade = Math.min(unidades.length - 1, Math.max(0, unidadeVista ?? (daProxima >= 0 ? daProxima : unidades.length - 1)));
  const unidade = unidades[indiceDaUnidade]!;
  const fases = unidade.nos.slice(0, PARADAS.length);
  let selecionado: No = fases.find((n) => n.id === atual?.id) ?? fases[0]!;

  const ficha = h('section', { class: 'ficha relevo', 'aria-live': 'polite' });
  const mapa = h('div', { class: 'mapa' });
  mapa.innerHTML = svgCidade();

  const marcadores = fases.map((no, indice) => {
    const aberto = desbloqueado(estado, unidades, no.id);
    const conquistadas = estrelasDoNo(estado, no);
    const classes = ['parada', no.tipo === 'negociacao' ? 'chefe' : '', aberto ? '' : 'fechada', atual?.id === no.id ? 'atual' : '', conquistadas > 0 ? 'feita' : '']
      .filter(Boolean)
      .join(' ');
    const botao = h(
      'button',
      {
        type: 'button',
        class: classes,
        'data-testid': `parada-${no.id}`,
        'aria-label': `Fase ${indice + 1}: ${no.titulo}. ${aberto ? `${conquistadas} de 3 estrelas` : 'Bloqueada'}`,
        onclick: () => {
          selecionado = no;
          desenharFicha();
          for (const m of marcadores) m.classList.toggle('escolhida', m === botao);
        },
      },
      aberto ? h('b', {}, String(indice + 1)) : icone('cadeado'),
      conquistadas > 0 ? estrelas(conquistadas, 'mini') : null,
    );
    botao.style.left = `${PARADAS[indice]!.x}%`;
    botao.style.top = `${PARADAS[indice]!.y}%`;
    if (no.id === selecionado.id) botao.classList.add('escolhida');
    return botao;
  });

  const placas = (Object.keys(LUGARES) as Lugar[]).map((lugar) => {
    const placa = h(
      'button',
      { type: 'button', class: `placa placa-${lugar}`, 'data-testid': `lugar-${lugar}`, onclick: () => acoes.visitar(lugar) },
      icone(ROTULO_LUGAR[lugar].icone),
      h('span', {}, ROTULO_LUGAR[lugar].texto),
    );
    placa.style.left = `${LUGARES[lugar].x}%`;
    placa.style.top = `${LUGARES[lugar].y}%`;
    return placa;
  });
  mapa.append(...placas, ...marcadores);

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
      acao = h('button', { type: 'button', class: 'botao', 'data-testid': 'jogar', onclick: () => acoes.jogar(no.id) }, recorde !== undefined ? 'Jogar de novo' : 'Jogar');
    }
    ficha.replaceChildren(
      h(
        'div',
        { class: 'ficha-topo' },
        h('span', { class: `selo cat-${no.categoria}` }, ROTULO_CATEGORIA[no.categoria]),
        h('span', { class: 'selo' }, ROTULO_TIPO[no.tipo]),
        estrelas(estrelasDoNo(estado, no)),
      ),
      h('h2', { 'data-testid': 'ficha-titulo' }, `${fases.indexOf(no) + 1}. ${no.titulo}`),
      h('p', {}, no.resumo),
      h(
        'p',
        { class: 'ficha-detalhe' },
        no.tipo === 'negociacao' ? 'Vale o preço que você fechar' : `Vale até ${dinheiro(no.recompensa)}`,
        no.tipo === 'licao' ? ` · ${no.exercicios.length} exercícios` : '',
        recorde !== undefined ? ` · Seu recorde: ${recorde} pontos` : '',
      ),
      acao,
    );
  }
  desenharFicha();

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

  return h(
    'div',
    { class: 'cidade' },
    h(
      'div',
      { class: 'cidade-titulo' },
      h('div', {}, h('p', { class: 'sobretitulo' }, `${trilha.nome} · Unidade ${indiceDaUnidade + 1} de ${unidades.length}`), h('h1', { tabindex: -1 }, unidade.titulo)),
      h('button', { type: 'button', class: 'trocar', 'data-testid': 'trocar-trilha', onclick: () => acoes.trocarTrilha() }, 'Trocar trilha'),
    ),
    unidades.length > 1 ? h('nav', { class: 'unidades', 'aria-label': 'Unidades da trilha' }, ...abas) : null,
    h('div', { class: 'moldura relevo' }, mapa),
    ficha,
  );
}

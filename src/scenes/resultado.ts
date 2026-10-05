import type { Fechamento } from '../core/jogo';
import type { No } from '../core/tipos';
import { aoEntrar, h } from '../ui/dom';
import { confete, contar } from '../ui/efeitos';
import { dinheiro, estrelas } from '../ui/formato';

export interface Revisao {
  titulo: string;
  itens: string[];
}

export interface DadosResultado {
  no: No;
  fechamento: Fechamento;
  revisao: Revisao | null;
  aprendizado: string | null;
  /** Próxima fase, se já estiver aberta. */
  seguinte: No | null;
}

export interface AcoesResultado {
  proxima(noId: string): void;
  repetir(): void;
  cidade(): void;
}

const TITULO = ['Não foi desta vez', 'Fase concluída', 'Muito bem!', 'Perfeito!'] as const;

export function telaResultado(dados: DadosResultado, acoes: AcoesResultado): HTMLElement {
  const { no, fechamento, revisao, aprendizado, seguinte } = dados;
  const saldo = h('b', { 'data-testid': 'resultado-saldo' }, dinheiro(fechamento.saldoAntes));
  const linha = (rotulo: string, valor: number, classe: string): HTMLElement =>
    h('li', { class: classe }, h('span', {}, rotulo), h('b', {}, `${valor >= 0 ? '+ ' : '− '}${dinheiro(Math.abs(valor))}`));

  const raiz = h(
    'main',
    { class: 'tela resultado', 'data-testid': 'tela-resultado' },
    h('p', { class: 'sobretitulo' }, no.titulo),
    h('h1', { tabindex: -1, 'data-testid': 'resultado-titulo' }, TITULO[fechamento.estrelas]),
    estrelas(fechamento.estrelas, 'grande'),
    h(
      'p',
      { class: 'resultado-pontos' },
      h('b', { 'data-testid': 'resultado-pontos' }, String(fechamento.pontos)),
      ' pontos',
      fechamento.recorde ? h('span', { class: 'selo recorde' }, 'Novo recorde') : null,
    ),
    h(
      'section',
      { class: 'relevo caixa' },
      h('h2', {}, 'Caixa da empresa'),
      h(
        'ul',
        {},
        linha(no.tipo === 'negociacao' ? 'Preço fechado' : 'Ganho da fase', fechamento.ganho, 'entra'),
        linha('Contas da semana', -fechamento.custos, 'sai'),
        fechamento.juros > 0 ? linha('Juros do saldo negativo', -fechamento.juros, 'sai') : null,
        h('li', { class: fechamento.saldo < 0 ? 'total negativo' : 'total' }, h('span', {}, 'Saldo'), saldo),
      ),
      fechamento.saldo < 0
        ? h('p', { class: 'aviso' }, 'Saldo negativo cobra 8% de juros a cada rodada e trava as compras. Jogue bem a próxima fase para sair do vermelho.')
        : null,
    ),
    aprendizado !== null ? h('section', { class: 'relevo aprendizado' }, h('h2', {}, 'Aprendizado'), h('p', {}, aprendizado)) : null,
    revisao !== null && revisao.itens.length > 0
      ? h('section', { class: 'relevo revisao' }, h('h2', {}, revisao.titulo), h('ul', {}, ...revisao.itens.map((i) => h('li', {}, i))))
      : null,
    h(
      'div',
      { class: 'acoes' },
      seguinte !== null
        ? h('button', { type: 'button', class: 'botao', 'data-testid': 'proxima', onclick: () => acoes.proxima(seguinte.id) }, `Próxima: ${seguinte.titulo}`)
        : null,
      h('button', { type: 'button', class: seguinte !== null ? 'botao secundario' : 'botao', 'data-testid': 'repetir', onclick: acoes.repetir }, 'Jogar de novo'),
      h('button', { type: 'button', class: 'botao secundario', 'data-testid': 'voltar-cidade', onclick: acoes.cidade }, 'Voltar às fases'),
    ),
  );

  // Depois que a tela entra: o saldo corre até o valor novo e, com 2 estrelas ou mais, cai confete.
  aoEntrar(raiz, () => {
    contar(saldo, fechamento.saldoAntes, fechamento.saldo, dinheiro, 1100);
    if (fechamento.estrelas >= 2) confete(raiz);
  });
  return raiz;
}

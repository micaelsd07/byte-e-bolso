import { avaliarOrcamento } from '../core/orcamento';
import type { NoOrcamento } from '../core/tipos';
import { h, vibrar } from '../ui/dom';
import { ROTULO_CLASSE, dinheiro } from '../ui/formato';
import { icone } from '../ui/icones';

/** Quebra-cabeça sem relógio: montar o mês com a renda disponível. */
export function telaOrcamento(no: NoOrcamento, aoTerminar: (selecionados: string[]) => void, aoSair: () => void): HTMLElement {
  const selecao = new Set<string>();
  const resumo = h('div', { class: 'orcamento-resumo relevo', 'aria-live': 'polite' });

  const atualizar = (): void => {
    const { total, sobra } = avaliarOrcamento(no, [...selecao]);
    resumo.replaceChildren(
      h('div', {}, h('small', {}, 'Renda'), h('b', {}, dinheiro(no.renda))),
      h('div', {}, h('small', {}, 'Marcado'), h('b', { 'data-testid': 'orcamento-total' }, dinheiro(total))),
      h(
        'div',
        { class: sobra < 0 ? 'negativo' : 'positivo' },
        h('small', {}, sobra < 0 ? 'Faltam' : 'Sobra'),
        h('b', { 'data-testid': 'orcamento-sobra' }, dinheiro(Math.abs(sobra))),
      ),
      h('p', {}, `Meta de reserva: ${dinheiro(no.metaReserva)}`),
    );
  };

  const itens = no.itens.map((item) => {
    const caixa = h('input', {
      type: 'checkbox',
      'data-testid': `item-${item.id}`,
      onchange: () => {
        if (caixa.checked) selecao.add(item.id);
        else selecao.delete(item.id);
        vibrar(6);
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
        h('span', { class: 'item-nome' }, item.nome, h('span', { class: `selo classe-${item.classe}` }, ROTULO_CLASSE[item.classe])),
        h('b', {}, dinheiro(item.valor)),
      ),
    );
  });

  atualizar();
  return h(
    'div',
    { class: 'tela fase orcamento' },
    h(
      'header',
      { class: 'placar' },
      h('button', { type: 'button', class: 'sair', 'aria-label': 'Sair da fase', onclick: aoSair }, icone('esquerda')),
      h('h1', { tabindex: -1 }, no.titulo),
    ),
    h('p', { class: 'contexto' }, no.contexto),
    h('ul', { class: 'itens-orcamento relevo' }, ...itens),
    resumo,
    h('button', { type: 'button', class: 'botao', 'data-testid': 'fechar-orcamento', onclick: () => aoTerminar([...selecao]) }, 'Fechar o mês'),
  );
}

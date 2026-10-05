import { MELHORIAS } from '../content';
import { CUSTO_BASE, JUROS, custoFixo } from '../core/jogo';
import type { Estado, Melhoria } from '../core/tipos';
import { h } from '../ui/dom';
import { dinheiro } from '../ui/formato';

/** A garagem. Cada melhoria comprada aparece no cenário. O desenho é fixo, feito aqui. */
function garagem(tem: (id: string) => boolean): string {
  const se = (id: string, svg: string): string => (tem(id) ? svg : '');
  return (
    '<svg viewBox="0 0 320 180" aria-hidden="true">' +
    '<rect width="320" height="120" fill="#262f4b"/><rect y="120" width="320" height="60" fill="#1a2135"/>' +
    '<rect x="18" y="20" width="70" height="46" rx="4" fill="#1b2338"/><path d="M18 43h70M53 20v46" stroke="#34406b" stroke-width="2"/>' +
    '<circle cx="74" cy="32" r="5" fill="#ffd76a" class="pisca"/>' +
    se('duas-etapas', '<g class="surge"><path d="M258 26l20 8v16c0 13-9 21-20 25-11-4-20-12-20-25V34z" fill="#3ddc97"/><path d="M249 49l7 7 12-13" fill="none" stroke="#12331f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>') +
    se('curso-logica', '<g class="surge"><rect x="196" y="92" width="34" height="8" rx="2" fill="#ff6b6b"/><rect x="199" y="84" width="30" height="8" rx="2" fill="#4d8dff"/><rect x="194" y="76" width="34" height="8" rx="2" fill="#ffc93c"/></g>') +
    '<rect x="96" y="100" width="150" height="10" rx="3" fill="#8a6a4a"/><rect x="104" y="110" width="8" height="48" fill="#6b5138"/><rect x="230" y="110" width="8" height="48" fill="#6b5138"/>' +
    (tem('notebook-usado') || tem('notebook-parcelado')
      ? `<g class="surge"><rect x="128" y="62" width="62" height="38" rx="4" fill="#0f1524" stroke="${tem('notebook-parcelado') ? '#ffc93c' : '#5a6a99'}" stroke-width="3"/><rect x="135" y="70" width="26" height="4" rx="2" fill="#3ddc97"/><rect x="135" y="78" width="40" height="4" rx="2" fill="#4d8dff"/><rect x="135" y="86" width="18" height="4" rx="2" fill="#ffc93c" class="pisca"/><rect x="120" y="100" width="78" height="5" rx="2" fill="#5a6a99"/></g>`
      : '<g><rect x="146" y="76" width="18" height="26" rx="3" fill="#0f1524" stroke="#5a6a99" stroke-width="2"/><rect x="150" y="81" width="10" height="3" rx="1" fill="#4d8dff" class="pisca"/></g>') +
    se('internet-fibra', '<g class="surge"><rect x="206" y="88" width="30" height="10" rx="3" fill="#eef2ff"/><path d="M212 88v-12M230 88v-12" stroke="#eef2ff" stroke-width="2"/><circle cx="213" cy="93" r="2" fill="#3ddc97" class="pisca"/><circle cx="221" cy="93" r="2" fill="#3ddc97"/></g>') +
    (tem('cadeira-gamer')
      ? '<g class="surge"><rect x="40" y="86" width="40" height="52" rx="10" fill="#1b1f2e" stroke="#ff4fd8" stroke-width="3" class="led"/><rect x="36" y="134" width="48" height="10" rx="4" fill="#1b1f2e"/><path d="M60 144v14M44 162h32" stroke="#5a6a99" stroke-width="4" stroke-linecap="round"/></g>'
      : '<g><rect x="46" y="124" width="30" height="8" rx="3" fill="#6b5138"/><path d="M50 132v26M72 132v26" stroke="#6b5138" stroke-width="4"/></g>') +
    '</svg>'
  );
}

export interface AcoesEmpresa {
  comprar(melhoria: Melhoria): void;
}

export function telaEmpresa(estado: Estado, acoes: AcoesEmpresa): HTMLElement {
  const tem = (id: string): boolean => estado.melhorias.includes(id);
  const cenario = h('div', { class: 'garagem relevo' });
  cenario.innerHTML = garagem(tem);
  const custo = custoFixo(estado, MELHORIAS);

  const cartoes = MELHORIAS.map((m) => {
    const comprada = tem(m.id);
    const podePagar = estado.dinheiro >= m.custo && estado.dinheiro >= 0;
    return h(
      'li',
      { class: comprada ? 'melhoria relevo comprada' : 'melhoria relevo', 'data-testid': `melhoria-${m.id}` },
      h('div', { class: 'melhoria-topo' }, h('h3', {}, m.nome), comprada ? h('span', { class: 'selo recorde' }, 'Instalada') : null),
      h('p', {}, m.descricao),
      h(
        'p',
        { class: 'precos' },
        h('span', {}, m.custo === 0 ? 'Sem entrada' : dinheiro(m.custo)),
        m.manutencao > 0 ? h('span', { class: 'fixo' }, `+ ${dinheiro(m.manutencao)} por rodada`) : h('span', {}, 'Sem custo fixo'),
      ),
      comprada
        ? h('p', { class: 'licao' }, m.licao)
        : h(
            'button',
            {
              type: 'button',
              class: 'botao pequeno',
              disabled: !podePagar,
              'data-testid': `comprar-${m.id}`,
              onclick: () => acoes.comprar(m),
            },
            podePagar ? (m.custo === 0 ? 'Instalar' : 'Comprar') : estado.dinheiro < 0 ? 'Saia do vermelho primeiro' : 'Dinheiro insuficiente',
          ),
    );
  });

  return h(
    'div',
    { class: 'empresa' },
    h('h1', { tabindex: -1 }, 'Sua empresa'),
    cenario,
    h(
      'section',
      { class: 'relevo caixa' },
      h('h2', {}, 'Custo fixo'),
      h(
        'ul',
        {},
        h('li', {}, h('span', {}, 'Contas da semana'), h('b', {}, dinheiro(CUSTO_BASE))),
        ...MELHORIAS.filter((m) => tem(m.id) && m.manutencao > 0).map((m) => h('li', {}, h('span', {}, m.nome), h('b', {}, dinheiro(m.manutencao)))),
        h('li', { class: 'total' }, h('span', {}, 'Cobrado a cada rodada'), h('b', { 'data-testid': 'custo-fixo' }, dinheiro(custo))),
      ),
      h('p', { class: 'ficha-detalhe' }, `Toda fase jogada paga o que rendeu e cobra o custo fixo. Saldo negativo cobra ${Math.round(JUROS * 100)}% de juros por rodada.`),
    ),
    h('h2', {}, 'Melhorias'),
    h('ul', { class: 'melhorias' }, ...cartoes),
  );
}

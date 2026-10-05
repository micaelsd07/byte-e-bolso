import { argumentar, fechar, iniciarDuelo, precoJusto, type Duelo, type Efeito } from '../core/negociacao';
import type { NoNegociacao } from '../core/tipos';
import { h, vibrar } from '../ui/dom';
import { contar, pulsar, semMovimento } from '../ui/efeitos';
import { dinheiro } from '../ui/formato';
import { icone } from '../ui/icones';

const FALA: Record<Efeito, string> = {
  forte: 'Agora você falou a minha língua.',
  medio: 'Hum. Ajuda um pouco.',
  ruim: 'Assim fica difícil levar você a sério.',
};
/** Tempo, em milissegundos, que o ponteiro leva para cruzar a barra. */
const VARREDURA = 900;

/** Rosto do cliente, desenhado em SVG. O humor acompanha a paciência. */
function rosto(humor: 'bem' | 'neutro' | 'mal'): string {
  const boca = humor === 'bem' ? 'M22 40q10 9 20 0' : humor === 'mal' ? 'M22 44q10 -8 20 0' : 'M23 42h18';
  const sobrancelha = humor === 'mal' ? 'M19 22l9 4M45 22l-9 4' : 'M19 23h9M36 23h9';
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#ffc93c"/><circle cx="32" cy="34" r="22" fill="#ffd978"/><path d="${sobrancelha}" stroke="#2a2f45" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="31" r="3" fill="#2a2f45"/><circle cx="40" cy="31" r="3" fill="#2a2f45"/><path d="${boca}" fill="none" stroke="#2a2f45" stroke-width="3" stroke-linecap="round"/></svg>`;
}

/** Disputa de chefe: negociar o preço com um cliente. As regras ficam em core/negociacao. */
export function telaNegociacao(no: NoNegociacao, aoTerminar: (duelo: Duelo) => void, aoSair: () => void): HTMLElement {
  let duelo = iniciarDuelo(no);
  let escolhido: string | null = null;
  let inicioDaBarra = 0;
  const justo = precoJusto(no);

  const cara = h('div', { class: 'rosto' });
  const fala = h('p', { class: 'balao', 'aria-live': 'polite', 'data-testid': 'fala' }, `Preciso de ${no.pedido.charAt(0).toLowerCase()}${no.pedido.slice(1)} Pago ${dinheiro(no.ofertaInicial)}.`);
  const oferta = h('b', { class: 'oferta', 'data-testid': 'oferta' }, dinheiro(duelo.oferta));
  const paciencia = h('div', { class: 'paciencia', 'data-testid': 'paciencia' });
  const porque = h('p', { class: 'recado', 'aria-live': 'polite' });
  const lista = h('div', { class: 'argumentos' });
  const ponteiro = h('i', { class: 'ponteiro' });
  const falar = h('button', { type: 'button', class: 'botao', 'data-testid': 'falar', onclick: () => soltar() }, 'Falar agora!');
  const barra = h(
    'div',
    { class: 'precisao relevo', hidden: true },
    h('p', {}, 'Toque quando o ponteiro estiver no centro: a hora certa reforça o argumento.'),
    h('div', { class: 'trilho' }, h('span', { class: 'alvo' }), ponteiro),
    falar,
  );
  const fecharBotao = h('button', { type: 'button', class: 'botao secundario', 'data-testid': 'fechar-negocio', onclick: () => encerrar(fechar(duelo)) });

  function desenhar(): void {
    const fracao = duelo.paciencia / no.paciencia;
    cara.innerHTML = rosto(fracao > 0.6 ? 'bem' : fracao > 0.25 ? 'neutro' : 'mal');
    paciencia.replaceChildren(
      ...Array.from({ length: no.paciencia }, (_, i) => h('i', { class: i < duelo.paciencia ? 'cheio' : '' })),
    );
    paciencia.setAttribute('aria-label', `Paciência do cliente: ${duelo.paciencia} de ${no.paciencia}`);
    fecharBotao.textContent = `Fechar negócio por ${dinheiro(duelo.oferta)}`;
    fecharBotao.classList.toggle('prejuizo', duelo.oferta < justo);
    lista.replaceChildren(
      ...no.argumentos.map((a) =>
        h(
          'button',
          {
            type: 'button',
            class: a.id === escolhido ? 'argumento escolhido' : 'argumento',
            disabled: duelo.usados.includes(a.id) || duelo.fim !== null,
            'data-testid': `argumento-${a.id}`,
            onclick: () => escolher(a.id),
          },
          a.texto,
        ),
      ),
    );
  }

  function escolher(id: string): void {
    if (duelo.fim !== null) return;
    escolhido = id;
    inicioDaBarra = performance.now();
    barra.hidden = false;
    pulsar(ponteiro, 'varrendo');
    desenhar();
    falar.focus();
  }

  /** Posição do ponteiro (0 a 1), em onda triangular: vai e volta pela barra. */
  function posicao(agora: number): number {
    const fase = ((agora - inicioDaBarra) % (2 * VARREDURA)) / VARREDURA;
    return fase <= 1 ? fase : 2 - fase;
  }

  function soltar(): void {
    if (escolhido === null) return;
    // Sem movimento não há ponteiro para acompanhar: vale a precisão média.
    const precisao = semMovimento() ? 0.6 : 1 - Math.abs(posicao(performance.now()) - 0.5) * 2;
    const jogada = argumentar(duelo, no, escolhido, precisao);
    escolhido = null;
    barra.hidden = true;
    if (jogada === null) return;

    const antes = duelo.oferta;
    duelo = jogada.duelo;
    fala.textContent = FALA[jogada.efeito];
    porque.className = jogada.efeito === 'ruim' ? 'recado ruim' : 'recado bom';
    porque.textContent = jogada.argumento.porque;
    contar(oferta, antes, duelo.oferta, dinheiro, 600);
    pulsar(oferta, jogada.variacao >= 0 ? 'sobe' : 'desce');
    vibrar(jogada.efeito === 'ruim' ? 40 : 10);
    desenhar();

    if (duelo.fim === 'desistiu') {
      fala.textContent = 'Chega. Vou procurar outra pessoa.';
      setTimeout(() => encerrar(duelo), 1300);
    } else if (duelo.paciencia === 1) {
      fala.textContent += ' Mas minha paciência está no fim.';
    }
  }

  function encerrar(final: Duelo): void {
    duelo = final;
    desenhar();
    fecharBotao.disabled = true;
    aoTerminar(final);
  }

  desenhar();
  return h(
    'div',
    { class: 'tela fase negociacao' },
    h(
      'header',
      { class: 'placar' },
      h('button', { type: 'button', class: 'sair', 'aria-label': 'Sair da fase', onclick: aoSair }, icone('esquerda')),
      h('h1', { tabindex: -1 }, no.titulo),
    ),
    h('section', { class: 'cliente relevo' }, cara, h('div', {}, h('strong', {}, no.cliente), fala)),
    h(
      'section',
      { class: 'mesa-negociacao' },
      h('div', { class: 'relevo quadro' }, h('small', {}, 'Oferta na mesa'), oferta),
      h('div', { class: 'relevo quadro' }, h('small', {}, 'Paciência'), paciencia),
    ),
    h('p', { class: 'conta' }, `Sua conta: ${no.horas} horas × ${dinheiro(no.valorHora)} = `, h('b', {}, dinheiro(justo)), '. Abaixo disso, você paga para trabalhar.'),
    porque,
    barra,
    h('h2', {}, 'Escolha um argumento'),
    lista,
    fecharBotao,
  );
}

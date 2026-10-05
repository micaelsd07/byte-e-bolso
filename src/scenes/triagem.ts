import {
  LISTA_PODERES,
  PODERES,
  avancar,
  carga,
  cartaAtual,
  iniciarRodada,
  multiplicador,
  podeUsar,
  responder,
  usarPoder,
  type Poder,
  type Rodada,
} from '../core/triagem';
import type { Lado, NoTriagem, Vantagens } from '../core/tipos';
import { h, vibrar } from '../ui/dom';
import { pulsar, semMovimento } from '../ui/efeitos';
import { icone, type Icone } from '../ui/icones';

const ICONE_PODER: Record<Poder, Icone> = { foco: 'foco', dica: 'dica', escudo: 'escudo' };
const ARRASTE_MINIMO = 70;

/**
 * Fase relâmpago. As regras ficam em core/triagem; aqui só há tela, relógio e
 * gesto. Dá para jogar arrastando a carta, tocando nos botões ou com as setas
 * do teclado.
 */
export function telaTriagem(
  no: NoTriagem,
  vantagens: Vantagens,
  aoTerminar: (rodada: Rodada) => void,
  aoSair: () => void,
): HTMLElement {
  let rodada = iniciarRodada(no, vantagens, Date.now() % 2147483647);
  const duracaoTotal = rodada.tempo;
  let jogando = false;
  let travado = false;
  let carta: HTMLElement | null = null;

  const pontos = h('b', { 'data-testid': 'pontos' }, '0');
  const combo = h('span', { class: 'combo', 'data-testid': 'combo' }, '1x');
  const vidas = h('span', { class: 'vidas', 'data-testid': 'vidas' });
  const tempoCheio = h('div', { class: 'barra-cheio' });
  const relogio = h('div', { class: 'barra relogio', role: 'timer', 'aria-label': 'Tempo restante' }, tempoCheio);
  const mesa = h('div', { class: 'mesa' });
  const aviso = h('p', { class: 'recado', 'aria-live': 'polite', 'data-testid': 'recado' });

  const botaoLado = (lado: Lado): HTMLButtonElement =>
    h(
      'button',
      { type: 'button', class: `lado lado-${lado}`, 'data-testid': `lado-${lado}`, onclick: () => jogar(lado) },
      lado === 'esquerda' ? icone('esquerda') : null,
      h('span', {}, lado === 'esquerda' ? no.esquerda : no.direita),
      lado === 'direita' ? icone('direita') : null,
    );
  const esquerda = botaoLado('esquerda');
  const direita = botaoLado('direita');

  const poderes = LISTA_PODERES.map((poder) => {
    const cheio = h('div', { class: 'barra-cheio' });
    const botao = h(
      'button',
      {
        type: 'button',
        class: 'poder',
        'data-testid': `poder-${poder}`,
        'aria-label': PODERES[poder].nome,
        onclick: () => {
          if (!jogando) return;
          rodada = usarPoder(rodada, poder);
          atualizar();
        },
      },
      icone(ICONE_PODER[poder]),
      h('span', {}, PODERES[poder].nome),
      h('div', { class: 'barra cd' }, cheio),
    );
    return { poder, botao, cheio };
  });

  function atualizar(): void {
    pontos.textContent = String(rodada.pontos);
    const m = multiplicador(rodada);
    combo.textContent = `${m}x`;
    combo.classList.toggle('quente', m > 1);
    vidas.replaceChildren(...Array.from({ length: Math.max(0, rodada.vidas) }, () => icone('coracao')));
    vidas.setAttribute('aria-label', `${rodada.vidas} vidas`);
    tempoCheio.style.width = `${(rodada.tempo / duracaoTotal) * 100}%`;
    relogio.classList.toggle('acabando', rodada.tempo < 8000);
    relogio.classList.toggle('lento', rodada.focoRestante > 0);
    for (const { poder, botao, cheio } of poderes) {
      botao.disabled = !jogando || !podeUsar(rodada, poder);
      cheio.style.width = `${carga(rodada, poder) * 100}%`;
    }
    mesa.classList.toggle('blindada', rodada.escudo);
    const certa = cartaAtual(rodada, no);
    esquerda.classList.toggle('indicado', rodada.dica && certa?.lado === 'esquerda');
    direita.classList.toggle('indicado', rodada.dica && certa?.lado === 'direita');
  }

  function novaCarta(): void {
    const atual = cartaAtual(rodada, no);
    if (atual === null) return;
    const el = h(
      'div',
      { class: atual.codigo ? 'carta codigo' : 'carta', 'data-testid': `carta-${atual.id}`, 'data-carta': atual.id },
      h('p', {}, atual.texto),
    );
    arrastavel(el);
    mesa.replaceChildren(el);
    carta = el;
    travado = false;
  }

  function arrastavel(el: HTMLElement): void {
    let inicio: number | null = null;
    let dx = 0;
    el.addEventListener('pointerdown', (e) => {
      if (travado || !jogando) return;
      inicio = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.classList.add('pegando');
    });
    el.addEventListener('pointermove', (e) => {
      if (inicio === null) return;
      dx = e.clientX - inicio;
      el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      esquerda.classList.toggle('mira', dx < -ARRASTE_MINIMO / 2);
      direita.classList.toggle('mira', dx > ARRASTE_MINIMO / 2);
    });
    const soltar = (): void => {
      if (inicio === null) return;
      inicio = null;
      el.classList.remove('pegando');
      esquerda.classList.remove('mira');
      direita.classList.remove('mira');
      if (Math.abs(dx) >= ARRASTE_MINIMO) jogar(dx > 0 ? 'direita' : 'esquerda');
      else el.style.transform = '';
      dx = 0;
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  function jogar(lado: Lado): void {
    if (!jogando || travado) return;
    const resposta = responder(rodada, no, lado);
    if (resposta === null) return;
    travado = true;
    rodada = resposta.rodada;

    const saindo = carta;
    saindo?.classList.add(lado === 'direita' ? 'sai-direita' : 'sai-esquerda', resposta.acertou ? 'certa' : 'errada');
    if (resposta.acertou) {
      aviso.className = 'recado bom';
      aviso.textContent = `+${resposta.ganho}`;
      pulsar(pontos, 'salta');
      vibrar(8);
    } else {
      aviso.className = 'recado ruim';
      aviso.textContent = `${resposta.protegido ? 'Blindagem segurou. ' : ''}${resposta.carta.porque}`;
      if (!semMovimento()) pulsar(mesa, 'treme');
      vibrar(40);
    }
    atualizar();

    setTimeout(
      () => {
        if (rodada.fim !== null) encerrar();
        else novaCarta();
        atualizar();
      },
      semMovimento() ? 0 : 170,
    );
  }

  function encerrar(): void {
    if (!jogando) return;
    jogando = false;
    document.removeEventListener('keydown', tecla);
    mesa.replaceChildren(h('p', { class: 'fim-rodada' }, rodada.fim === 'vidas' ? 'Acabaram as vidas!' : 'Tempo!'));
    atualizar();
    setTimeout(() => aoTerminar(rodada), 700);
  }

  function tecla(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowLeft') jogar('esquerda');
    else if (evento.key === 'ArrowRight') jogar('direita');
  }

  function comecar(): void {
    jogando = true;
    document.addEventListener('keydown', tecla);
    novaCarta();
    atualizar();
    let anterior = performance.now();
    const quadro = (agora: number): void => {
      // A tela foi trocada (o jogador saiu): para o relógio e solta o teclado.
      if (!raiz.isConnected) {
        document.removeEventListener('keydown', tecla);
        return;
      }
      if (!jogando) return;
      // Limite por quadro: voltar de outra aba não consome o tempo de uma vez.
      rodada = avancar(rodada, Math.min(100, agora - anterior));
      anterior = agora;
      atualizar();
      if (rodada.fim !== null) encerrar();
      else requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  }

  const abertura = h(
    'div',
    { class: 'abertura relevo' },
    h('h1', { tabindex: -1 }, no.titulo),
    h('p', {}, no.instrucao),
    h(
      'div',
      { class: 'legenda' },
      h('span', { class: 'lado lado-esquerda' }, icone('esquerda'), no.esquerda),
      h('span', { class: 'lado lado-direita' }, no.direita, icone('direita')),
    ),
    h('p', { class: 'ficha-detalhe' }, `3 acertos seguidos sobem o combo. Você tem ${rodada.vidas} vidas e ${Math.round(duracaoTotal / 1000)} segundos.`),
    h(
      'button',
      {
        type: 'button',
        class: 'botao',
        'data-testid': 'valendo',
        onclick: () => {
          abertura.remove();
          comecar();
        },
      },
      'Valendo!',
    ),
  );
  mesa.append(abertura);

  const raiz = h(
    'div',
    { class: 'tela fase triagem' },
    h(
      'header',
      { class: 'placar' },
      h('button', { type: 'button', class: 'sair', 'aria-label': 'Sair da fase', 'data-testid': 'sair', onclick: aoSair }, icone('esquerda')),
      h('div', { class: 'placar-pontos' }, h('small', {}, 'Pontos'), pontos),
      combo,
      vidas,
    ),
    relogio,
    mesa,
    aviso,
    h('div', { class: 'lados' }, esquerda, direita),
    h('div', { class: 'poderes' }, ...poderes.map((p) => p.botao)),
  );
  atualizar();
  return raiz;
}

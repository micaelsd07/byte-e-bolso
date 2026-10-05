import {
  exercicioAtual,
  gabarito,
  iniciarSessao,
  pecasEmbaralhadas,
  progresso,
  responderExercicio,
  type Resposta,
  type Sessao,
} from '../core/licao';
import type { Exercicio, NoLicao } from '../core/tipos';
import { h, vibrar } from '../ui/dom';
import { pulsar, semMovimento } from '../ui/efeitos';
import { icone } from '../ui/icones';

/**
 * Lição no estilo de trilha de idiomas: primeiro o resumo de como funciona,
 * depois os exercícios, um por tela. Quem erra vê a resposta e a explicação, e
 * o exercício volta no fim da fila. As regras ficam em core/licao.
 */
export function telaLicao(no: NoLicao, vidasExtras: number, aoTerminar: (sessao: Sessao) => void, aoSair: () => void): HTMLElement {
  let sessao = iniciarSessao(no, vidasExtras);
  let pagina = 0;
  let resposta: Resposta | null = null;
  let conferido = false;

  const cheio = h('div', { class: 'barra-cheio' });
  const barra = h('div', { class: 'barra progresso-licao', role: 'progressbar', 'aria-label': 'Progresso da lição', 'aria-valuemin': 0, 'aria-valuemax': 100 }, cheio);
  const vidas = h('span', { class: 'vidas', 'data-testid': 'vidas' });
  const corpo = h('div', { class: 'licao-corpo' });
  const retorno = h('div', { class: 'retorno', 'aria-live': 'polite', 'data-testid': 'retorno', hidden: true });
  const botao = h('button', { type: 'button', class: 'botao', 'data-testid': 'conferir', onclick: () => avancar() });

  /** Troca o conteúdo de um elemento, pulando o que for null. */
  const por = (pai: HTMLElement, ...itens: (HTMLElement | null)[]): void => pai.replaceChildren(...itens.filter((i): i is HTMLElement => i !== null));

  function placar(): void {
    const pct = Math.round(progresso(sessao) * 100);
    cheio.style.width = `${pct}%`;
    barra.setAttribute('aria-valuenow', String(pct));
    vidas.replaceChildren(...Array.from({ length: Math.max(0, sessao.vidas) }, () => icone('coracao')));
    vidas.setAttribute('aria-label', `${sessao.vidas} vidas`);
  }

  function responderCom(valor: Resposta | null): void {
    resposta = valor;
    botao.disabled = valor === null || (typeof valor !== 'number' && valor.length === 0);
  }

  function codigo(texto: string): HTMLElement {
    return h('pre', { class: 'codigo' }, h('code', {}, texto));
  }

  function mostrarExplicacao(): void {
    const item = no.explicacao[pagina]!;
    por(
      corpo,
      h('p', { class: 'sobretitulo' }, 'Como funciona'),
      h('h1', { tabindex: -1 }, item.titulo),
      h('p', { class: 'explicacao' }, item.texto),
      item.codigo !== undefined ? codigo(item.codigo) : null,
    );
    retorno.hidden = true;
    botao.textContent = pagina + 1 < no.explicacao.length ? 'Continuar' : 'Praticar';
    botao.disabled = false;
    botao.dataset.testid = 'praticar';
  }

  function campos(exercicio: Exercicio): HTMLElement {
    if (exercicio.tipo === 'escolha') {
      const opcoes = exercicio.opcoes.map((texto, indice) =>
        h(
          'button',
          {
            type: 'button',
            class: 'opcao',
            role: 'radio',
            'aria-checked': 'false',
            'data-testid': `opcao-${indice}`,
            onclick: () => {
              if (conferido) return;
              opcoes.forEach((o, i) => {
                o.classList.toggle('escolhida', i === indice);
                o.setAttribute('aria-checked', String(i === indice));
              });
              responderCom(indice);
            },
          },
          texto,
        ),
      );
      return h('div', { class: 'opcoes', role: 'radiogroup', 'aria-label': 'Opções' }, ...opcoes);
    }

    if (exercicio.tipo === 'montar') {
      const escolhidas: { texto: string; origem: HTMLButtonElement }[] = [];
      const linha = h('div', { class: 'montagem', 'data-testid': 'montagem', 'aria-label': 'Sua resposta' });
      const redesenhar = (): void => {
        linha.replaceChildren(
          ...escolhidas.map((peca, posicao) =>
            h(
              'button',
              {
                type: 'button',
                class: 'peca',
                'aria-label': `Remover ${peca.texto}`,
                onclick: () => {
                  if (conferido) return;
                  escolhidas.splice(posicao, 1);
                  peca.origem.disabled = false;
                  redesenhar();
                },
              },
              peca.texto,
            ),
          ),
        );
        responderCom(escolhidas.map((p) => p.texto));
      };
      const banco = pecasEmbaralhadas(exercicio.pecas, exercicio.extras, no.id.length * 31 + exercicio.id.length + exercicio.pecas.length).map((texto, i) => {
        const peca = h(
          'button',
          {
            type: 'button',
            class: 'peca',
            'data-testid': `peca-${i}`,
            'data-peca': texto,
            onclick: () => {
              if (conferido) return;
              escolhidas.push({ texto, origem: peca });
              peca.disabled = true;
              redesenhar();
            },
          },
          texto,
        );
        return peca;
      });
      return h('div', { class: 'montar' }, linha, h('div', { class: 'banco', 'aria-label': 'Peças disponíveis' }, ...banco));
    }

    const campo = h('input', {
      class: 'lacuna',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      'aria-label': 'Trecho que falta',
      'data-testid': 'lacuna',
      size: Math.max(4, ...exercicio.respostas.map((r) => r.length)) + 1,
      oninput: () => responderCom(campo.value),
      onkeydown: (evento: Event) => {
        if ((evento as KeyboardEvent).key === 'Enter' && !botao.disabled) avancar();
      },
    });
    return h('pre', { class: 'codigo com-lacuna' }, h('code', {}, exercicio.antes, campo, exercicio.depois));
  }

  function mostrarExercicio(): void {
    const exercicio = exercicioAtual(sessao, no);
    if (exercicio === null) return;
    conferido = false;
    por(
      corpo,
      h('p', { class: 'sobretitulo' }, exercicio.tipo === 'escolha' ? 'Escolha a resposta' : exercicio.tipo === 'montar' ? 'Monte o código' : 'Digite o código'),
      h('h1', { tabindex: -1, 'data-testid': 'pergunta' }, exercicio.pergunta),
      exercicio.tipo === 'escolha' && exercicio.codigo !== undefined ? codigo(exercicio.codigo) : null,
      campos(exercicio),
    );
    corpo.dataset.exercicio = exercicio.id;
    retorno.hidden = true;
    botao.textContent = 'Conferir';
    botao.dataset.testid = 'conferir';
    responderCom(null);
    corpo.querySelector<HTMLElement>(exercicio.tipo === 'completar' ? 'input' : 'h1')?.focus({ preventScroll: true });
  }

  function avancar(): void {
    // 1. Páginas de explicação, antes dos exercícios.
    if (pagina < no.explicacao.length) {
      pagina++;
      if (pagina < no.explicacao.length) mostrarExplicacao();
      else mostrarExercicio();
      placar();
      return;
    }
    // 2. Depois de conferir, o botão leva ao próximo exercício ou ao resultado.
    if (conferido) {
      if (sessao.fim !== null) aoTerminar(sessao);
      else mostrarExercicio();
      return;
    }
    // 3. Conferir a resposta.
    const exercicio = exercicioAtual(sessao, no);
    if (exercicio === null || resposta === null) return;
    const resultado = responderExercicio(sessao, no, resposta);
    if (resultado === null) return;
    sessao = resultado.sessao;
    conferido = true;
    for (const controle of corpo.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input')) controle.disabled = true;

    retorno.className = resultado.acertou ? 'retorno bom' : 'retorno ruim';
    por(
      retorno,
      h('strong', {}, resultado.acertou ? 'Certo!' : 'Ainda não.'),
      resultado.acertou ? null : h('p', {}, 'Resposta: ', h('code', {}, gabarito(exercicio))),
      h('p', {}, exercicio.explicacao),
      !resultado.acertou && sessao.fim === null ? h('p', { class: 'ajuda' }, 'Este exercício volta no fim da lição.') : null,
    );
    retorno.hidden = false;
    botao.disabled = false;
    botao.textContent = sessao.fim === null ? 'Continuar' : 'Ver resultado';
    botao.dataset.testid = 'continuar-licao';
    placar();
    if (resultado.acertou) vibrar(8);
    else {
      vibrar(40);
      if (!semMovimento()) pulsar(corpo, 'treme');
    }
    botao.focus({ preventScroll: true });
  }

  mostrarExplicacao();
  placar();
  return h(
    'div',
    { class: 'tela fase aula' },
    h(
      'header',
      { class: 'placar' },
      h('button', { type: 'button', class: 'sair', 'aria-label': 'Sair da lição', 'data-testid': 'sair', onclick: aoSair }, icone('esquerda')),
      barra,
      vidas,
    ),
    corpo,
    h('footer', { class: 'licao-rodape' }, retorno, botao),
  );
}

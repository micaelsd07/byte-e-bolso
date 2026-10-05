import { APELIDO_MAX } from '../core/jogo';
import type { Estado } from '../core/tipos';
import { svgCidade } from '../ui/cidade';
import { h } from '../ui/dom';

export interface AcoesInicio {
  comecar(apelido: string): void;
  continuar(): void;
}

export function telaInicio(salvo: Estado | null, acoes: AcoesInicio): HTMLElement {
  const fundo = h('div', { class: 'inicio-cidade', 'aria-hidden': 'true' });
  fundo.innerHTML = svgCidade();

  const campo = h('input', {
    id: 'apelido',
    class: 'campo',
    type: 'text',
    maxlength: APELIDO_MAX,
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    placeholder: 'Visitante',
    'aria-describedby': 'apelido-ajuda',
    'data-testid': 'apelido',
  });

  return h(
    'main',
    { class: 'tela inicio' },
    fundo,
    h(
      'header',
      { class: 'marca' },
      h('p', { class: 'sobretitulo' }, 'Tecnologia · Finanças · Carreira'),
      h('h1', { tabindex: -1 }, 'Byte ', h('span', { class: 'e-comercial' }, '&'), ' Bolso'),
      h('p', { class: 'slogan' }, 'Suas escolhas. Seu código. Seu futuro.'),
    ),
    h(
      'section',
      { class: 'relevo inicio-painel' },
      h('p', {}, 'Comece numa garagem com R$ 2.500. Vença as fases, faça o caixa render e monte a sua empresa de tecnologia.'),
      salvo !== null
        ? h('button', { type: 'button', class: 'botao', 'data-testid': 'continuar', onclick: () => acoes.continuar() }, `Continuar como ${salvo.apelido}`)
        : null,
      h(
        'form',
        {
          class: 'inicio-form',
          onsubmit: (evento: Event) => {
            evento.preventDefault();
            acoes.comecar(campo.value);
          },
        },
        h('label', { for: 'apelido', class: 'rotulo' }, 'Apelido'),
        campo,
        h('p', { id: 'apelido-ajuda', class: 'ajuda' }, 'Opcional. Fica só neste aparelho; não use seu nome completo.'),
        h('button', { type: 'submit', class: salvo !== null ? 'botao secundario' : 'botao', 'data-testid': 'comecar' }, salvo !== null ? 'Começar do zero' : 'Jogar'),
      ),
    ),
    h('footer', { class: 'rodape', 'data-testid': 'versao' }, `v${__APP_VERSAO__} · ${__APP_SHA__}`),
  );
}

import { APELIDO_MAX } from '../core/jogo';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';
import { svgHeroi } from '../ui/heroi';

export interface AcoesInicio {
  comecar(apelido: string): void;
  continuar(): void;
}

export function telaInicio(salvo: Estado | null, acoes: AcoesInicio): HTMLElement {
  const heroi = h('div', { class: 'heroi', 'aria-hidden': 'true' });
  heroi.innerHTML = svgHeroi();

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
    h(
      'header',
      { class: 'marca' },
      h('h1', { tabindex: -1 }, 'Byte', h('span', { class: 'cursor', 'aria-hidden': 'true' }, '_')),
      h('p', { class: 'slogan' }, 'Aprenda a programar jogando.'),
    ),
    heroi,
    salvo !== null
      ? h('button', { type: 'button', class: 'botao brilho', 'data-testid': 'continuar', onclick: () => acoes.continuar() }, `Continuar como ${salvo.apelido}`)
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
      h(
        'div',
        { class: 'relevo inicio-painel' },
        h('label', { for: 'apelido', class: 'rotulo' }, salvo !== null ? 'Novo jogador' : 'Seu apelido'),
        campo,
        h('p', { id: 'apelido-ajuda', class: 'ajuda' }, 'Opcional. Sem cadastro: fica só neste aparelho. Não use seu nome completo.'),
      ),
      h('button', { type: 'submit', class: salvo !== null ? 'botao secundario' : 'botao brilho', 'data-testid': 'comecar' }, salvo !== null ? 'Começar do zero' : 'Jogar'),
    ),
    h('footer', { class: 'rodape', 'data-testid': 'versao' }, `v${__APP_VERSAO__} · ${__APP_SHA__}`),
  );
}

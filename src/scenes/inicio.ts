import { FASES } from '../content';
import { APELIDO_MAX } from '../core/partida';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';

export interface AcoesInicio {
  comecar(apelido: string): void;
  continuar(): void;
}

export function telaInicio(salvo: Estado | null, acoes: AcoesInicio): HTMLElement {
  const emAndamento = salvo !== null && salvo.status === 'jogando';
  const fase = salvo === null ? undefined : FASES.find((f) => f.id === salvo.faseId);

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

  const formulario = h(
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
    h(
      'button',
      { type: 'submit', class: emAndamento ? 'botao secundario' : 'botao', 'data-testid': 'comecar' },
      emAndamento ? 'Nova partida' : 'Começar',
    ),
  );

  return h(
    'main',
    { class: 'tela inicio' },
    h(
      'header',
      { class: 'marca' },
      h('p', { class: 'sobretitulo' }, 'Tecnologia · Finanças · Carreira'),
      h('h1', { tabindex: -1 }, 'Byte ', h('span', { class: 'e-comercial' }, '&'), ' Bolso'),
      h('p', { class: 'slogan' }, 'Suas escolhas. Seu código. Seu futuro.'),
    ),
    h(
      'p',
      { class: 'chamada' },
      'Você começa com R$ 2.500 e a vontade de trabalhar com tecnologia. Cada decisão mexe no seu dinheiro, na sua energia e no que você sabe.',
    ),
    emAndamento && fase !== undefined
      ? h(
          'button',
          { type: 'button', class: 'botao', 'data-testid': 'continuar', onclick: () => acoes.continuar() },
          `Continuar: fase ${fase.numero}, passo ${salvo.passo + 1} de ${fase.passos.length}`,
        )
      : null,
    formulario,
    h('footer', { class: 'rodape', 'data-testid': 'versao' }, `v${__APP_VERSAO__} · ${__APP_SHA__}`),
  );
}

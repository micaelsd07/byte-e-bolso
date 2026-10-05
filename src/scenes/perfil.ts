import { MELHORIAS, TRILHAS, UNIDADES, fasesDa } from '../content';
import { AVATARES, CUSTO_RECARGA, estrelasDoNo, maximoDeVidas, mvp, nivel, tituloDoNivel, totalEstrelas } from '../core/jogo';
import type { Estado } from '../core/tipos';
import { h } from '../ui/dom';
import { barra, dinheiro } from '../ui/formato';
import { icone, type Icone } from '../ui/icones';

export interface AcoesPerfil {
  escolherAvatar(avatar: string): void;
  recarregarVidas(): void;
  recomecar(): void;
}

const NOME_DO_AVATAR: Record<string, string> = {
  foco: 'Raio',
  escudo: 'Escudo',
  dica: 'Ideia',
  moeda: 'Moeda',
  cidade: 'Cidade',
  negociacao: 'Conversa',
};

/** Perfil do personagem: quem ele é, o que já conquistou e como está em cada trilha. */
export function telaPerfil(estado: Estado, acoes: AcoesPerfil): HTMLElement {
  const nivelAtual = nivel(estado, UNIDADES);
  const estrelasTotais = totalEstrelas(estado, UNIDADES);
  const paraProximo = 3 - (estrelasTotais % 3);
  const maximo = maximoDeVidas(estado, MELHORIAS);
  const iniciadas = TRILHAS.filter((t) => fasesDa(t).some((n) => estado.nos[n.id] !== undefined));
  const concluidas = UNIDADES.flatMap((u) => u.nos).filter((n) => estrelasDoNo(estado, n) > 0).length;

  const numero = (rotulo: string, valor: string, id: string): HTMLElement =>
    h('div', { class: 'numero relevo' }, h('b', { 'data-testid': id }, valor), h('small', {}, rotulo));

  const trilhas = iniciadas.map((t) => {
    const fases = fasesDa(t);
    const feitas = fases.reduce<number>((s, n) => s + estrelasDoNo(estado, n), 0);
    return h(
      'li',
      { class: 'progresso-trilha' },
      h('span', { class: `sigla t-${t.id}`, 'aria-hidden': 'true' }, t.sigla),
      h('div', {}, h('strong', {}, t.nome), h('small', {}, `${feitas} de ${fases.length * 3} estrelas`), barra(feitas / (fases.length * 3), `Progresso em ${t.nome}`)),
    );
  });

  const avatares = AVATARES.map((id) =>
    h(
      'button',
      {
        type: 'button',
        class: id === estado.avatar ? `avatar grande av-${id} escolhido` : `avatar grande av-${id}`,
        'aria-pressed': String(id === estado.avatar),
        'aria-label': `Personagem ${NOME_DO_AVATAR[id]}`,
        'data-testid': `avatar-${id}`,
        onclick: () => acoes.escolherAvatar(id),
      },
      icone(id as Icone),
    ),
  );

  return h(
    'div',
    { class: 'perfil' },
    h(
      'section',
      { class: 'cartao-perfil relevo' },
      h('span', { class: `avatar enorme av-${estado.avatar}`, 'aria-hidden': 'true' }, icone(estado.avatar as Icone)),
      h('h1', { tabindex: -1 }, estado.apelido),
      h('p', { class: 'titulo-perfil', 'data-testid': 'titulo-perfil' }, `${tituloDoNivel(nivelAtual)} · Nível ${nivelAtual}`),
      barra((estrelasTotais % 3) / 3, 'Progresso para o próximo nível'),
      h('small', {}, `Faltam ${paraProximo} ${paraProximo === 1 ? 'estrela' : 'estrelas'} para o nível ${nivelAtual + 1}`),
    ),
    h(
      'div',
      { class: 'numeros' },
      numero('Estrelas', String(estrelasTotais), 'perfil-estrelas'),
      numero('Fases concluídas', String(concluidas), 'perfil-fases'),
      numero('Dias seguidos', String(estado.sequencia), 'perfil-sequencia'),
      numero('MVP', String(mvp(estado, iniciadas.flatMap((t) => t.unidades))), 'mvp'),
    ),
    h(
      'section',
      { class: 'relevo bloco' },
      h('h2', {}, 'Vidas'),
      h(
        'p',
        { class: 'vidas-perfil', 'aria-label': `${estado.vidas} de ${maximo} vidas` },
        ...Array.from({ length: maximo }, (_, i) => icone('coracao', i < estado.vidas ? 'cheia' : 'vazia')),
      ),
      h('p', { class: 'ficha-detalhe' }, 'Cada erro em uma lição gasta uma vida. Elas voltam cheias todo dia.'),
      estado.vidas < maximo
        ? h(
            'button',
            { type: 'button', class: 'botao pequeno', 'data-testid': 'recarregar-perfil', disabled: estado.dinheiro < CUSTO_RECARGA, onclick: () => acoes.recarregarVidas() },
            `Recarregar agora por ${dinheiro(CUSTO_RECARGA)}`,
          )
        : null,
    ),
    h('section', { class: 'relevo bloco' }, h('h2', {}, 'Personagem'), h('div', { class: 'avatares' }, ...avatares)),
    trilhas.length > 0 ? h('section', { class: 'relevo bloco' }, h('h2', {}, 'Suas trilhas'), h('ul', {}, ...trilhas)) : null,
    h(
      'button',
      {
        type: 'button',
        class: 'botao secundario',
        'data-testid': 'recomecar-tudo',
        onclick: () => {
          // Apaga o progresso inteiro: pede confirmação antes.
          if (window.confirm('Apagar todo o progresso e começar do zero?')) acoes.recomecar();
        },
      },
      'Começar do zero',
    ),
  );
}

import { CONQUISTAS, proximaFase } from '../content';
import { PESOS_MVP, mvpScore, parcelasMvp, type ParcelaMvp } from '../core/mvp';
import { estrelasDaFase, progressoNivel } from '../core/progressao';
import type { Estado, Fase } from '../core/tipos';
import { h } from '../ui/dom';
import { barra, dinheiro } from '../ui/formato';

export interface AcoesFim {
  proxima(faseId: string): void;
  recomecar(): void;
}

const ROTULO_PARCELA: Record<ParcelaMvp, string> = {
  conhecimento: 'Conhecimento',
  desempenho: 'Desempenho nos desafios',
  estrategia: 'Estratégia nas decisões',
  eficiencia: 'Eficiência',
  consistencia: 'Consistência',
  conquistas: 'Conquistas',
};

const DERROTA = {
  falencia: {
    titulo: 'Falência',
    texto: 'Sua conta ficou negativa por duas rodadas seguidas. Dívida que não é paga cresce sozinha: o primeiro passo é parar de gastar mais do que entra.',
  },
  burnout: {
    titulo: 'Esgotamento',
    texto: 'Sua energia chegou a zero. Descanso e lazer não são prêmio para depois do trabalho: são o que mantém você capaz de estudar e trabalhar.',
  },
} as const;

export function telaFim(estado: Estado, fase: Fase, acoes: AcoesFim): HTMLElement {
  if (estado.status === 'derrota' && estado.motivoDerrota !== null) {
    const derrota = DERROTA[estado.motivoDerrota];
    return h(
      'main',
      { class: 'tela fim', 'data-testid': 'tela-fim' },
      h('p', { class: 'sobretitulo' }, `Fase ${fase.numero} · ${fase.titulo}`),
      h('h1', { tabindex: -1, 'data-testid': 'fim-titulo' }, derrota.titulo),
      h('p', { class: 'contexto' }, derrota.texto),
      h('button', { type: 'button', class: 'botao', 'data-testid': 'recomecar', onclick: () => acoes.recomecar() }, 'Tentar de novo'),
    );
  }

  const estrelas = estrelasDaFase(estado.historico, fase.id);
  const mvp = mvpScore(estado, CONQUISTAS.length);
  const parcelas = parcelasMvp(estado, CONQUISTAS.length);
  const { nivel } = progressoNivel(estado.xp);
  const seguinte = proximaFase(fase.id);

  const linhasMvp = (Object.keys(PESOS_MVP) as ParcelaMvp[]).map((chave) =>
    h(
      'li',
      { class: 'atributo' },
      h('span', {}, `${ROTULO_PARCELA[chave]} (${Math.round(PESOS_MVP[chave] * 100)}%)`),
      h('span', { class: 'num' }, String(Math.round(parcelas[chave] * 100))),
      barra(parcelas[chave], ROTULO_PARCELA[chave], 'fina'),
    ),
  );

  const conquistas = CONQUISTAS.map((c) => {
    const tem = estado.conquistas.includes(c.id);
    return h(
      'li',
      { class: tem ? 'conquista' : 'conquista bloqueada' },
      h('strong', {}, c.titulo),
      h('span', {}, c.descricao),
      h('span', { class: 'selo' }, tem ? 'Conquistada' : 'Bloqueada'),
    );
  });

  return h(
    'main',
    { class: 'tela fim', 'data-testid': 'tela-fim' },
    h('p', { class: 'sobretitulo' }, `Fase ${fase.numero} · ${fase.titulo}`),
    h('h1', { tabindex: -1, 'data-testid': 'fim-titulo' }, 'Fase concluída'),
    h(
      'p',
      { class: 'estrelas', 'aria-label': `${estrelas} de 3 estrelas`, 'data-testid': 'estrelas' },
      '★'.repeat(estrelas),
      h('span', { class: 'apagada' }, '★'.repeat(3 - estrelas)),
    ),
    h(
      'div',
      { class: 'placar' },
      h('div', {}, h('span', { class: 'hud-rotulo' }, 'MVP'), h('span', { class: 'num grande', 'data-testid': 'fim-mvp' }, String(mvp))),
      h('div', {}, h('span', { class: 'hud-rotulo' }, 'Nível'), h('span', { class: 'num grande' }, String(nivel))),
      h('div', {}, h('span', { class: 'hud-rotulo' }, 'Dinheiro'), h('span', { class: 'num grande' }, dinheiro(estado.atributos.dinheiro))),
    ),
    h('section', { class: 'cartao' }, h('h2', {}, 'Como seu MVP foi calculado'), h('ul', {}, ...linhasMvp)),
    h('section', { class: 'cartao' }, h('h2', {}, 'Conquistas'), h('ul', { class: 'conquistas' }, ...conquistas)),
    seguinte !== undefined
      ? h(
          'button',
          { type: 'button', class: 'botao', 'data-testid': 'proxima-fase', onclick: () => acoes.proxima(seguinte.id) },
          `Ir para a fase ${seguinte.numero}: ${seguinte.titulo}`,
        )
      : h('p', { class: 'ajuda' }, 'Esta é a última fase disponível nesta versão.'),
    h(
      'button',
      { type: 'button', class: 'botao secundario', 'data-testid': 'recomecar', onclick: () => acoes.recomecar() },
      'Jogar de novo do início',
    ),
  );
}

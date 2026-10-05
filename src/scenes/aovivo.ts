import { converter, type Cotacao, type Noticia } from '../core/mercado';
import type { Estado } from '../core/tipos';
import { FONTES, buscarAcoes, buscarCambio, buscarNoticias, type AoVivo } from '../services/aovivo';
import { aoEntrar, h } from '../ui/dom';
import { decimal, dinheiro, haQuanto } from '../ui/formato';

const INTERVALO = 30_000;

function situacao<T>(resultado: AoVivo<T> | null, fonte: string): HTMLElement {
  if (resultado === null) {
    return h('p', { class: 'aviso', 'data-testid': 'offline' }, 'Sem conexão com a fonte agora. O jogo continua funcionando; tente de novo mais tarde.');
  }
  return h(
    'p',
    { class: 'fonte' },
    h('span', { class: resultado.atual ? 'ponto vivo' : 'ponto' }),
    resultado.atual ? `Ao vivo · ${haQuanto(resultado.quando)}` : `Sem conexão · último valor ${haQuanto(resultado.quando)}`,
    ` · Fonte: ${fonte}`,
  );
}

function linhaCotacao(c: Cotacao, casas: number): HTMLElement {
  const sobe = c.variacao >= 0;
  return h(
    'li',
    { class: 'cotacao' },
    h('div', {}, h('strong', {}, c.codigo), h('small', {}, c.nome)),
    h('b', {}, `R$ ${decimal(c.valor, c.valor >= 1000 ? 0 : casas)}`),
    // Seta e sinal além da cor, para não depender só de cor.
    h('span', { class: sobe ? 'variacao sobe' : 'variacao desce' }, `${sobe ? '▲ +' : '▼ −'}${decimal(Math.abs(c.variacao))}%`),
  );
}

/** Bolsa e câmbio ao vivo. Atualiza sozinho enquanto a tela está aberta. */
export function telaMercado(estado: Estado): HTMLElement {
  const cambio = h('div', { 'data-testid': 'painel-cambio' }, h('p', { class: 'carregando' }, 'Buscando cotações…'));
  const acoes = h('div', { 'data-testid': 'painel-acoes' }, h('p', { class: 'carregando' }, 'Buscando a bolsa…'));
  const raiz = h(
    'div',
    { class: 'aovivo' },
    h('h1', { tabindex: -1 }, 'Mercado ao vivo'),
    h('p', { class: 'contexto' }, 'Os números abaixo são reais e mudam o dia todo. Servem para você aprender a ler o mercado: o jogo não recomenda investimento.'),
    h('section', { class: 'relevo', id: 'cambio' }, h('h2', {}, 'Câmbio'), cambio),
    h('section', { class: 'relevo' }, h('h2', {}, 'Bolsa (B3)'), acoes),
  );

  async function atualizar(): Promise<void> {
    const [moedas, papeis] = await Promise.all([buscarCambio(), buscarAcoes()]);
    if (!raiz.isConnected) return;

    const dolar = moedas?.dados.find((c) => c.codigo === 'USD');
    cambio.replaceChildren(
      situacao(moedas, FONTES.cambio.nome),
      moedas !== null ? h('ul', { class: 'cotacoes' }, ...moedas.dados.map((c) => linhaCotacao(c, c.valor < 0.1 ? 4 : 2))) : '',
      dolar !== undefined && estado.dinheiro > 0
        ? h('p', { class: 'conversao' }, `Seu caixa de ${dinheiro(estado.dinheiro)} compraria `, h('b', {}, `US$ ${decimal(converter(estado.dinheiro, dolar))}`), ' hoje.')
        : '',
    );
    acoes.replaceChildren(
      situacao(papeis, FONTES.acoes.nome),
      papeis !== null ? h('ul', { class: 'cotacoes' }, ...papeis.dados.map((c) => linhaCotacao(c, 2))) : '',
      h('p', { class: 'ficha-detalhe' }, 'A porcentagem é a variação do preço no dia. Subir hoje não diz nada sobre amanhã: quem investe olha prazo e risco.'),
    );
    setTimeout(() => {
      if (raiz.isConnected) void atualizar();
    }, INTERVALO);
  }
  // Espera a tela entrar no documento antes da primeira busca.
  aoEntrar(raiz, () => void atualizar());
  return raiz;
}

function linhaNoticia(n: Noticia): HTMLElement {
  const quando = n.data === '' ? '' : haQuanto(Date.parse(n.data));
  return h(
    'li',
    {},
    h(
      'a',
      { class: 'noticia relevo', href: n.url, target: '_blank', rel: 'noopener noreferrer' },
      h('strong', {}, n.titulo),
      h('small', {}, `por ${n.autor}${quando === '' ? '' : ` · ${quando}`} · abre em outra aba`),
    ),
  );
}

export function telaNoticias(): HTMLElement {
  const lista = h('div', { 'data-testid': 'painel-noticias' }, h('p', { class: 'carregando' }, 'Buscando notícias…'));
  const raiz = h(
    'div',
    { class: 'aovivo' },
    h('h1', { tabindex: -1 }, 'Notícias de tecnologia'),
    h('p', { class: 'contexto' }, 'O que a comunidade brasileira de tecnologia está lendo agora. Os textos são de quem publicou, não do jogo.'),
    lista,
  );
  aoEntrar(raiz, () => {
    void buscarNoticias().then((noticias) => {
      if (!raiz.isConnected) return;
      lista.replaceChildren(
        situacao(noticias, FONTES.noticias.nome),
        noticias !== null ? h('ul', { class: 'noticias' }, ...noticias.dados.map(linhaNoticia)) : '',
      );
    });
  });
  return raiz;
}

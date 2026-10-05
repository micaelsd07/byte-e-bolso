import { ATRIBUTOS, type Atributo, type Categoria, type ClasseGasto, type Efeitos } from '../core/tipos';
import { h } from './dom';

const numero = new Intl.NumberFormat('pt-BR');

export function dinheiro(valor: number): string {
  return `${valor < 0 ? '− ' : ''}R$ ${numero.format(Math.abs(valor))}`;
}

export const ROTULO_ATRIBUTO: Record<Atributo, string> = {
  dinheiro: 'Dinheiro',
  energia: 'Energia',
  conhecimento: 'Conhecimento',
  tecnica: 'Habilidade técnica',
  reputacao: 'Reputação',
  saudeFinanceira: 'Saúde financeira',
  seguranca: 'Segurança digital',
  networking: 'Networking',
};

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  tecnologia: 'Tecnologia',
  financas: 'Finanças',
  seguranca: 'Segurança digital',
  carreira: 'Carreira',
};

export const ROTULO_CLASSE: Record<ClasseGasto, string> = {
  essencial: 'Essencial',
  futuro: 'Futuro',
  desejo: 'Desejo',
};

/** Extrato dos efeitos de um passo: sinal e seta além da cor, para não depender só de cor. */
export function extrato(efeitos: Efeitos): HTMLElement {
  const linhas = ATRIBUTOS.filter((a) => efeitos[a] !== undefined && efeitos[a] !== 0).map((a) => {
    const delta = efeitos[a] ?? 0;
    const sinal = delta > 0 ? '+' : '−';
    const valor = a === 'dinheiro' ? `${sinal} R$ ${numero.format(Math.abs(delta))}` : `${sinal} ${Math.abs(delta)}`;
    return h(
      'li',
      { class: delta > 0 ? 'extrato-linha sobe' : 'extrato-linha desce' },
      h('span', {}, ROTULO_ATRIBUTO[a]),
      h('span', { class: 'num' }, `${delta > 0 ? '▲' : '▼'} ${valor}`),
    );
  });
  if (linhas.length === 0) return h('p', { class: 'extrato-vazio' }, 'Nenhum atributo mudou.');
  return h('ul', { class: 'extrato', 'aria-label': 'O que mudou' }, ...linhas);
}

export function barra(fracao: number, rotulo: string, classe = ''): HTMLElement {
  const pct = Math.round(Math.min(1, Math.max(0, fracao)) * 100);
  const trilho = h('div', {
    class: `barra ${classe}`.trim(),
    role: 'progressbar',
    'aria-label': rotulo,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': pct,
  });
  const preenchimento = h('div', { class: 'barra-cheio' });
  preenchimento.style.width = `${pct}%`;
  trilho.append(preenchimento);
  return trilho;
}

import type { Categoria, ClasseGasto } from '../core/tipos';
import { h } from './dom';

const inteiro = new Intl.NumberFormat('pt-BR');

export function dinheiro(valor: number): string {
  return `${valor < 0 ? '− ' : ''}R$ ${inteiro.format(Math.abs(Math.round(valor)))}`;
}

export function decimal(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

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
  const cheio = h('div', { class: 'barra-cheio' });
  cheio.style.width = `${pct}%`;
  trilho.append(cheio);
  return trilho;
}

/** Três estrelas, com as conquistadas acesas. O texto alternativo diz quantas. */
export function estrelas(quantidade: number, classe = ''): HTMLElement {
  return h(
    'span',
    { class: `estrelas ${classe}`.trim(), role: 'img', 'aria-label': `${quantidade} de 3 estrelas` },
    ...[1, 2, 3].map((n) => h('span', { class: n <= quantidade ? 'estrela acesa' : 'estrela', 'aria-hidden': 'true' }, '★')),
  );
}

export function haQuanto(quando: number, agora = Date.now()): string {
  const segundos = Math.max(0, Math.round((agora - quando) / 1000));
  if (segundos < 60) return 'agora';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 24 ? `há ${horas} h` : `há ${Math.round(horas / 24)} d`;
}

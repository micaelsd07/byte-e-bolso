// Ícones desenhados para o jogo, em traço. São constantes fixas: nada de fora entra aqui.
const TRACOS = {
  cidade: 'M3 21V9l6-3v15M9 21V4l8 4v13M17 21v-8l4 2v6M2 21h20',
  empresa: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  mercado: 'M4 19V5M4 19h16M7 15l4-4 3 3 5-6',
  noticias: 'M5 5h11v14H7a2 2 0 0 1-2-2zM16 9h3v8a2 2 0 0 1-2 2M8 9h5M8 12h5M8 15h3',
  cadeado: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  coracao: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  foco: 'M13 3 5 13h6l-1 8 8-10h-6z',
  escudo: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  dica: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  esquerda: 'M15 5l-7 7 7 7',
  direita: 'M9 5l7 7-7 7',
  moeda: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4',
  triagem: 'M5 7h9v12H5zM10 5h9v12',
  orcamento: 'M5 4h14v16H5zM8 8h8M8 12h3M13 12h3M8 16h3M13 16h3',
  negociacao: 'M4 5h16v10H9l-5 4z',
  cambio: 'M4 9h13l-3-3M20 15H7l3 3',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  codigo: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  foguete: 'M12 3c4 2 6 6 6 10l-3 3H9l-3-3c0-4 2-8 6-10zM12 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9 16l-1 5 4-2 4 2-1-5',
  estrela: 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  planeta: 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM2.5 15.5c2.5 2.5 16.5-4.5 19-7',
  trofeu: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4',
  grade: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  relogio: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  certo: 'M5 12.5l4.5 4.5L19 7.5',
  terminal: 'M4 5h16v14H4zM7.5 10l3 2-3 2M12.5 15h4',
  chaves: 'M9 4C7 4 6 5 6 7v2.5C6 10.8 5.2 11.5 4 12c1.2.5 2 1.2 2 2.5V17c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2.5c0 1.3.8 2 2 2.5-1.2.5-2 1.2-2 2.5V17c0 2-1 3-3 3',
  camadas: 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5',
  cubo: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  layout: 'M4 5h16v14H4zM4 10h16M10 10v9',
} as const;

export type Icone = keyof typeof TRACOS;

/**
 * Ícone de cada trilha. São desenhos genéricos (terminal, chaves, camadas…), e
 * não o logotipo das linguagens, que é marca de terceiros.
 */
const DA_TRILHA: Record<string, Icone> = {
  python: 'terminal',
  javascript: 'chaves',
  java: 'camadas',
  c: 'chip',
  cpp: 'cubo',
  html: 'codigo',
  css: 'layout',
  carreira: 'empresa',
};

export function icone(nome: Icone, classe = ''): HTMLElement {
  const caixa = document.createElement('span');
  caixa.className = `icone ${classe}`.trim();
  caixa.setAttribute('aria-hidden', 'true');
  caixa.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${TRACOS[nome]}"/></svg>`;
  return caixa;
}

export function iconeDaTrilha(trilhaId: string, classe = ''): HTMLElement {
  return icone(DA_TRILHA[trilhaId] ?? 'codigo', classe);
}

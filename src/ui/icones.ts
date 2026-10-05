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
} as const;

export type Icone = keyof typeof TRACOS;

export function icone(nome: Icone, classe = ''): HTMLElement {
  const caixa = document.createElement('span');
  caixa.className = `icone ${classe}`.trim();
  caixa.setAttribute('aria-hidden', 'true');
  caixa.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${TRACOS[nome]}"/></svg>`;
  return caixa;
}

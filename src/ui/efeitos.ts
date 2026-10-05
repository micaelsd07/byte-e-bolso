import { h } from './dom';

export const semMovimento = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Anima um número do valor inicial ao final. Sem movimento, mostra o final direto. */
export function contar(el: HTMLElement, de: number, ate: number, formatar: (n: number) => string, ms = 900): void {
  if (semMovimento() || de === ate) {
    el.textContent = formatar(ate);
    return;
  }
  const inicio = performance.now();
  const quadro = (agora: number): void => {
    const t = Math.min(1, (agora - inicio) / ms);
    const suave = 1 - (1 - t) ** 3;
    el.textContent = formatar(de + (ate - de) * suave);
    if (t < 1 && el.isConnected) requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

const CORES = ['#ffc93c', '#4d8dff', '#3ddc97', '#ff6b6b', '#eef2ff'];

/** Chuva de confete sobre a tela. É só enfeite: some sozinha e não recebe foco. */
export function confete(pai: HTMLElement, pecas = 36): void {
  if (semMovimento()) return;
  const camada = h('div', { class: 'confete', 'aria-hidden': 'true' });
  for (let i = 0; i < pecas; i++) {
    const peca = h('i');
    peca.style.left = `${Math.random() * 100}%`;
    peca.style.background = CORES[i % CORES.length]!;
    peca.style.animationDelay = `${Math.random() * 0.5}s`;
    peca.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    peca.style.setProperty('--giro', `${Math.round(Math.random() * 720 - 360)}deg`);
    camada.append(peca);
  }
  pai.append(camada);
  setTimeout(() => camada.remove(), 3400);
}

/** Reinicia uma animação CSS de classe, para repetir o mesmo efeito em seguida. */
export function pulsar(el: HTMLElement, classe: string): void {
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
}

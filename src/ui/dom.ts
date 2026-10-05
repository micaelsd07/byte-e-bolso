type Filho = Node | string | number | null | false | undefined;
type Valor = string | number | boolean | null | undefined | ((evento: Event) => void);

/** Cria um elemento. `class` vira className, `onclick` e afins viram listeners, o resto vira atributo. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, Valor> = {},
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (typeof valor === 'function') el.addEventListener(chave.replace(/^on/, ''), valor);
    else if (chave === 'class') el.className = String(valor);
    else el.setAttribute(chave, valor === true ? '' : String(valor));
  }
  for (const filho of filhos) {
    if (filho === null || filho === undefined || filho === false) continue;
    el.append(filho instanceof Node ? filho : String(filho));
  }
  return el;
}

export function vibrar(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* aparelho sem vibração */
  }
}

/**
 * Roda a função quando o elemento entrar no documento. As telas são montadas
 * antes de serem inseridas (a troca passa por uma transição), então o que
 * depende de estar na página espera por aqui.
 */
export function aoEntrar(el: HTMLElement, fn: () => void, tentativas = 180): void {
  if (el.isConnected) fn();
  else if (tentativas > 0) requestAnimationFrame(() => aoEntrar(el, fn, tentativas - 1));
}

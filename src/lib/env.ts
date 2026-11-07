/** Utilidades pequeñas del entorno del navegador. */

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Busca un elemento obligatorio; si falta, falla temprano con un mensaje claro. */
export function requireEl<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Falta el elemento ${selector} en el HTML.`);
  return el;
}

/** Reinicia una animación CSS de una clase (p. ej. "shake") sobre un elemento. */
export function replayClass(el: Element, className: string): void {
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth; // fuerza un reflow para reiniciar la animación
  el.classList.add(className);
}

export const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

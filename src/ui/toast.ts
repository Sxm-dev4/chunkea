const VISIBLE_MS = 2600;

/** Avisos cortos en la parte baja de la pantalla (región aria-live). */
export function createToaster(el: HTMLElement): (html: string) => void {
  let timer = 0;
  return (html: string) => {
    el.innerHTML = html; // sólo textos propios (ver copy.ts)
    el.classList.add('show');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('show'), VISIBLE_MS);
  };
}

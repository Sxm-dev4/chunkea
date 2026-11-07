const SPEED_PX_PER_SECOND = 70;

/**
 * Cinta animada sin saltos: mide el grupo ya dibujado (con las fuentes cargadas),
 * lo repite hasta cubrir la pantalla y anima exactamente el ancho de un grupo.
 */
export function mountMarquee(track: HTMLElement): void {
  const base = track.querySelector<HTMLElement>('.marquee-group');
  if (!base) return;

  const build = (): void => {
    track.querySelectorAll('.marquee-group.clone').forEach((n) => n.remove());
    const width = base.getBoundingClientRect().width;
    if (!width) return;
    const copies = Math.ceil(window.innerWidth / width) + 1;
    for (let i = 0; i < copies; i++) {
      const clone = base.cloneNode(true) as HTMLElement;
      clone.classList.add('clone');
      clone.setAttribute('aria-hidden', 'true');
      track.append(clone);
    }
    track.style.setProperty('--mq-w', `${width}px`);
    track.style.setProperty('--mq-dur', `${(width / SPEED_PX_PER_SECOND).toFixed(2)}s`);
    track.classList.add('ready');
  };

  let lastWidth = window.innerWidth;
  let timer = 0;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return; // en móvil la barra de direcciones cambia el alto, no el ancho
    lastWidth = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(build, 150);
  });
  void document.fonts.ready.then(build);
}

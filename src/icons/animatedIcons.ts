/**
 * Iconos animados de AnimatedIcons (https://animatedicons.co, licencia gratuita sin atribución).
 *
 * Uso en el HTML:
 *   <span class="ai" data-ai="phone"></span>   → icono Lottie de src/assets/icons/phone.json
 *   <span class="ai" data-line="heart"></span> → icono de línea propio (icons/lineIcons.ts)
 * Opcional: data-size="32" (px) y data-theme="light | dark | white".
 *
 * Cada JSON y la librería Lottie se descargan sólo cuando el icono está por aparecer.
 */
import type { LottiePlayer } from 'lottie-web';
import { prefersReducedMotion, replayClass } from '../lib/env';
import { LINE_ICONS, isLineIconId } from './lineIcons';

type Theme = 'light' | 'dark' | 'white';
const THEMES: Readonly<Record<Theme, readonly [string, string]>> = {
  light: ['#2A0F24', '#C8237A'], // sobre fondos claros
  dark: ['#FFFFFF', '#E384E6'], // sobre fondos oscuros
  white: ['#FFFFFF', '#FFD3EC'], // sobre botones de color
};
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'white';

/* ---------- Tipos mínimos del JSON de Lottie que se modifican ---------- */
interface LottieColorProp {
  a: number;
  k: number[] | unknown;
}
interface LottieShape {
  ty: string;
  c?: LottieColorProp;
  w?: { a: number; k: number | unknown };
  it?: LottieShape[];
}
interface LottieLayer {
  nm?: string;
  td?: number;
  shapes?: LottieShape[];
}
interface LottieData {
  layers?: LottieLayer[];
}

const iconLoaders = import.meta.glob<LottieData>('../assets/icons/*.json', { import: 'default' });
const loaderFor = (name: string): (() => Promise<LottieData>) | undefined =>
  iconLoaders[`../assets/icons/${name}.json`];

let lottiePromise: Promise<LottiePlayer> | null = null;
const loadLottie = (): Promise<LottiePlayer> =>
  (lottiePromise ??= import('lottie-web/build/player/lottie_light').then(
    (m) => (m as unknown as { default: LottiePlayer }).default,
  ));

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

/** Grosor del trazo en la escala 48 px del icono, para que se vea parejo a cualquier tamaño. */
export const strokeForSize = (size: number): number => (size <= 26 ? 3 : size <= 40 ? 2.4 : 1.8);

/**
 * Pinta el icono con los colores de la marca (misma lógica que el embed oficial):
 * capas "s2g1" → color 1, "s2g2" → color 2, rellenos de fondo → color de la superficie.
 * Las capas que sirven de máscara (td) no se tocan para no romper los recortes.
 */
export function paintIcon(
  data: LottieData,
  [c1, c2]: readonly [string, string],
  strokeWidth: number,
  surface: readonly [number, number, number],
): LottieData {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  const walk = (items: LottieShape[], rgb: number[], isBackground: boolean, isMatte: boolean): void => {
    for (const item of items) {
      if (item.ty === 'st') {
        item.c = { a: 0, k: [...rgb, 1] };
        item.w = { a: 0, k: strokeWidth };
      } else if (item.ty === 'fl' && !isMatte && item.c) {
        const k = item.c.a ? null : (item.c.k as number[]);
        const isWhite = !!k && (k[0] ?? 0) > 0.95 && (k[1] ?? 0) > 0.95 && (k[2] ?? 0) > 0.95;
        item.c = { a: 0, k: [...(isBackground || isWhite ? surface : rgb), 1] };
      } else if (item.ty === 'gr' && item.it) {
        walk(item.it, rgb, isBackground, isMatte);
      }
    }
  };
  for (const layer of data.layers ?? []) {
    if (!layer.shapes) continue;
    const group = /s2g(\d)/.exec(layer.nm ?? '')?.[1];
    walk(layer.shapes, group === '2' ? rgb2 : rgb1, (layer.nm ?? '').includes('background'), layer.td === 1);
  }
  return data;
}

/** Color de fondo real detrás del icono (el primer ancestro con fondo opaco). */
function surfaceOf(el: Element): [number, number, number] {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const match = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
    if (match && (match.length < 4 || Number(match[3]) > 0.5)) {
      return [Number(match[0]) / 255, Number(match[1]) / 255, Number(match[2]) / 255];
    }
  }
  return [1, 0.965, 0.98];
}

const HOST_SELECTOR =
  'button, a, summary, .how-card, .price-card, .hero-facts li, .section-head, .footer-place';

async function mountIcon(el: HTMLElement): Promise<(() => void) | null> {
  const size = Number(el.dataset.size) || 22;
  const theme = THEMES[isTheme(el.dataset.theme) ? el.dataset.theme : 'light'];
  el.style.setProperty('--ai-s', `${size}px`);
  el.style.setProperty('--ai-g1', theme[0]);
  el.style.setProperty('--ai-g2', theme[1]);
  el.setAttribute('aria-hidden', 'true');
  const host = el.closest<HTMLElement>(HOST_SELECTOR) ?? el;

  // Icono de línea propio: animación CSS
  const lineId = el.dataset.line;
  if (isLineIconId(lineId)) {
    el.classList.add('ai-line');
    el.style.setProperty('--ai-sw', String(strokeForSize(size)));
    el.innerHTML = `<svg viewBox="0 0 48 48" focusable="false">${LINE_ICONS[lineId]}</svg>`;
    const wiggle = (): void => {
      if (!prefersReducedMotion()) replayClass(el, 'wig');
    };
    host.addEventListener('mouseenter', wiggle);
    host.addEventListener('click', wiggle);
    return wiggle;
  }

  // Icono animado (Lottie)
  const load = el.dataset.ai ? loaderFor(el.dataset.ai) : undefined;
  if (!load) return null;
  const [lottie, source] = await Promise.all([loadLottie(), load()]);
  const data = paintIcon(structuredClone(source), theme, strokeForSize(size), surfaceOf(el));
  const anim = lottie.loadAnimation({
    container: el,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: data,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });
  anim.addEventListener('DOMLoaded', () => anim.goToAndStop(0, true));
  const play = (): void => {
    if (!prefersReducedMotion()) anim.goToAndPlay(0, true);
  };
  host.addEventListener('mouseenter', play);
  host.addEventListener('click', play);
  return play;
}

/** Crea cada icono cuando está cerca de la pantalla y lo anima una vez al aparecer. */
export function mountAnimatedIcons(root: ParentNode = document): void {
  const icons = [...root.querySelectorAll<HTMLElement>('.ai')];
  const start = (el: HTMLElement): void => {
    mountIcon(el)
      .then((play) => {
        if (play) window.setTimeout(play, 250);
      })
      .catch((err: unknown) => console.warn('No se pudo cargar un icono animado', err));
  };
  if (!('IntersectionObserver' in window)) {
    icons.forEach(start);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        start(entry.target as HTMLElement);
      }),
    { rootMargin: '150px 0px' },
  );
  icons.forEach((el) => observer.observe(el));
}

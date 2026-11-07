import { prefersReducedMotion } from '../lib/env';
import { defaultRng, randomBetween } from '../lib/random';

const HEART = 'M24 42C11 33 5 25 5 17.5A10 10 0 0 1 24 12.5A10 10 0 0 1 43 17.5C43 25 37 33 24 42Z';
const SPARKLE = 'M24 2c2 13 7 18 20 20-13 2-18 7-20 20-2-13-7-18-20-20 13-2 18-7 20-20Z';
const STAR = 'M24 4l5.9 12 13.1 1.9-9.5 9.3 2.2 13.1L24 34l-11.7 6.3 2.2-13.1L5 17.9 18.1 16z';

/** Formas propias en los colores de la marca. */
const SHAPES: readonly (readonly [string, string])[] = [
  [HEART, '#C8237A'],
  [SPARKLE, '#E384E6'],
  [HEART, '#FF9BD2'],
  [STAR, '#FFD3EC'],
  [SPARKLE, '#FFFFFF'],
  [HEART, '#C8102E'],
];

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Lanza confeti desde la parte baja de la pantalla. */
export function burstConfetti(container: HTMLElement, count = 24, rng = defaultRng): void {
  if (prefersReducedMotion()) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const shape = SHAPES[i % SHAPES.length];
    if (!shape) continue;
    const [d, color] = shape;
    const piece = document.createElement('span');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('width', String(Math.round(randomBetween(rng, 16, 30))));
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#2A0F24');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    piece.append(svg);
    piece.style.left = `${W / 2 + randomBetween(rng, -60, 60)}px`;
    piece.style.top = `${H * 0.7}px`;
    container.append(piece);

    const dx = randomBetween(rng, -W * 0.45, W * 0.45);
    const dy = randomBetween(rng, -H * 0.75, -H * 0.25);
    piece.animate(
      [
        { transform: 'translate(0,0) scale(.4) rotate(0)', opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(1.1) rotate(${randomBetween(rng, -200, 200)}deg)`,
          opacity: 1,
          offset: 0.6,
        },
        {
          transform: `translate(${dx * 1.1}px, ${dy + H * 0.35}px) scale(.9) rotate(${randomBetween(rng, -360, 360)}deg)`,
          opacity: 0,
        },
      ],
      { duration: randomBetween(rng, 1100, 1700), easing: 'cubic-bezier(.2,.7,.4,1)' },
    ).onfinish = () => piece.remove();
  }
}

import type { SizeId } from '../config/site';
import { getChunki } from '../data/chunkis';
import { glyphSvg } from '../icons/glyphs';
import { seededRng } from '../lib/random';
import { SLOTS } from './placement';

/** Dibujo 2D del forro transparente (lienzo 300×600). */
export function caseSvg(size: SizeId): string {
  const lenses: readonly (readonly [number, number])[] =
    size === 'pequeno'
      ? [
          [60, 60],
          [112, 112],
        ]
      : [
          [60, 58],
          [60, 116],
          [114, 87],
        ];
  const lensSvg = lenses
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="23" fill="#0d0b10" stroke="#9b9ba8" stroke-width="4"/>` +
        `<circle cx="${x}" cy="${y}" r="11" fill="#1c2236"/><circle cx="${x - 4}" cy="${y - 4}" r="3.2" fill="#7f94c9" opacity=".7"/>`,
    )
    .join('');
  return `<svg viewBox="0 0 300 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect x="9" y="9" width="282" height="582" rx="48" fill="url(#glass)" stroke="rgba(255,255,255,.85)" stroke-width="5"/>
    <rect x="19" y="19" width="262" height="562" rx="40" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
    <rect x="24" y="22" width="128" height="128" rx="34" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.75)" stroke-width="3"/>
    ${lensSvg}
    <circle cx="118" cy="${size === 'pequeno' ? 52 : 40}" r="6.5" fill="#fff6d0" stroke="#9b9ba8" stroke-width="2"/>
    <rect x="291" y="150" width="6" height="70" rx="3" fill="rgba(255,255,255,.55)"/>
    <rect x="3" y="140" width="6" height="40" rx="3" fill="rgba(255,255,255,.55)"/>
    <rect x="3" y="195" width="6" height="40" rx="3" fill="rgba(255,255,255,.55)"/>
    <path d="M40 600L300 120V60L0 600z" fill="#fff" opacity=".06"/>
  </svg>`;
}

/** Posiciona un elemento de chunki (sólo vía CSSOM: compatible con la CSP). */
export function placeCharmElement(el: HTMLElement, x: number, y: number, rotation: number): void {
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.style.setProperty('--r', `${rotation}deg`);
}

/** Forro decorativo (hero e "Inspírate") con chunkis en posiciones fijas. */
export function createMiniCase(size: SizeId, ids: readonly string[], seed: number): HTMLElement {
  const rng = seededRng(seed);
  const wrap = document.createElement('div');
  wrap.className = 'mini-case';
  const art = document.createElement('div');
  art.className = 'device-art';
  art.innerHTML = caseSvg(size);
  wrap.append(art);

  ids.slice(0, SLOTS[size].length).forEach((id, i) => {
    const chunki = getChunki(id);
    const slot = SLOTS[size][i];
    if (!chunki || !slot) return;
    const charm = document.createElement('span');
    charm.className = chunki.mini ? 'charm mini' : 'charm';
    charm.innerHTML = glyphSvg(chunki.glyph);
    placeCharmElement(
      charm,
      slot[0] + (rng() - 0.5) * 5,
      slot[1] + (rng() - 0.5) * 3,
      Math.round((rng() - 0.5) * 50),
    );
    wrap.append(charm);
  });
  return wrap;
}

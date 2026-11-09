import type { SizeId } from '../config/site';
import { getChunki } from '../data/chunkis';
import { caseBox, caseImageUrl, cameraZoneFor, type Box } from '../data/phones';
import { glyphSvg } from '../icons/glyphs';
import { seededRng } from '../lib/random';
import { SLOTS, touchesCamera } from './placement';

/** Ancho y alto reales de los renders: reservan el espacio antes de que cargue la imagen. */
const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 1280;

/** Imagen del forro (sólo vía atributos y CSSOM: compatible con la CSP). */
export function createCaseImage(renderId: string, alt: string, priority = false): HTMLImageElement {
  const img = document.createElement('img');
  img.src = caseImageUrl(renderId);
  img.alt = alt;
  img.width = IMAGE_WIDTH;
  img.height = IMAGE_HEIGHT;
  img.decoding = 'async';
  img.draggable = false;
  if (priority) img.setAttribute('fetchpriority', 'high');
  else img.loading = 'lazy';
  return img;
}

/** Ajusta la capa de chunkis al área del forro dentro de la imagen. */
export function fitLayerToCase(layer: HTMLElement, box: Box): void {
  layer.style.left = `${box.x0 * 100}%`;
  layer.style.top = `${box.y0 * 100}%`;
  layer.style.width = `${(box.x1 - box.x0) * 100}%`;
  layer.style.height = `${(box.y1 - box.y0) * 100}%`;
}

/** Posiciona un elemento de chunki (sólo vía CSSOM: compatible con la CSP). */
export function placeCharmElement(el: HTMLElement, x: number, y: number, rotation: number): void {
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.style.setProperty('--r', `${rotation}deg`);
}

/** Forro decorativo (hero e "Inspírate") con chunkis en posiciones fijas. */
export function createMiniCase(
  renderId: string,
  size: SizeId,
  ids: readonly string[],
  seed: number,
  priority = false,
): HTMLElement {
  const rng = seededRng(seed);
  const wrap = document.createElement('div');
  wrap.className = 'mini-case';
  const art = document.createElement('div');
  art.className = 'device-art';
  art.append(createCaseImage(renderId, '', priority));
  const layer = document.createElement('div');
  layer.className = 'charm-layer';
  fitLayerToCase(layer, caseBox(renderId));
  wrap.append(art, layer);

  const zone = cameraZoneFor(renderId);
  const slots = SLOTS[size].filter(([x, y]) => !touchesCamera({ x, y }, zone));
  ids.slice(0, slots.length).forEach((id, i) => {
    const chunki = getChunki(id);
    const slot = slots[i];
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
    layer.append(charm);
  });
  return wrap;
}

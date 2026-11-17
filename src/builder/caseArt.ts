import { chunkiPiecePhoto, chunkiWidth } from '../data/chunkis';
import { caseImageUrl, type Box } from '../data/phones';

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

/** Pone la foto del chunki dentro del elemento y le da su tamaño real sobre el forro. */
export function fillCharmElement(el: HTMLElement, chunkiId: string, lazy = false): void {
  const img = document.createElement('img');
  // Cada chunki es una foto: los que no se ven al abrir la página se cargan al acercarse
  if (lazy) img.loading = 'lazy';
  img.src = chunkiPiecePhoto(chunkiId);
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  el.replaceChildren(img);
  el.style.setProperty('--w', `${chunkiWidth(chunkiId)}%`);
}

/** Posiciona un elemento de chunki (sólo vía CSSOM: compatible con la CSP). */
export function placeCharmElement(el: HTMLElement, x: number, y: number, rotation: number): void {
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.style.setProperty('--r', `${rotation}deg`);
}

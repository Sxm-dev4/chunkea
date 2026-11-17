import { getChunki } from '../data/chunkis';
import { caseBox, caseImageUrl, getPhone, renderIdFor } from '../data/phones';
import { prefersReducedMotion, replayClass } from '../lib/env';
import { createCaseImage, fillCharmElement, fitLayerToCase, placeCharmElement } from './caseArt';
import type { BuilderEvent, BuilderState, BuilderStore } from './store';

/** Grados que gira un chunk con cada toque del botón o de la tecla R. */
export const ROTATE_STEP = 15;

const DRAG_THRESHOLD_PX = 6;
const POOF_MS = 260;

export interface View2DElements {
  device: HTMLElement;
  art: HTMLElement;
  layer: HTMLElement;
  empty: HTMLElement;
}

/**
 * Vista principal: el render realista del forro con los chunks encima.
 * Se arrastran para moverlos y se tocan para elegirlos (y girarlos o quitarlos).
 */
export function mountView2D(store: BuilderStore, els: View2DElements): { bump(): void } {
  const nodes = new Map<number, HTMLButtonElement>();
  let renderedSrc: string | null = null;
  let currentImage: HTMLImageElement | null = null;

  const renderDevice = (state: Readonly<BuilderState>): void => {
    const renderId = renderIdFor(state.phoneId, state.size);
    const src = caseImageUrl(renderId, state.phoneColor);
    const alt = `Forro transparente para ${getPhone(state.phoneId)?.name ?? 'tu celular'}`;
    if (renderedSrc === src && currentImage) {
      // La misma foto puede ser la genérica o la del iPhone elegido: sólo cambia la descripción
      currentImage.alt = alt;
      return;
    }
    renderedSrc = src;
    const image = createCaseImage(renderId, alt, true, state.phoneColor);
    currentImage = image;
    const show = (): void => {
      if (renderedSrc !== src) return; // ya eligió otro modelo o color mientras cargaba
      els.art.replaceChildren(image);
      fitLayerToCase(els.layer, caseBox(renderId));
    };
    // La imagen anterior se queda hasta que la nueva esté lista: sin parpadeos
    if (els.art.firstChild) image.decode().then(show, show);
    else show();
  };

  const createNode = (uid: number, chunkiId: string): HTMLButtonElement | null => {
    const chunki = getChunki(chunkiId);
    if (!chunki) return null;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'charm';
    node.dataset.uid = String(uid);
    node.setAttribute('aria-label', `${chunki.name}: elegir para girar o quitar (R gira, Suprimir quita)`);
    fillCharmElement(node, chunki.id);
    els.layer.append(node);
    return node;
  };

  const renderCharms = (state: Readonly<BuilderState>, removedUid?: number): void => {
    const alive = new Set<number>();
    for (const charm of state.charms) {
      alive.add(charm.uid);
      const node = nodes.get(charm.uid) ?? createNode(charm.uid, charm.id);
      if (!node) continue;
      nodes.set(charm.uid, node);
      placeCharmElement(node, charm.x, charm.y, charm.r);
      const selected = charm.uid === state.selectedUid;
      node.classList.toggle('selected', selected);
      node.setAttribute('aria-pressed', String(selected));
    }
    nodes.forEach((node, uid) => {
      if (alive.has(uid)) return;
      nodes.delete(uid);
      if (uid === removedUid && !prefersReducedMotion()) {
        node.classList.add('poof');
        node.disabled = true;
        window.setTimeout(() => node.remove(), POOF_MS);
      } else {
        node.remove();
      }
    });
    els.empty.classList.toggle('is-hidden', state.charms.length > 0);
  };

  const onEvent = (state: Readonly<BuilderState>, event: BuilderEvent): void => {
    switch (event.type) {
      case 'init':
      case 'size-changed':
      case 'phone-changed':
      case 'combo-loaded':
      case 'cleared':
        renderDevice(state);
        // tras reacomodar, se recrean los nodos para repetir la animación de entrada
        nodes.forEach((n) => n.remove());
        nodes.clear();
        renderCharms(state);
        break;
      case 'color-changed':
        renderDevice(state); // sólo cambia la foto: los chunks se quedan donde están
        break;
      case 'added':
      case 'filled':
      case 'moved':
      case 'selected':
        renderCharms(state);
        break;
      case 'removed':
        renderCharms(state, event.uid);
        break;
      default:
        break;
    }
  };
  store.subscribe(onEvent);

  /* ---------- Arrastrar / tocar ---------- */
  let drag: {
    node: HTMLButtonElement;
    uid: number;
    sx: number;
    sy: number;
    moved: boolean;
    rect: DOMRect;
  } | null = null;

  els.layer.addEventListener('pointerdown', (e) => {
    const node = (e.target as Element).closest<HTMLButtonElement>('.charm');
    if (e.button > 0) return;
    if (!node) {
      store.selectCharm(null); // tocar el forro fuera de un chunk suelta la selección
      return;
    }
    drag = {
      node,
      uid: Number(node.dataset.uid),
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      rect: els.layer.getBoundingClientRect(),
    };
    node.setPointerCapture(e.pointerId);
  });

  els.layer.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    drag.node.classList.add('dragging');
    const x = ((e.clientX - drag.rect.left) / drag.rect.width) * 100;
    const y = ((e.clientY - drag.rect.top) / drag.rect.height) * 100;
    drag.node.style.left = `${Math.min(88, Math.max(12, x))}%`;
    drag.node.style.top = `${Math.min(94, Math.max(6, y))}%`;
  });

  const endDrag = (commit: boolean): void => {
    if (!drag) return;
    const { node, uid, moved } = drag;
    node.classList.remove('dragging');
    drag = null;
    if (!commit) return;
    if (!moved) store.selectCharm(store.getState().selectedUid === uid ? null : uid);
    else store.moveCharm(uid, parseFloat(node.style.left), parseFloat(node.style.top));
  };
  els.layer.addEventListener('pointerup', () => endDrag(true));
  els.layer.addEventListener('pointercancel', () => endDrag(false));

  // Teclado: Enter o Espacio eligen el chunk, R lo gira (Mayús+R al otro lado) y Suprimir lo quita
  els.layer.addEventListener('keydown', (e) => {
    const node = (e.target as Element).closest<HTMLButtonElement>('.charm');
    if (!node) return;
    const uid = Number(node.dataset.uid);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      store.selectCharm(store.getState().selectedUid === uid ? null : uid);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      store.removeCharm(uid);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      store.rotateCharm(uid, e.shiftKey ? -ROTATE_STEP : ROTATE_STEP);
    } else if (e.key === 'Escape') {
      store.selectCharm(null);
    }
  });
  // El click lo maneja pointerup; se evita que un Enter dispare dos veces
  els.layer.addEventListener('click', (e) => e.preventDefault());

  return { bump: () => replayClass(els.device, 'bump') };
}

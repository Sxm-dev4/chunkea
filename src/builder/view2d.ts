import { getChunki } from '../data/chunkis';
import { caseBox, getPhone, renderIdFor } from '../data/phones';
import { prefersReducedMotion, replayClass } from '../lib/env';
import { createCaseImage, fillCharmElement, fitLayerToCase, placeCharmElement } from './caseArt';
import type { BuilderEvent, BuilderState, BuilderStore } from './store';

const DRAG_THRESHOLD_PX = 6;
const POOF_MS = 260;

export interface View2DElements {
  device: HTMLElement;
  art: HTMLElement;
  layer: HTMLElement;
  empty: HTMLElement;
}

/**
 * Vista principal: el render realista del forro con los chunkis encima,
 * que se pueden arrastrar o tocar para quitarlos.
 */
export function mountView2D(store: BuilderStore, els: View2DElements): { bump(): void } {
  const nodes = new Map<number, HTMLButtonElement>();
  let renderedId: string | null = null;
  let currentImage: HTMLImageElement | null = null;

  const renderDevice = (state: Readonly<BuilderState>): void => {
    const renderId = renderIdFor(state.phoneId, state.size);
    const alt = `Forro transparente para ${getPhone(state.phoneId)?.name ?? 'tu celular'}`;
    if (renderedId === renderId && currentImage) {
      // La misma foto puede ser la genérica o la del iPhone elegido: sólo cambia la descripción
      currentImage.alt = alt;
      return;
    }
    renderedId = renderId;
    const image = createCaseImage(renderId, alt, true);
    currentImage = image;
    const show = (): void => {
      if (renderedId !== renderId) return; // ya eligió otro modelo mientras cargaba
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
    node.setAttribute('aria-label', `Quitar ${chunki.name}`);
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
      case 'added':
      case 'filled':
      case 'moved':
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
    if (!node || e.button > 0) return;
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
    if (!moved) store.removeCharm(uid);
    else store.moveCharm(uid, parseFloat(node.style.left), parseFloat(node.style.top));
  };
  els.layer.addEventListener('pointerup', () => endDrag(true));
  els.layer.addEventListener('pointercancel', () => endDrag(false));

  // Teclado: Enter, Espacio o Suprimir quitan el chunki enfocado
  els.layer.addEventListener('keydown', (e) => {
    const node = (e.target as Element).closest<HTMLButtonElement>('.charm');
    if (node && ['Enter', ' ', 'Delete', 'Backspace'].includes(e.key)) {
      e.preventDefault();
      store.removeCharm(Number(node.dataset.uid));
    }
  });
  // El click lo maneja pointerup; se evita que un Enter dispare dos veces
  els.layer.addEventListener('click', (e) => e.preventDefault());

  return { bump: () => replayClass(els.device, 'bump') };
}

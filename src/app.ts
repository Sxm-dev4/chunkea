import { mountControls } from './builder/controls';
import { createMiniCase } from './builder/caseArt';
import { buildOrderMessage, validateOrder, whatsappUrl } from './builder/order';
import { createBuilderStore, type BuilderEvent, type BuilderStore } from './builder/store';
import { mountView2D } from './builder/view2d';
import { mountView3D } from './builder/view3d';
import type { SceneController } from './builder/view3d/scene';
import { PRODUCTS, isSizeId } from './config/site';
import { COPY } from './copy';
import { chunkiPiecePhoto } from './data/chunkis';
import { COMBOS } from './data/combos';
import { REVIEWS, reviewPhoto } from './data/reviews';
import { GENERIC_RENDER, OTHER_PHONE } from './data/phones';
import { mountAnimatedIcons } from './icons/animatedIcons';
import { hydrateInlineIcons } from './icons/lineIcons';
import { prefersReducedMotion, replayClass, requireEl } from './lib/env';
import { burstConfetti } from './ui/confetti';
import { mountMarquee } from './ui/marquee';
import { mountReveal } from './ui/reveal';
import { mountReviews } from './ui/reviews';
import { createToaster } from './ui/toast';

const WHATSAPP_DELAY_MS = 450;

declare global {
  interface Window {
    /** Sólo con ?e2e en la URL: acceso a la vista 3D para las pruebas automáticas. */
    __chunkea3d?: SceneController;
  }
}

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

function mountDecorations(): void {
  const hero = document.getElementById('heroCase');
  const first = COMBOS[0];
  if (hero && first) {
    hero.append(createMiniCase(GENERIC_RENDER[first.size], first.size, first.items, 7, true));
  }

  // Combos pre armados dentro del armador (paso 2)
  const chips = document.getElementById('comboChips');
  COMBOS.forEach((combo, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'combo-chip';
    chip.dataset.comboChip = String(i);
    chip.title = `${combo.description} · ${PRODUCTS[combo.size].name.toLowerCase()}`;
    chip.setAttribute('aria-label', `Cargar el combo ${combo.name}`);
    const photo = document.createElement('span');
    photo.className = 'combo-chip-photo';
    const img = document.createElement('img');
    img.src = chunkiPiecePhoto(combo.items[0] ?? '');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    photo.append(img);
    chip.append(photo, combo.name);
    chips?.append(chip);
  });
}

function mountOrdering(store: BuilderStore, toast: (html: string) => void, confetti: HTMLElement): void {
  const model = requireEl<HTMLInputElement>('#model');
  const phone = requireEl<HTMLSelectElement>('#phone');
  const counter = requireEl('#counter');

  const order = (): void => {
    const state = store.getState();
    const problem = validateOrder(state);
    if (problem === 'missing-model') {
      // Sin elegir: se señala la lista. Otra marca: falta escribir el modelo
      const missing = state.phoneId === OTHER_PHONE ? model : phone;
      const field = missing.closest('.field');
      if (field) replayClass(field, 'invalid');
      missing.focus({ preventScroll: true });
      missing.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      toast(COPY.toast.missingModel);
      return;
    }
    if (problem === 'no-charms') {
      replayClass(counter, 'shake');
      toast(COPY.toast.noCharms);
      return;
    }
    const url = whatsappUrl(buildOrderMessage(state));
    burstConfetti(confetti, 36);
    toast(COPY.toast.opening);
    window.setTimeout(() => window.open(url, '_blank', 'noopener'), WHATSAPP_DELAY_MS);
  };

  document
    .querySelectorAll<HTMLButtonElement>('[data-order]')
    .forEach((b) => b.addEventListener('click', order));
}

/** Barra fija de pedido en móvil: visible sólo mientras se usa el armador. */
function mountOrderBar(): void {
  const bar = document.getElementById('orderBar');
  const builder = document.getElementById('arma');
  if (!bar || !builder || !('IntersectionObserver' in window)) return;
  const button = bar.querySelector<HTMLButtonElement>('button');
  new IntersectionObserver(
    ([entry]) => {
      const visible = !!entry?.isIntersecting;
      bar.classList.toggle('show', visible);
      bar.toggleAttribute('inert', !visible);
      if (button) button.tabIndex = visible ? 0 : -1;
    },
    { rootMargin: '-30% 0px -30% 0px' },
  ).observe(builder);
}

export function initApp(): void {
  hydrateInlineIcons();
  mountDecorations();

  const store = createBuilderStore();
  const toast = createToaster(requireEl('#toast'));
  const confetti = requireEl('#confetti');
  const stage = requireEl('.stage');
  const hint = requireEl('#stageHint');
  const counter = requireEl('#counter');
  requireEl('#stageEmpty').innerHTML = COPY.emptyCase;
  hint.innerHTML = COPY.hint2D;

  const view2d = mountView2D(store, {
    device: requireEl('#device'),
    art: requireEl('#deviceArt'),
    layer: requireEl('#charmLayer'),
    empty: requireEl('#stageEmpty'),
  });
  let scene: SceneController | null = null;
  const bump = (): void => {
    view2d.bump();
    scene?.bump();
  };

  mountControls(store);

  // Avisos y efectos según lo que pasa en el armador
  store.subscribe((state, event: BuilderEvent) => {
    const max = PRODUCTS[state.size].maxCharms;
    switch (event.type) {
      case 'added':
        bump();
        if (event.full) burstConfetti(confetti, 10);
        break;
      case 'rejected':
        replayClass(counter, 'shake');
        toast(COPY.toast.full);
        break;
      case 'size-changed':
      case 'phone-changed':
        bump();
        if (event.trimmed > 0) toast(COPY.toast.trimmed(event.trimmed, max));
        break;
      case 'filled':
        bump();
        burstConfetti(confetti, 14);
        toast(COPY.toast.surprise);
        break;
      case 'cleared':
        toast(COPY.toast.cleared);
        break;
      case 'combo-loaded':
        toast(COPY.toast.combo(event.name));
        break;
      default:
        break;
    }
  });

  requireEl('#btnRandom').addEventListener('click', () => {
    if (store.getState().charms.length >= store.product.maxCharms) toast(COPY.toast.fullSurprise);
    else store.surprise();
  });
  requireEl('#btnClear').addEventListener('click', () => store.clear());

  // Combos (dentro del armador no hace falta desplazarse) y botones de la sección de precios
  const builder = requireEl('#arma');
  document.getElementById('comboChips')?.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest<HTMLElement>('[data-combo-chip]');
    const combo = chip ? COMBOS[Number(chip.dataset.comboChip)] : undefined;
    if (combo) store.loadCombo(combo);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-start]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (isSizeId(btn.dataset.start)) store.setSize(btn.dataset.start);
      builder.scrollIntoView({ behavior: scrollBehavior() });
    }),
  );

  mountOrdering(store, toast, confetti);
  mountOrderBar();
  store.start();

  mountView3D({
    stage,
    store,
    onLoaded: (controller) => {
      scene = controller;
      if (new URLSearchParams(window.location.search).has('e2e')) window.__chunkea3d = controller;
    },
    onToggle: (active) => {
      hint.innerHTML = active ? COPY.hint3D : COPY.hint2D;
    },
  });

  const track = document.querySelector<HTMLElement>('.marquee-track');
  if (track) mountMarquee(track);
  const reviews = document.getElementById('resenas');
  if (reviews) mountReviews(reviews, REVIEWS, reviewPhoto);
  mountReveal();
  mountAnimatedIcons();

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}

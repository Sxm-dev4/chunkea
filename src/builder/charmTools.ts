import { getChunki } from '../data/chunkis';
import type { BuilderStore } from './store';
import { ROTATE_STEP } from './view2d';

/**
 * Barra del chunk elegido (en 2D y en 3D): girar a un lado u otro, quitarlo o soltarlo.
 * Aparece cuando se toca un chunk sobre el forro.
 */
export function mountCharmTools(store: BuilderStore, bar: HTMLElement): void {
  const name = bar.querySelector<HTMLElement>('[data-charm-name]');

  bar.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button');
    const uid = store.getState().selectedUid;
    if (!button || uid === null) return;
    if (button.dataset.rotate) store.rotateCharm(uid, Number(button.dataset.rotate) * ROTATE_STEP);
    else if (button.dataset.charmRemove !== undefined) store.removeCharm(uid);
    else if (button.dataset.charmDone !== undefined) store.selectCharm(null);
  });

  store.subscribe((state) => {
    const charm = state.charms.find((c) => c.uid === state.selectedUid);
    bar.hidden = !charm;
    if (charm && name) name.textContent = getChunki(charm.id)?.name ?? '';
  });
}

import { supportsWebGL } from '../../lib/env';
import type { BuilderStore } from '../store';
import type { SceneController } from './scene';

export interface View3DOptions {
  stage: HTMLElement;
  store: BuilderStore;
  /** La escena ya cargó (ocurre una sola vez). */
  onLoaded(controller: SceneController): void;
  /** Se abrió o se cerró la vista 3D. */
  onToggle(active: boolean): void;
}

/**
 * Vista 3D bajo demanda: three.js va en un chunk aparte y sólo se descarga la
 * primera vez que se pide. Sin WebGL, o si falla, se queda la vista con el render.
 */
export function mountView3D({ stage, store, onLoaded, onToggle }: View3DOptions): void {
  const tools = stage.querySelector<HTMLElement>('#stageTools');
  const toggle = stage.querySelector<HTMLButtonElement>('#tool3dToggle');
  if (!tools || !toggle || !supportsWebGL()) return;
  tools.hidden = false;

  let loaded = false;
  let active = false;

  const setActive = (next: boolean): void => {
    active = next;
    stage.classList.toggle('is-3d', next);
    toggle.textContent = next ? 'Ver foto' : 'Ver en 3D';
    onToggle(next);
  };

  const load = async (): Promise<void> => {
    stage.classList.add('loading3d');
    toggle.disabled = true;
    try {
      const [{ mountScene }] = await Promise.all([import('./scene'), document.fonts.ready]);
      const controller = await mountScene(stage, store, {
        reset: stage.querySelector<HTMLButtonElement>('#tool3dReset'),
        spin: stage.querySelector<HTMLButtonElement>('#tool3dSpin'),
      });
      loaded = true;
      onLoaded(controller);
      setActive(true);
    } catch (err) {
      console.warn('La vista 3D no está disponible; se queda la foto del forro.', err);
      tools.hidden = true;
    } finally {
      stage.classList.remove('loading3d');
      toggle.disabled = false;
    }
  };

  toggle.addEventListener('click', () => {
    if (loaded) setActive(!active);
    else void load();
  });
}

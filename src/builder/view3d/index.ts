import { supportsWebGL } from '../../lib/env';
import type { BuilderStore } from '../store';
import type { SceneController } from './scene';

export interface View3DOptions {
  stage: HTMLElement;
  store: BuilderStore;
  onActive(controller: SceneController): void;
}

/**
 * Carga el armador 3D (three.js va en un chunk aparte) sólo cuando el armador
 * está cerca de la pantalla. Si no hay WebGL o algo falla, se queda la vista 2D.
 */
export function mountView3D({ stage, store, onActive }: View3DOptions): void {
  if (!supportsWebGL() || !('IntersectionObserver' in window)) return;

  const start = async (): Promise<void> => {
    stage.classList.add('loading3d');
    try {
      const [{ mountScene }] = await Promise.all([import('./scene'), document.fonts.ready]);
      const controller = mountScene(stage, store, {
        reset: stage.querySelector<HTMLButtonElement>('#tool3dReset'),
        spin: stage.querySelector<HTMLButtonElement>('#tool3dSpin'),
      });
      stage.classList.add('is-3d');
      const tools = stage.querySelector<HTMLElement>('#stageTools');
      if (tools) tools.hidden = false;
      onActive(controller);
    } catch (err) {
      console.warn('El armador 3D no está disponible; se usa la vista 2D.', err);
    } finally {
      stage.classList.remove('loading3d');
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void start();
    },
    { rootMargin: '500px 0px' },
  );
  observer.observe(stage);
}

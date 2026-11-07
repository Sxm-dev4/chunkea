import { test as base, expect, type Page } from '@playwright/test';

/** Errores de consola, errores de JS y violaciones de CSP capturados durante la prueba. */
interface PageProblems {
  list: string[];
}

interface Options {
  /**
   * WebGL activo (armador 3D). Por defecto se apaga: sin GPU el 3D corre por software y
   * vuelve lentas las pruebas que no lo necesitan. Las pruebas del 3D usan `test.use({ webgl: true })`.
   */
  webgl: boolean;
}

export const test = base.extend<Options & { problems: PageProblems }>({
  webgl: [false, { option: true }],

  problems: [
    async ({ page, webgl }, use) => {
      const problems: PageProblems = { list: [] };
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.list.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => problems.list.push(`pageerror: ${err.message}`));

      await page.addInitScript((enableWebGL: boolean) => {
        document.addEventListener('securitypolicyviolation', (e) =>
          console.error(`CSP: ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
        );
        // WhatsApp no se abre de verdad: se guarda la URL para revisarla
        const w = window as unknown as { __opened: string[] };
        w.__opened = [];
        window.open = ((url?: string | URL) => {
          w.__opened.push(String(url));
          return null;
        }) as typeof window.open;

        if (!enableWebGL) {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (
            this: HTMLCanvasElement,
            type: string,
            ...rest: unknown[]
          ) {
            return /webgl/.test(type) ? null : original.call(this, type as '2d', ...(rest as []));
          } as typeof original;
        }
      }, webgl);

      await use(problems);
      expect(problems.list, 'La página no debe tener errores').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const openedUrls = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

/** Agrega chunkis desde el catálogo (sin depender de que estén visibles en pantalla). */
export async function addCharms(page: Page, ids: readonly string[]): Promise<void> {
  for (const id of ids) await page.locator(`[data-add="${id}"]`).dispatchEvent('click');
}

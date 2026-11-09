import { addCharms, expect, test } from './fixtures';

interface Scene3D {
  project(uid: number): { x: number; y: number } | null;
}
type TestWindow = Window & { __chunkea3d?: Scene3D };

test.describe('Armador 3D', () => {
  test.use({ webgl: true });

  test('el botón del 3D no tapa el globo de ayuda', async ({ page }) => {
    await page.goto('/');
    await page.locator('#arma').scrollIntoViewIfNeeded();
    await expect(page.locator('#tool3dToggle')).toBeVisible();
    const toggle = await page.locator('#tool3dToggle').boundingBox();
    const bubble = await page.locator('#stageEmpty').boundingBox();
    expect(toggle && bubble).toBeTruthy();
    const separated =
      toggle!.y + toggle!.height <= bubble!.y ||
      bubble!.y + bubble!.height <= toggle!.y ||
      toggle!.x + toggle!.width <= bubble!.x ||
      bubble!.x + bubble!.width <= toggle!.x;
    expect(separated).toBe(true);
  });

  test('sólo carga three.js al pedirlo y vuelve a la foto', async ({ page }) => {
    test.slow(); // sin GPU, el 3D corre por software
    const scripts: string[] = [];
    const models: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
      if (r.url().includes('.glb')) models.push(r.url());
    });
    await page.goto('/?e2e');
    await page.locator('#arma').scrollIntoViewIfNeeded();
    await expect(page.locator('#stageTools')).toBeVisible();
    await expect(page.locator('.stage-3d')).toHaveCount(0);
    await expect(page.locator('#tool3dSpin')).toBeHidden();
    expect(models).toEqual([]);
    const before = scripts.length;

    await page.locator('#tool3dToggle').click();
    await expect(page.locator('.stage.is-3d')).toBeVisible({ timeout: 30_000 });
    expect(scripts.length).toBeGreaterThan(before);
    await expect(page.locator('#tool3dToggle')).toHaveText('Ver foto');
    expect(models).toHaveLength(1);
    await expect(page.locator('#tool3dSpin')).toBeVisible();
    await expect(page.locator('#deviceArt')).toBeHidden();

    await page.locator('#tool3dToggle').click();
    await expect(page.locator('.stage.is-3d')).toHaveCount(0);
    await expect(page.locator('.stage-3d')).toBeHidden();
    await expect(page.locator('#deviceArt img')).toBeVisible();
    await expect(page.locator('#tool3dToggle')).toHaveText('Ver en 3D');

    // Al cambiar de celular se descarga el modelo de ese iPhone
    await page.locator('#phone').selectOption('iphone-se');
    await expect.poll(() => models.some((url) => url.includes('iphone-se'))).toBe(true);
  });

  test('se activa y permite mover y quitar chunkis', async ({ page, isMobile }) => {
    test.skip(isMobile, 'El arrastre con mouse se prueba en escritorio');
    test.slow(); // sin GPU, el 3D corre por software
    await page.goto('/?e2e');
    await page.locator('#arma').scrollIntoViewIfNeeded();
    await page.locator('#tool3dToggle').click();
    await expect(page.locator('.stage.is-3d')).toBeVisible({ timeout: 30_000 });

    await addCharms(page, ['osito', 'cereza']);
    await page.locator('.stage').scrollIntoViewIfNeeded();
    // espera a que el chunki termine de "caer"
    await page.waitForTimeout(1500);

    const design = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('chunkea-diseno-v1') ?? '{}') as { charms: { x: number }[] },
      );
    const uid = 1;
    const start = await page.evaluate((u) => (window as TestWindow).__chunkea3d?.project(u) ?? null, uid);
    expect(start).not.toBeNull();
    const before = (await design()).charms[0]?.x ?? 0;
    await page.mouse.move(start!.x, start!.y);
    await page.mouse.down();
    await page.mouse.move(start!.x + 60, start!.y + 80, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => (await design()).charms[0]?.x).not.toBe(before);

    await page.waitForTimeout(600);
    const now = await page.evaluate((u) => (window as TestWindow).__chunkea3d?.project(u) ?? null, uid);
    await page.mouse.click(now!.x, now!.y);
    await expect(page.locator('#countNow')).toHaveText('1');
  });
});

test.describe('Armador sin WebGL', () => {
  test.use({ webgl: false });

  test('se queda la foto del forro funcionando', async ({ page }) => {
    await page.goto('/');
    await page.locator('#arma').scrollIntoViewIfNeeded();
    await addCharms(page, ['osito']);
    await expect(page.locator('#charmLayer .charm')).toHaveCount(1);
    await expect(page.locator('.stage-3d')).toHaveCount(0);
    await expect(page.locator('#stageTools')).toBeHidden();
  });
});

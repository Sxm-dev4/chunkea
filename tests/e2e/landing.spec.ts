import AxeBuilder from '@axe-core/playwright';
import { addCharms, expect, openedUrls, test } from './fixtures';

test.describe('Landing', () => {
  test('carga con SEO básico y sin errores', async ({ page, problems }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Chunkea/);
    await expect(page.locator('h1')).toContainText('no chunkear');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(() => JSON.parse(jsonLd ?? '')).not.toThrow();
    expect(problems.list).toEqual([]);
  });

  test('no tiene scroll horizontal', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('no tiene problemas de accesibilidad graves', async ({ page }) => {
    test.slow(); // axe analiza toda la página: puede tardar si la máquina está ocupada
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test('el carrusel cubre todo el ancho sin huecos', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('.marquee-track.ready');
    await expect(track).toBeVisible();
    const { groupWidth, trackWidth, viewport } = await track.evaluate((el) => ({
      groupWidth: el.querySelector('.marquee-group')?.getBoundingClientRect().width ?? 0,
      trackWidth: el.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(trackWidth - groupWidth).toBeGreaterThanOrEqual(viewport);
  });
});

test.describe('Armador', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#arma').scrollIntoViewIfNeeded();
  });

  test('cuenta los chunkis y actualiza el resumen', async ({ page }) => {
    await addCharms(page, ['plata-osito', 'plata-cereza', 'plata-osito']);
    await expect(page.locator('#countNow')).toHaveText('3');
    await expect(page.locator('[data-id="plata-osito"] .pick-count')).toHaveText('2');
    await expect(page.locator('#sumSub')).toHaveText('3 chunkis');
    await page.locator('[data-remove="plata-osito"]').dispatchEvent('click');
    await expect(page.locator('#countNow')).toHaveText('2');
  });

  test('pide el modelo antes de abrir WhatsApp', async ({ page }) => {
    await addCharms(page, ['plata-osito']);
    await page.locator('#btnOrder').click();
    await expect(page.locator('#toast')).toContainText('celular');
    await expect(page.locator('#phone')).toBeFocused();
    expect(await openedUrls(page)).toEqual([]);
  });

  test('abre WhatsApp con el diseño en el mensaje', async ({ page }) => {
    await addCharms(page, ['plata-osito', 'plata-cereza', 'plata-osito']);
    await page.locator('#phone').selectOption('iphone-15');
    await page.locator('#btnOrder').click();
    await expect.poll(() => openedUrls(page)).toHaveLength(1);
    const [url] = await openedUrls(page);
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const text = decodeURIComponent(url?.split('text=')[1] ?? '');
    expect(text).toContain('*Celular:* iPhone 15');
    expect(text).toContain('• Osito (plateado) x2');
    expect(text).toContain('*Total:* $55.000');
  });

  test('un iPhone define el tamaño, el precio y la foto del forro', async ({ page }) => {
    await page.locator('#phone').selectOption('iphone-16-pro-max');
    await expect(page.locator('#phoneInfo')).toContainText('$60.000');
    await expect(page.locator('#sizeArea')).toBeHidden();
    await expect(page.locator('#modelField')).toBeHidden();
    await expect(page.locator('#deviceArt img')).toHaveAttribute('src', /iphone-16-pro-max/);
    await expect(page.locator('#deviceArt img')).toHaveAttribute('alt', /iPhone 16 Pro Max/);

    await page.locator('#phone').selectOption('iphone-se');
    await expect(page.locator('#phoneInfo')).toContainText('$55.000');
    await expect(page.locator('#countMax')).toHaveText('9');
    await expect(page.locator('#deviceArt img')).toHaveAttribute('src', /iphone-se/);
  });

  test('las fotos de los forros cargan sin errores', async ({ page, problems }) => {
    await page.locator('#phone').selectOption('iphone-17-pro');
    const image = page.locator('#deviceArt img');
    await expect(image).toHaveAttribute('src', /iphone-17-pro/);
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect(problems.list).toEqual([]);
  });

  test('con otra marca se escribe el modelo y se elige el tamaño', async ({ page }) => {
    await addCharms(page, ['plata-osito']);
    await page.locator('#phone').selectOption('otro');
    await expect(page.locator('#sizeArea')).toBeVisible();
    await page.locator('#btnOrder').click();
    await expect(page.locator('#model')).toBeFocused();
    await page.locator('#model').fill('Galaxy S24');
    await page.locator('[data-size="pequeno"]').click();
    await page.locator('#btnOrder').click();
    await expect.poll(() => openedUrls(page)).toHaveLength(1);
    const [url] = await openedUrls(page);
    const text = decodeURIComponent(url?.split('text=')[1] ?? '');
    expect(text).toContain('*Celular:* Galaxy S24');
    expect(text).toContain('*Total:* $55.000');
  });

  test('al cambiar a pequeño recorta a 9 y avisa', async ({ page }) => {
    await page.locator('#btnRandom').dispatchEvent('click');
    await expect(page.locator('#countNow')).toHaveText('13');
    await page.locator('[data-size="pequeno"]').click();
    await expect(page.locator('#countNow')).toHaveText('9');
    await expect(page.locator('#countMax')).toHaveText('9');
    await expect(page.locator('#toast')).toContainText('Quitamos 4');
    await expect(page.locator('#sumPrice')).toHaveText('$55.000');
  });

  test('filtra el catálogo por categoría', async ({ page }) => {
    await page.locator('.filter[data-cat="dorados"]').dispatchEvent('click');
    await expect(page.locator('.filter[data-cat="dorados"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pick-wrap:not([hidden])')).toHaveCount(45);
    await expect(page.locator('.pick-wrap:not([hidden])[data-cat="dorados"]')).toHaveCount(45);
  });

  test('recuerda el diseño al recargar', async ({ page }) => {
    await addCharms(page, ['plata-osito', 'plata-hongo']);
    await page.locator('#phone').selectOption('otro');
    await page.locator('#model').fill('Galaxy S24');
    await page.reload();
    await expect(page.locator('#countNow')).toHaveText('2');
    await expect(page.locator('#phone')).toHaveValue('otro');
    await expect(page.locator('#model')).toHaveValue('Galaxy S24');
  });

  test('carga un combo desde el armador sin salir de él', async ({ page }) => {
    await expect(page.locator('#comboChips .combo-chip')).toHaveCount(4);
    await page.locator('[data-combo-chip="2"]').dispatchEvent('click');
    await expect(page.locator('#countNow')).toHaveText('9');
    await expect(page.locator('[data-size="pequeno"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#toast')).toContainText('Dulce');
  });

  test('carga un combo de Inspírate', async ({ page }) => {
    await page.locator('[data-combo="2"]').dispatchEvent('click');
    await expect(page.locator('#countNow')).toHaveText('9');
    await expect(page.locator('[data-size="pequeno"]')).toHaveAttribute('aria-checked', 'true');
  });
});

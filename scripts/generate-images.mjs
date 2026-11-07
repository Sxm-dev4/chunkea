/**
 * Genera public/og-image.png (vista previa al compartir el enlace) y
 * public/apple-touch-icon.png (ícono al guardar el sitio en iPhone).
 *
 * Uso:  npm run build && npm run images
 * (levanta la vista previa del build, toma las capturas y la cierra)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4174, strictPort: true } });
const url = 'http://localhost:4174/';
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });

try {
  // Imagen para redes: el hero tal cual se ve en el sitio
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'public/og-image.png' });

  // Ícono de iPhone a partir del favicon
  const svg = await readFile('public/favicon.svg', 'utf8');
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await icon.setContent(
    `<html><body style="margin:0">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`,
  );
  await writeFile('public/apple-touch-icon.png', await icon.screenshot({ omitBackground: false }));
  console.log('Listo: public/og-image.png y public/apple-touch-icon.png');
} finally {
  await browser.close();
  server.httpServer.close();
}

/**
 * Prepara para la web los renders de scripts/render-cases.py:
 * - quita el tinte uniforme de la superficie de sombra,
 * - difumina la sombra hacia el borde de la imagen,
 * - genera src/assets/cases/*.webp y src/data/caseRenders.json.
 *
 * Uso: npm run renders:process -- <carpeta-del-render> [carpeta-para-los-png-finales]
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [input, masters] = process.argv.slice(2);
if (!input) {
  console.error('Uso: npm run renders:process -- <carpeta-del-render> [carpeta-para-los-png-finales]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outWebp = join(root, 'src/assets/cases');
const outManifest = join(root, 'src/data/caseRenders.json');

/** Suavidad de la curva de la sombra: más alto, menos sombra suave queda. */
const KNEE = 0.09;
/** Ancho del difuminado hacia el borde, como fracción del ancho de la imagen. */
const EDGE_FADE = 0.055;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** El tinte base es la mediana del alfa en el borde de la imagen. */
function borderAlpha(data, w, h) {
  const samples = [];
  for (let x = 0; x < w; x += 4) samples.push(data[x * 4 + 3], data[((h - 1) * w + x) * 4 + 3]);
  for (let y = 0; y < h; y += 4) samples.push(data[y * w * 4 + 3], data[(y * w + w - 1) * 4 + 3]);
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1];
}

async function processFile(file) {
  const { data, info } = await sharp(join(input, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const base = borderAlpha(data, w, h);
  const fade = Math.round(w * EDGE_FADE);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 3;
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const raw = Math.max(0, (data[i] - base) / (255 - base));
      // Curva suave: la sombra se desvanece sin dejar marca donde termina
      const alpha = raw === 0 ? 0 : ((raw * raw) / (raw + KNEE)) * (1 + KNEE);
      data[i] = Math.round(alpha * smoothstep(0, fade, edge) * 255);
    }
  }
  const image = () => sharp(data, { raw: { width: w, height: h, channels: 4 } });
  if (masters) await image().png({ compressionLevel: 9 }).toFile(join(masters, file));
  const target = join(outWebp, file.replace(/\.png$/, '.webp'));
  await image().webp({ quality: 88, alphaQuality: 92, effort: 6 }).toFile(target);
  const { size } = await stat(target);
  console.log(`${file}  tinte=${base}  webp=${Math.round(size / 1024)} KB`);
}

await mkdir(outWebp, { recursive: true });
if (masters) await mkdir(masters, { recursive: true });

const files = (await readdir(input)).filter((f) => f.endsWith('.png'));
for (const file of files) await processFile(file);
await copyFile(join(input, 'cases.json'), outManifest);
console.log(`Listo: ${files.length} renders.`);

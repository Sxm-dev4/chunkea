/**
 * Recorta cada chunki de las páginas del catálogo (fondo liso con etiquetas rosadas)
 * y genera src/assets/chunkis/*.webp con fondo transparente y src/data/chunkiPhotos.json.
 *
 * Uso: npm run chunkis:extract -- <plateados-1> <plateados-2> <plateados-3>
 *        <dorados-1> <dorados-2> <dorados-3> <coloridos-1> <coloridos-2> <coloridos-3>
 *
 * Cada chunki queda debajo de su etiqueta en el orden de lectura (fila por fila).
 * Si cambia el catálogo, actualiza PAGES con los ids en ese mismo orden.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PAGES = [
  // Plateados
  [
    'plata-sagrado-corazon',
    'plata-corazon-ojo-rosa',
    'plata-corazon-plano-mini',
    'plata-ojo-sol',
    'plata-corazon-3d',
    'plata-cara-hindu',
    'plata-soles',
    'plata-sol-luna',
    'plata-mano-hamsa',
    'plata-corazon-mini',
    'plata-rey-corazon-alas',
    'plata-astronauta',
    'plata-corazon-destello',
    'plata-espejo',
    'plata-corazon-cruz',
  ],
  [
    'plata-corazon-rey',
    'plata-cruz',
    'plata-rey-puntos-dobles',
    'plata-llave-san-benito',
    'plata-virgen',
    'plata-avion',
    'plata-corazon-ojo',
    'plata-ala-corazon',
    'plata-ancla',
    'plata-reina-roja',
    'plata-corazon-puas',
    'plata-arcoiris',
    'plata-cereza',
    'plata-hongo',
    'plata-trebol',
  ],
  [
    'plata-osito',
    'plata-mano-vacia',
    'plata-tortuga',
    'plata-corazon-mini-3d',
    'plata-corazon-coronita',
    'plata-leopardo',
    'plata-corazon-cupido',
    'plata-liston',
    'plata-rey-manzanita',
    'plata-rostro-sol-luna',
    'plata-elefante',
    'plata-ancla-mini',
    'plata-corazon-pellet',
  ],
  // Dorados
  [
    'oro-mini-cora-rojo',
    'oro-mini-cora-negro',
    'oro-corazon-negro-ojo-rojo',
    'oro-cruz',
    'oro-sagrado-corazon',
    'oro-corazon-estrella',
    'oro-trebol-negro',
    'oro-reina-corazon',
    'oro-astronauta',
    'oro-mano-hamsa',
    'oro-mano-hamsa-2',
    'oro-corazon-manzana',
    'oro-virgen',
    'oro-estrella-fugaz',
    'oro-om',
  ],
  [
    'oro-cerezas-rojas',
    'oro-leopardo',
    'oro-oso-grabado',
    'oro-rey-corazon-negro',
    'oro-cuadro-ojo',
    'oro-cuadro-mano',
    'oro-rostro-sol-luna',
    'oro-cupido',
    'oro-mano-nacar',
    'oro-oso-liso',
    'oro-letras',
    'oro-mano-mini',
    'oro-estrella-cardinal',
    'oro-pesas',
    'oro-avion',
  ],
  [
    'oro-ancla',
    'oro-argolla-curva',
    'oro-ojos-pintados',
    'oro-corazon-ojo-azul',
    'oro-talisman',
    'oro-ojo-corazon',
    'oro-ojo-pestanas',
    'oro-virgen-negra',
    'oro-virgen-roja',
    'oro-cerezas',
    'oro-ojo-gota-mini',
    'oro-ojo-gota-mini-azul',
    'oro-cora-mini-negro',
    'oro-cora-globo',
    'oro-corazones-mini',
  ],
  // Coloridos
  [
    'color-pan-salsa',
    'color-crispetas',
    'color-starbucks',
    'color-chocolate',
    'color-cheesecake',
    'color-corona',
    'color-pancito',
    'color-corazon-rojo',
    'color-coca-cola-lata',
    'color-coca-cola',
    'color-osito-goma',
    'color-hongo',
    'color-carita-feliz',
    'color-paletas',
    'color-pan-choco',
  ],
  [
    'color-cupcake',
    'color-waffle',
    'color-croissant',
    'color-pan-cacho',
    'color-toasts',
    'color-cereza',
    'color-lego',
    'color-estrella-mario',
    'color-pato',
    'color-paleta-bebe',
    'color-perritos',
    'color-dado-turco-fucsia',
    'color-licores-mini',
    'color-patico-mini',
    'color-deportivos',
  ],
  [
    'color-funny-face',
    'color-foca-neon',
    'color-baby-bubbles',
    'color-patito-lila-mini',
    'color-patito-azul-mini',
    'color-dulces',
    'color-pintura',
    'color-aji',
    'color-dado-turco-morado',
    'color-dado-turco-rosado',
    'color-dado-turco-rojo',
    'color-cutie-blanco',
    'color-cutie-rosado',
    'color-taza-cafe',
  ],
];

/**
 * Fotos con varias piezas sueltas (variantes de color o sets): en el selector se ve el grupo
 * y sobre el forro se pone sólo la pieza más grande.
 */
const GROUPS = new Set([
  'oro-ojos-pintados',
  'oro-corazones-mini',
  'color-starbucks',
  'color-lego',
  'color-perritos',
  'color-licores-mini',
  'color-deportivos',
  'color-foca-neon',
  'color-baby-bubbles',
  'color-dulces',
]);

const BACKGROUND = [240, 235, 233];
const LABEL = [241, 121, 234];
const BADGE = [250, 229, 239];
/**
 * Diferencia mínima con el fondo para considerarlo fondo. Se ajusta en cada página al ruido
 * del archivo: un PNG trae el fondo exacto y un WebP o JPG con pérdida lo trae con ruido.
 */
const MIN_BG_TOLERANCE = 3;
/** Rango de diferencia en el que el borde se vuelve semitransparente (antialias). */
const EDGE_RANGE = 28;
/** Tamaño máximo de las imágenes publicadas (lado mayor, en px). */
const MAX_SIDE = 240;
const TITLE_BOTTOM = 250;

const files = process.argv.slice(2);
if (files.length !== PAGES.length) {
  console.error(
    `Se esperan ${PAGES.length} páginas en orden (plateados, dorados, coloridos); llegaron ${files.length}.`,
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/assets/chunkis');
await mkdir(outDir, { recursive: true });

const near = (data, i, color, tolerance) =>
  Math.abs(data[i] - color[0]) <= tolerance &&
  Math.abs(data[i + 1] - color[1]) <= tolerance &&
  Math.abs(data[i + 2] - color[2]) <= tolerance;

/** Componentes conexas (8 vecinos) de una máscara; devuelve etiquetas y cajas. */
function components(mask, width, height, x0 = 0, y0 = 0, x1 = width, y1 = height) {
  const labels = new Int32Array(width * height);
  const boxes = [];
  const stack = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const start = y * width + x;
      if (!mask[start] || labels[start]) continue;
      const id = boxes.length + 1;
      const box = { id, x0: x, y0: y, x1: x, y1: y, area: 0 };
      labels[start] = id;
      stack.push(start);
      while (stack.length) {
        const p = stack.pop();
        const px = p % width;
        const py = (p - px) / width;
        box.area++;
        if (px < box.x0) box.x0 = px;
        if (px > box.x1) box.x1 = px;
        if (py < box.y0) box.y0 = py;
        if (py > box.y1) box.y1 = py;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1) continue;
            const q = ny * width + nx;
            if (mask[q] && !labels[q]) {
              labels[q] = id;
              stack.push(q);
            }
          }
        }
      }
      boxes.push(box);
    }
  }
  return { labels, boxes };
}

async function saveCrop(data, width, alpha, box, keep, target) {
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (box.y0 + y) * width + box.x0 + x;
      const a = keep(p) ? alpha[p] : 0;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        // Quita el tinte del fondo en los bordes semitransparentes
        const value = a > 0 ? BACKGROUND[c] + (data[p * 3 + c] - BACKGROUND[c]) / a : 0;
        out[o + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
      out[o + 3] = Math.round(a * 255);
    }
  }
  const image = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  await image
    .resize({
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      kernel: 'lanczos3',
    })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(target);
  return { w, h };
}

const manifest = {};
for (const [pageIndex, file] of files.entries()) {
  const ids = PAGES[pageIndex];
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const size = width * height;

  // Etiquetas rosadas y avisos de "agotado"
  const labelMask = new Uint8Array(size);
  const badgeMask = new Uint8Array(size);
  for (let p = 0; p < size; p++) {
    if (near(data, p * 3, LABEL, 6)) labelMask[p] = 1;
    else if (near(data, p * 3, BADGE, 3)) badgeMask[p] = 1;
  }
  const labels = components(labelMask, width, height).boxes.filter((b) => b.area > 8000 && b.x1 - b.x0 > 150);
  const badges = components(badgeMask, width, height).boxes.filter((b) => b.area > 2000);
  if (labels.length !== ids.length) {
    throw new Error(`${file}: ${labels.length} etiquetas, se esperaban ${ids.length}`);
  }
  // Orden de lectura: filas por altura y luego de izquierda a derecha
  labels.sort((a, b) => a.y0 - b.y0);
  const rows = [];
  for (const label of labels) {
    const row = rows.find((r) => Math.abs(r[0].y0 - label.y0) < 60);
    if (row) row.push(label);
    else rows.push([label]);
  }
  rows.forEach((row) => row.sort((a, b) => a.x0 - b.x0));
  const ordered = rows.flat();

  // Diferencia con el fondo y transparencia de cada pixel
  const diff = new Uint8Array(size);
  for (let p = 0; p < size; p++) {
    const i = p * 3;
    diff[p] = Math.max(
      Math.abs(data[i] - BACKGROUND[0]),
      Math.abs(data[i + 1] - BACKGROUND[1]),
      Math.abs(data[i + 2] - BACKGROUND[2]),
    );
  }
  // Ruido del fondo: pixels casi iguales al fondo en la franja del título (sin chunkis)
  const noise = [];
  for (let y = 20; y < TITLE_BOTTOM - 20; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const p = y * width + x;
      if (diff[p] < 30) noise.push(diff[p]);
    }
  }
  noise.sort((a, b) => a - b);
  const bgTolerance = Math.max(MIN_BG_TOLERANCE, (noise[Math.floor(noise.length * 0.995)] ?? 0) + 2);
  const isBackground = (p) => diff[p] <= bgTolerance;
  console.log(`-- ${basename(file)}: tolerancia de fondo ${bgTolerance}`);

  for (const [k, label] of ordered.entries()) {
    const id = ids[k];
    const rowIndex = rows.findIndex((r) => r.includes(label));
    const above = rowIndex > 0 ? Math.max(...rows[rowIndex - 1].map((l) => l.y1)) + 4 : TITLE_BOTTOM;
    const center = (label.x0 + label.x1) / 2;
    const x0 = Math.max(0, Math.round(center - 122));
    const x1 = Math.min(width, Math.round(center + 122));
    const y0 = above;
    // Margen sobre la etiqueta: su borde suavizado no es del color exacto de la etiqueta
    const y1 = label.y0 - 8;

    const mask = new Uint8Array(size);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = y * width + x;
        const inBadge = badges.some((b) => x >= b.x0 - 6 && x <= b.x1 + 6 && y >= b.y0 - 6 && y <= b.y1 + 6);
        if (!inBadge && !isBackground(p) && !labelMask[p]) mask[p] = 1;
      }
    }
    const found = components(mask, width, height, x0, y0, x1, y1);
    const parts = found.boxes.filter((b) => b.area >= 25).sort((a, b) => b.area - a.area);
    if (!parts.length) throw new Error(`${file}: no se encontró el chunki ${id}`);

    // Transparencia: el borde (junto al fondo) se suaviza; el interior es opaco
    const alpha = new Float32Array(size);
    for (const part of parts) {
      for (let y = part.y0; y <= part.y1; y++) {
        for (let x = part.x0; x <= part.x1; x++) {
          const p = y * width + x;
          if (found.labels[p] !== part.id) continue;
          let edge = false;
          for (let dy = -2; dy <= 2 && !edge; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const q = (y + dy) * width + x + dx;
              if (q >= 0 && q < size && isBackground(q)) {
                edge = true;
                break;
              }
            }
          }
          alpha[p] = edge ? Math.min(1, (diff[p] - bgTolerance) / EDGE_RANGE) : 1;
        }
      }
    }

    const ids_ = new Set(parts.map((b) => b.id));
    const groupBox = {
      x0: Math.min(...parts.map((b) => b.x0)),
      y0: Math.min(...parts.map((b) => b.y0)),
      x1: Math.max(...parts.map((b) => b.x1)),
      y1: Math.max(...parts.map((b) => b.y1)),
    };
    const photo = await saveCrop(
      data,
      width,
      alpha,
      groupBox,
      (p) => ids_.has(found.labels[p]),
      join(outDir, `${id}.webp`),
    );
    const entry = { w: photo.w, h: photo.h };
    if (GROUPS.has(id) && parts.length > 1) {
      const [main] = parts;
      const piece = await saveCrop(
        data,
        width,
        alpha,
        main,
        (p) => found.labels[p] === main.id,
        join(outDir, `${id}-pieza.webp`),
      );
      entry.piece = { w: piece.w, h: piece.h };
    }
    manifest[id] = entry;
    console.log(
      `${id.padEnd(30)} ${String(parts.length).padStart(2)} partes  ${entry.w}x${entry.h}${entry.piece ? `  pieza ${entry.piece.w}x${entry.piece.h}` : ''}`,
    );
  }
}

await writeFile(join(root, 'src/data/chunkiPhotos.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Listo: ${Object.keys(manifest).length} chunkis.`);

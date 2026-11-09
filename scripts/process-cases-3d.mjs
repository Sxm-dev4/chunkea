/**
 * Optimiza los GLB de scripts/export-cases-3d.py y los deja en src/assets/cases3d/.
 * Usa cuantización (KHR_mesh_quantization): three.js la entiende sin decodificadores
 * extra, así que no hace falta relajar la CSP para ejecutar WebAssembly.
 *
 * Uso: npm run models:process -- <carpeta-con-los-glb>
 */
import { mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld } from '@gltf-transform/functions';

const [input] = process.argv.slice(2);
if (!input) {
  console.error('Uso: npm run models:process -- <carpeta-con-los-glb>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'src/assets/cases3d');
await mkdir(output, { recursive: true });

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const files = (await readdir(input)).filter((f) => f.endsWith('.glb'));
for (const file of files) {
  const document = await io.read(join(input, file));
  await document.transform(
    weld(),
    dedup(),
    prune({ keepLeaves: true }),
    // 12 bits en las normales: con menos se notan bandas en los reflejos del plástico
    quantize({ quantizePosition: 14, quantizeNormal: 12 }),
  );
  const target = join(output, file);
  await io.write(target, document);
  const { size } = await stat(target);
  console.log(`${file}  ${Math.round(size / 1024)} KB`);
}
console.log(`Listo: ${files.length} modelos.`);

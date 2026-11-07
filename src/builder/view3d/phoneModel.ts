import * as THREE from 'three';
import type { SizeId } from '../../config/site';
import { CAMERA_ZONE } from '../placement';

/** Medidas del modelo (unidades de la escena). */
export interface PhoneDims {
  readonly W: number;
  readonly H: number;
  /** Altura (z) de la cara trasera del forro, donde se apoyan los chunkis. */
  readonly backTop: number;
}

const SIZES: Readonly<
  Record<
    SizeId,
    { scale: number; lenses: readonly (readonly [number, number])[]; flash: readonly [number, number] }
  >
> = {
  grande: {
    scale: 1,
    lenses: [
      [20, 9.7],
      [20, 19.3],
      [38, 14.5],
    ],
    flash: [39.3, 6.7],
  },
  pequeno: {
    scale: 0.9,
    lenses: [
      [20, 10],
      [37.3, 18.7],
    ],
    flash: [39.3, 8.7],
  },
};

const BASE_W = 0.78;
const BASE_H = 1.6;
const PHONE_DEPTH = 0.085;

function roundRect<T extends THREE.Path>(
  target: T,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
): T {
  const x = cx - w / 2;
  const y = cy - h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  target.lineTo(x + w, y + h - r);
  target.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  target.lineTo(x + r, y + h);
  target.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  target.lineTo(x, y + r);
  target.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return target;
}

function screenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1050;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 512, 1050);
    gradient.addColorStop(0, '#E384E6');
    gradient.addColorStop(0.55, '#C8237A');
    gradient.addColorStop(1, '#3a0f2c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 1050);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 46px Outfit, sans-serif';
    ctx.fillText('9:41', 256, 170);
    ctx.fillStyle = '#FFD3EC';
    ctx.font = '120px "Bagel Fat One", sans-serif';
    ctx.fillText('Chunkea', 256, 560);
    ctx.fillStyle = '#fff';
    ctx.font = '600 38px Outfit, sans-serif';
    ctx.fillText('chunkea tu vida', 256, 630);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Celular dentro del forro transparente. Devuelve el grupo, las medidas y las piezas "tocables". */
export function buildPhone(size: SizeId): {
  group: THREE.Group;
  dims: PhoneDims;
  hitTargets: THREE.Object3D[];
} {
  const spec = SIZES[size];
  const W = BASE_W * spec.scale;
  const H = BASE_H * spec.scale;
  const R = 0.13 * spec.scale;
  const PD = PHONE_DEPTH;
  const group = new THREE.Group();
  const toLocal = (px: number, py: number): [number, number] => [(px / 100 - 0.5) * W, (0.5 - py / 100) * H];

  // Isla de la cámara (misma zona que en la vista 2D)
  const [ix, iy] = toLocal((CAMERA_ZONE.x0 + CAMERA_ZONE.x1) / 2, (CAMERA_ZONE.y0 + CAMERA_ZONE.y1) / 2);
  const iw = ((CAMERA_ZONE.x1 - CAMERA_ZONE.x0) / 100) * W;
  const ih = ((CAMERA_ZONE.y1 - CAMERA_ZONE.y0) / 100) * H;
  const ir = 0.095 * W;

  // Celular
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundRect(new THREE.Shape(), 0, 0, W - 0.05, H - 0.05, R - 0.025), {
      depth: PD - 0.02,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 4,
      curveSegments: 24,
    }),
    new THREE.MeshStandardMaterial({ color: 0x1c1722, metalness: 0.55, roughness: 0.28 }),
  );
  body.geometry.translate(0, 0, -(PD - 0.02) / 2);
  body.receiveShadow = true;

  const sw = W - 0.085;
  const sh = H - 0.085;
  const screenGeometry = new THREE.ShapeGeometry(roundRect(new THREE.Shape(), 0, 0, sw, sh, R - 0.045), 24);
  const uv = screenGeometry.attributes.uv as THREE.BufferAttribute;
  const pos = screenGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);
  const screen = new THREE.Mesh(
    screenGeometry,
    new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }),
  );
  screen.rotation.y = Math.PI;
  screen.position.z = -PD / 2 - 0.0015;

  const island = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundRect(new THREE.Shape(), ix, iy, iw - 0.03, ih - 0.03, ir - 0.012), {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 16,
    }),
    new THREE.MeshStandardMaterial({ color: 0x2b2431, metalness: 0.6, roughness: 0.22 }),
  );
  island.position.z = PD / 2 - 0.006;
  island.castShadow = true;
  island.receiveShadow = true;
  group.add(body, screen, island);

  // Lentes y flash
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xa5a5b2, metalness: 1, roughness: 0.18 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x07070c,
    roughness: 0.04,
    metalness: 0.2,
    clearcoat: 1,
  });
  const tintMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x24305a,
    roughness: 0.05,
    metalness: 0.3,
    clearcoat: 1,
  });
  const lensR = 0.077 * W;
  const lensZ = PD / 2 + 0.024;
  for (const [lx, ly] of spec.lenses) {
    const [x, y] = toLocal(lx, ly);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(lensR, lensR * 1.02, 0.03, 40), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, lensZ);
    ring.castShadow = true;
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(lensR * 0.78, lensR * 0.78, 0.032, 40),
      glassMaterial,
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y, lensZ + 0.002);
    const tint = new THREE.Mesh(new THREE.CircleGeometry(lensR * 0.36, 32), tintMaterial);
    tint.position.set(x - lensR * 0.12, y + lensR * 0.12, lensZ + 0.0185);
    group.add(ring, glass, tint);
  }
  const [fx, fy] = toLocal(spec.flash[0], spec.flash[1]);
  const flash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * spec.scale, 0.018 * spec.scale, 0.02, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfff6d0,
      emissive: 0xfff1b8,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    }),
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(fx, fy, lensZ - 0.004);
  group.add(flash);

  // Forro transparente: tapa trasera (con hueco para la cámara) + bordes
  const caseMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.08,
    transmission: 1,
    thickness: 0.05,
    ior: 1.42,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    attenuationColor: new THREE.Color(0xf6e8f6),
    attenuationDistance: 2,
  });
  const backZ0 = PD / 2 + 0.004;
  const plateThickness = 0.014;
  const plateShape = roundRect(new THREE.Shape(), 0, 0, W, H, R);
  plateShape.holes.push(roundRect(new THREE.Path(), ix, iy, iw + 0.01, ih + 0.01, ir + 0.004));
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plateShape, {
      depth: plateThickness,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 28,
    }),
    caseMaterial,
  );
  plate.position.z = backZ0;
  plate.receiveShadow = true;
  const wallShape = roundRect(new THREE.Shape(), 0, 0, W, H, R);
  wallShape.holes.push(roundRect(new THREE.Path(), 0, 0, W - 0.032, H - 0.032, R - 0.016));
  const walls = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wallShape, {
      depth: PD + 0.01,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 3,
      curveSegments: 28,
    }),
    caseMaterial,
  );
  walls.position.z = -PD / 2 - 0.006;
  group.add(plate, walls);

  return {
    group,
    dims: { W, H, backTop: backZ0 + plateThickness + 0.004 },
    hitTargets: [plate, walls, body, island, screen],
  };
}

/** Libera la memoria de GPU de un grupo (geometrías, materiales y texturas). */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((m) => {
      if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
      m.dispose();
    });
  });
}

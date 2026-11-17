import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import logoSvg from '../../assets/brand/chunkea-logo.svg?raw';
import {
  phoneColor,
  phoneLook,
  type FrameMetal,
  type PhoneColor,
  type PhoneFinish,
  type PhoneFront,
  type PhoneLook,
} from '../../data/phones';

/** Medidas del modelo (unidades de la escena). */
export interface PhoneDims {
  readonly W: number;
  readonly H: number;
  /** Altura (z) de la cara trasera del forro, donde se apoyan los chunkis. */
  readonly backTop: number;
}

export interface PhoneModel {
  readonly group: THREE.Group;
  readonly dims: PhoneDims;
  readonly hitTargets: THREE.Object3D[];
  /** Pinta el iPhone con uno de sus colores oficiales. */
  setColor(color: PhoneColor): void;
}

/** Los modelos vienen en metros; la escena trabaja con un celular de unas 1.6 unidades de alto. */
const MODEL_SCALE = 10;
const CHARM_REST_OFFSET = 0.002;

const modelUrls = import.meta.glob<string>('../../assets/cases3d/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Color lineal, igual al que usa el material en Blender. */
const linear = (r: number, g: number, b: number): THREE.Color => new THREE.Color().setRGB(r, g, b);

/** Dibuja el logo oficial (los mismos vectores del sitio) centrado en (cx, cy) con el ancho pedido. */
function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, color: string): void {
  const viewBox = /viewBox="([^"]+)"/.exec(logoSvg)?.[1]?.split(' ').map(Number);
  if (!viewBox || viewBox.length !== 4 || typeof Path2D === 'undefined') return;
  const [x, y, w, h] = viewBox as [number, number, number, number];
  const scale = width / w;
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(cx - width / 2, cy - (h * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(-x, -y);
  for (const [, matrix = '', d = ''] of logoSvg.matchAll(/transform="matrix\(([^)]+)\)" d="([^"]+)"/g)) {
    const [a = 1, b = 0, c = 0, e = 1, f = 0, g = 0] = matrix.split(',').map(Number);
    ctx.save();
    ctx.transform(a, b, c, e, f, g);
    ctx.fill(new Path2D(d));
    ctx.restore();
  }
  ctx.restore();
}

/** Pantalla encendida, con la isla o el notch del modelo. */
function screenTexture(front: PhoneFront): THREE.CanvasTexture {
  const W = 512;
  const H = 1050;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#F179EA');
    gradient.addColorStop(0.55, '#D91E75');
    gradient.addColorStop(1, '#3a0f2c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 46px Jost, sans-serif';
    ctx.fillText('9:41', W / 2, front === 'home' ? 150 : 190);
    drawLogo(ctx, W / 2, 520, 400, '#D8F179');
    ctx.fillStyle = '#fff';
    ctx.font = '600 38px Jost, sans-serif';
    ctx.fillText('Let’s fun.', W / 2, 640);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    if (front === 'isla') ctx.roundRect(W / 2 - 78, 26, 156, 46, 23);
    else if (front === 'notch') ctx.roundRect(W / 2 - 118, -30, 236, 76, 24);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** El lente visto a través del cristal: barril negro, anillos y el vidrio interior con su reflejo azulado. */
function lensTexture(): THREE.CanvasTexture {
  const size = 256;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    const stops: readonly (readonly [number, number, number, number])[] = [
      [0, 0.002, 0.002, 0.004],
      [0.2, 0.003, 0.004, 0.009],
      [0.27, 0.014, 0.02, 0.045],
      [0.33, 0.004, 0.005, 0.012],
      [0.46, 0.003, 0.004, 0.007],
      [0.5, 0.03, 0.03, 0.036],
      [0.53, 0.004, 0.004, 0.006],
      [0.7, 0.006, 0.006, 0.008],
      [0.73, 0.026, 0.026, 0.03],
      [0.77, 0.004, 0.004, 0.005],
      [1, 0.003, 0.003, 0.004],
    ];
    for (const [position, r, g, b] of stops)
      gradient.addColorStop(position, `#${linear(r, g, b).getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    // Reflejo del recubrimiento en el vidrio interior
    const glint = ctx.createRadialGradient(half - 14, half - 16, 0, half - 14, half - 16, 30);
    glint.addColorStop(0, 'rgba(96,120,220,.5)');
    glint.addColorStop(1, 'rgba(96,120,220,0)');
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Sin brillos de las luces puntuales: en el render todo reflejo viene de paneles grandes y suaves.
 * Una luz puntual agrisa el vidrio esmerilado y deja un punto blanco en el plástico; el estudio ya
 * da los reflejos correctos, y las luces puntuales quedan para iluminar los chunkis.
 */
function studioReflectionsOnly<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_fragment>',
      `reflectedLight.directSpecular = vec3(0.0);
      #ifdef USE_CLEARCOAT
        clearcoatSpecularDirect = vec3(0.0);
      #endif
      #include <aomap_fragment>`,
    );
  };
  return material;
}

type Materials = Readonly<Record<string, THREE.Material>>;
let sharedMaterials: Materials | null = null;
const screens = new Map<PhoneFront, THREE.Material>();

/** Materiales que no cambian con el color del iPhone, según el nombre que traen del .blend. */
function getShared(): Materials {
  sharedMaterials ??= {
    Case_Transparente: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        color: linear(0.985, 0.99, 0.995),
        roughness: 0.02,
        transmission: 1,
        thickness: 0.02,
        ior: 1.49,
        attenuationColor: new THREE.Color(0xf6eef6),
        attenuationDistance: 2,
      }),
    ),
    Tel_Frontal: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        color: linear(0.004, 0.004, 0.005),
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
      }),
    ),
    Tel_Lente: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        map: lensTexture(),
        roughness: 0.03,
        clearcoat: 0.5,
        clearcoatRoughness: 0.01,
        specularIntensity: 0.5,
        specularColor: linear(0.65, 0.75, 1),
        // Película delgada: el tono iridiscente de las lentes reales
        iridescence: 0.6,
        iridescenceIOR: 1.38,
        iridescenceThicknessMinimum: 420,
        iridescenceThicknessMaximum: 420,
      }),
    ),
    Tel_Puerto: new THREE.MeshStandardMaterial({ color: linear(0.006, 0.006, 0.007), roughness: 0.7 }),
    Render_Flash: new THREE.MeshPhysicalMaterial({
      color: linear(0.97, 0.9, 0.68),
      emissive: linear(0.97, 0.9, 0.68),
      emissiveIntensity: 0.15,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
    Render_Sensor: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        color: linear(0.006, 0.006, 0.008),
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
      }),
    ),
  };
  return sharedMaterials;
}

function screenMaterial(front: PhoneFront): THREE.Material {
  let material = screens.get(front);
  if (!material) {
    material = new THREE.MeshBasicMaterial({ map: screenTexture(front), toneMapped: false });
    screens.set(front, material);
  }
  return material;
}

/** Vidrio de la tapa: brillante (11, 12, 13, 14) o esmerilado (los Pro y del 15 en adelante). */
const glass = (finish: PhoneFinish): THREE.MeshPhysicalMaterial =>
  studioReflectionsOnly(
    new THREE.MeshPhysicalMaterial(
      finish === 'brillante'
        ? { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }
        : { roughness: 0.46, clearcoat: 0.12, clearcoatRoughness: 0.32 },
    ),
  );

/** Qué tan pulido es el marco de cada metal. */
const FRAME_ROUGHNESS: Readonly<Record<FrameMetal, number>> = {
  aluminio: 0.44,
  acero: 0.1,
  titanio: 0.36,
  'titanio-pulido': 0.14,
};

interface Paint {
  readonly materials: Materials;
  setColor(color: PhoneColor): void;
}

/** Materiales propios de un celular: los que llevan su color. */
function createPaint(look: PhoneLook): Paint {
  const back = glass(look.back);
  const module = glass(look.moduleFinish);
  const frame = new THREE.MeshStandardMaterial({ metalness: 1, roughness: FRAME_ROUGHNESS[look.frame] });
  const ring = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.2 });
  const antenna = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const logo = studioReflectionsOnly(
    new THREE.MeshPhysicalMaterial({ roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
  );
  const gray = new THREE.Color(0x6b6b6e);
  const black = new THREE.Color(0x000000);
  return {
    materials: {
      Tel_Trasera: back,
      Tel_Modulo: module,
      Tel_Marco: frame,
      Tel_AroLente: ring,
      Tel_Antena: antenna,
      Tel_Logo: logo,
    },
    setColor(color) {
      back.color.set(color.back);
      module.color.set(color.module ?? color.back);
      frame.color.set(color.frame);
      ring.color.set(color.frame);
      antenna.color.set(color.frame).lerp(gray, 0.3);
      // El logo es del tono del celular pero pulido y un poco más oscuro, para que se lea
      logo.color.set(color.back).lerp(black, 0.16);
    },
  };
}

/** UV plana sobre los dos ejes más largos de la geometría (para el lente, que es un disco). */
function addPlanarUv(mesh: THREE.Mesh): void {
  const position = mesh.geometry.getAttribute('position');
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const axes = (['x', 'y', 'z'] as const).toSorted((a, b) => size[b] - size[a]);
  const [u, v] = [axes[0] ?? 'x', axes[1] ?? 'y'];
  const uv = new Float32Array(position.count * 2);
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    uv[i * 2] = (p[u] - box.min[u]) / (size[u] || 1);
    uv[i * 2 + 1] = (p[v] - box.min[v]) / (size[v] || 1);
  }
  mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** UV de la pantalla en coordenadas de la escena: se ve desde el frente del celular (-z). */
function addScreenUv(mesh: THREE.Mesh, bounds: THREE.Box3): void {
  const position = mesh.geometry.getAttribute('position');
  const size = bounds.getSize(new THREE.Vector3());
  const uv = new Float32Array(position.count * 2);
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    uv[i * 2] = 1 - (p.x - bounds.min.x) / size.x;
    uv[i * 2 + 1] = (p.y - bounds.min.y) / size.y;
  }
  mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function buildPhone(scene: THREE.Group, renderId: string): PhoneModel {
  const look = phoneLook(renderId);
  const paint = createPaint(look);
  const materials: Materials = {
    ...getShared(),
    ...paint.materials,
    Tel_Pantalla: screenMaterial(look.front),
  };
  const group = new THREE.Group();
  group.scale.setScalar(MODEL_SCALE);
  group.add(scene);
  group.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  const nameOf = (mesh: THREE.Mesh): string => (mesh.material as THREE.Material).name;
  const caseMesh = meshes.find((mesh) => nameOf(mesh) === 'Case_Transparente');
  if (!caseMesh) throw new Error('El modelo no trae el forro');

  for (const mesh of meshes) {
    const name = nameOf(mesh);
    if (name === 'Tel_Lente') addPlanarUv(mesh);
    if (name === 'Tel_Pantalla') addScreenUv(mesh, new THREE.Box3().setFromObject(mesh));
    mesh.material = materials[name] ?? mesh.material;
    mesh.receiveShadow = true;
    // El plástico deja pasar la luz: su sombra oscurecería el celular de adentro
    mesh.castShadow = mesh !== caseMesh && name !== 'Tel_Pantalla';
  }

  const size = new THREE.Box3().setFromObject(caseMesh).getSize(new THREE.Vector3());
  // Altura de la tapa: se mide en la zona plana, debajo de la cámara
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, -size.y * 0.25, 5),
    new THREE.Vector3(0, 0, -1),
  ).intersectObject(caseMesh)[0];
  const backTop = (ray?.point.z ?? size.z / 2) + CHARM_REST_OFFSET;

  paint.setColor(phoneColor(renderId, null));
  return { group, dims: { W: size.x, H: size.y, backTop }, hitTargets: meshes, setColor: paint.setColor };
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<PhoneModel>>();

/** Carga una sola vez el modelo de un celular (se descarga al pedirlo). */
export function loadPhone(renderId: string): Promise<PhoneModel> {
  const cached = cache.get(renderId);
  if (cached) return cached;
  const url = modelUrls[`../../assets/cases3d/${renderId}.glb`];
  if (!url) return Promise.reject(new Error(`No hay modelo 3D para ${renderId}`));
  const loading = loader.loadAsync(url).then((gltf) => buildPhone(gltf.scene, renderId));
  cache.set(renderId, loading);
  // Si falla la descarga, se puede volver a intentar
  loading.catch(() => cache.delete(renderId));
  return loading;
}

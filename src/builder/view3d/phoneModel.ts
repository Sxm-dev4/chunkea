import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

/** Anillos concéntricos del lente (los mismos del material de Blender). */
function lensTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const stops: readonly (readonly [number, number, number, number])[] = [
      [0, 0.002, 0.002, 0.004],
      [0.24, 0.002, 0.003, 0.006],
      [0.3, 0.009, 0.012, 0.024],
      [0.44, 0.003, 0.004, 0.007],
      [0.66, 0.006, 0.006, 0.008],
      [0.7, 0.022, 0.022, 0.026],
      [0.74, 0.004, 0.004, 0.005],
      [1, 0.003, 0.003, 0.004],
    ];
    for (const [position, r, g, b] of stops)
      gradient.addColorStop(position, `#${linear(r, g, b).getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

/** Equivalentes en tiempo real de los materiales del render, según el nombre que traen del .blend. */
function getMaterials(): Materials {
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
    Tel_Trasera: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        color: linear(0.012, 0.012, 0.015),
        roughness: 0.33,
        clearcoat: 0.15,
        clearcoatRoughness: 0.3,
      }),
    ),
    Tel_Modulo: studioReflectionsOnly(
      new THREE.MeshPhysicalMaterial({
        color: linear(0.012, 0.012, 0.015),
        roughness: 0.17,
        clearcoat: 0.3,
        clearcoatRoughness: 0.08,
      }),
    ),
    Tel_AroLente: new THREE.MeshStandardMaterial({
      color: linear(0.22, 0.225, 0.24),
      metalness: 1,
      roughness: 0.2,
    }),
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
    Tel_Pantalla: new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }),
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

function buildPhone(scene: THREE.Group): PhoneModel {
  const materials = getMaterials();
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

  return { group, dims: { W: size.x, H: size.y, backTop }, hitTargets: meshes };
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<PhoneModel>>();

/** Carga una sola vez el modelo de un celular (se descarga al pedirlo). */
export function loadPhone(renderId: string): Promise<PhoneModel> {
  const cached = cache.get(renderId);
  if (cached) return cached;
  const url = modelUrls[`../../assets/cases3d/${renderId}.glb`];
  if (!url) return Promise.reject(new Error(`No hay modelo 3D para ${renderId}`));
  const loading = loader.loadAsync(url).then((gltf) => buildPhone(gltf.scene));
  cache.set(renderId, loading);
  // Si falla la descarga, se puede volver a intentar
  loading.catch(() => cache.delete(renderId));
  return loading;
}

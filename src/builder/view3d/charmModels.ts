import * as THREE from 'three';
import { chunkiAspect, chunkiPiecePhoto } from '../../data/chunkis';

/**
 * Chunki 3D: la foto real recortada sobre una lámina, con capas oscuras detrás que le dan
 * canto cuando se gira el forro. La foto ya trae su luz, así que no la vuelve a iluminar.
 */

const loader = new THREE.TextureLoader();
const plane = new THREE.PlaneGeometry(1, 1);
const textures = new Map<string, THREE.Texture>();
const templates = new Map<string, THREE.Group>();

/** Grosor del chunki en proporción a su ancho y número de capas del canto. */
const THICKNESS = 0.07;
const EDGE_LAYERS = 3;
const EDGE_COLOR = 0x2a2328;
/** Pixels con menos opacidad que esto no se dibujan (ni proyectan sombra). */
const ALPHA_CUTOFF = 0.5;

function textureFor(id: string): THREE.Texture {
  const cached = textures.get(id);
  if (cached) return cached;
  const texture = loader.load(chunkiPiecePhoto(id));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textures.set(id, texture);
  return texture;
}

/** Plantilla 3D (1 de ancho, en el plano XY, mirando a +Z). Se cachea por chunki. */
export function charmTemplate(id: string): THREE.Group {
  const cached = templates.get(id);
  if (cached) return cached;

  const texture = textureFor(id);
  const aspect = chunkiAspect(id);
  const group = new THREE.Group();

  const edge = new THREE.MeshBasicMaterial({
    map: texture,
    color: EDGE_COLOR,
    alphaTest: ALPHA_CUTOFF,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < EDGE_LAYERS; i++) {
    const layer = new THREE.Mesh(plane, edge);
    layer.scale.set(1, aspect, 1);
    layer.position.z = (THICKNESS * i) / EDGE_LAYERS;
    group.add(layer);
  }

  const front = new THREE.Mesh(
    plane,
    new THREE.MeshBasicMaterial({ map: texture, alphaTest: ALPHA_CUTOFF, toneMapped: false }),
  );
  front.scale.set(1, aspect, 1);
  front.position.z = THICKNESS;
  front.castShadow = true;
  group.add(front);

  templates.set(id, group);
  return group;
}

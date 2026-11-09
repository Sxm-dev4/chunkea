import * as THREE from 'three';

/**
 * Estudio que se refleja en el forro: las mismas luces del render de Blender,
 * como paneles que brillan. Sólo se usa para generar el mapa de reflejos.
 * Blender (x, y, z) equivale aquí a (x, z, -y).
 */
const PANELS: readonly {
  position: readonly [number, number, number];
  size: readonly [number, number];
  strength: number;
  tint?: number;
}[] = [
  { position: [-0.1, 0.75, 0.75], size: [1.1, 0.5], strength: 3 }, // luz general suave
  { position: [0.1, -0.7, 0.7], size: [1.1, 0.4], strength: 0.5, tint: 0xffebfa }, // rebote inferior
  { position: [-0.62, 0.05, 0.2], size: [0.14, 1.1], strength: 12, tint: 0xfff8f2 }, // borde izquierdo
  { position: [0.62, 0.05, 0.16], size: [0.14, 1.1], strength: 14, tint: 0xffebfa }, // borde derecho
  { position: [0, 0.6, -0.9], size: [1.2, 0.7], strength: 2 }, // para cuando se ve el frente del celular
];

export function createStudio(): THREE.Scene {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color().setRGB(0.012, 0.011, 0.012);
  const target = new THREE.Vector3(0, 0, 0);
  for (const { position, size, strength, tint = 0xffffff } of PANELS) {
    const color = new THREE.Color(tint).multiplyScalar(strength);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    panel.position.set(position[0], position[1], position[2]);
    panel.lookAt(target);
    studio.add(panel);
  }
  return studio;
}

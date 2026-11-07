import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLYPHS, type GlyphId } from '../../icons/glyphs';

/**
 * Convierte el dibujo SVG de cada chunki en una pieza 3D:
 * los rellenos se extruyen con bordes redondeados y los trazos sueltos se vuelven tubos.
 */

const MATERIALS = {
  silver: new THREE.MeshStandardMaterial({
    color: 0xf4f4fa,
    metalness: 1,
    roughness: 0.14,
    envMapIntensity: 1.5,
  }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe3b347, metalness: 1, roughness: 0.22 }),
  mirror: new THREE.MeshStandardMaterial({ color: 0xdfe9f2, metalness: 1, roughness: 0.03 }),
  ruby: new THREE.MeshPhysicalMaterial({
    color: 0xa50a24,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    sheen: 0.3,
    sheenColor: new THREE.Color(0xff5a72),
  }),
  blue: new THREE.MeshPhysicalMaterial({
    color: 0x6e9fd8,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xf7f6fa, roughness: 0.25, clearcoat: 0.8 }),
  dark: new THREE.MeshPhysicalMaterial({ color: 0x222028, roughness: 0.25, clearcoat: 0.8 }),
};

/** Los degradados del SVG se cambian por colores "clave" antes de leerlo. */
const GRADIENT_KEYS: Readonly<Record<string, string>> = {
  'url(#ag)': '#010101',
  'url(#rb)': '#020202',
  'url(#bl)': '#030303',
  'url(#gd)': '#040404',
  'url(#mr)': '#050505',
};
const BY_KEY: Readonly<Record<string, THREE.Material>> = {
  '#010101': MATERIALS.silver,
  '#020202': MATERIALS.ruby,
  '#030303': MATERIALS.blue,
  '#040404': MATERIALS.gold,
  '#050505': MATERIALS.mirror,
};

const tmpColor = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };
const materialCache = new Map<string, THREE.Material>();

const normalizeHex = (color: string): string => {
  const c = color.trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(c) ? `#${[...c.slice(1)].map((ch) => ch + ch).join('')}` : c;
};
const lightness = (color: string): number => {
  tmpColor.set(normalizeHex(color)).getHSL(hsl);
  return hsl.l;
};
const isDark = (color: string): boolean => lightness(color) < 0.35;
const isWhite = (color: string): boolean => lightness(color) > 0.94;

function materialFor(color: string): THREE.Material {
  const hex = normalizeHex(color);
  const keyed = BY_KEY[hex];
  if (keyed) return keyed;
  const cached = materialCache.get(hex);
  if (cached) return cached;
  tmpColor.set(hex).getHSL(hsl);
  let material: THREE.Material;
  if (hsl.l > 0.94) material = MATERIALS.white;
  else if (hsl.l < 0.22) material = MATERIALS.dark;
  else if (hsl.s < 0.16 && hsl.l > 0.42)
    material = new THREE.MeshStandardMaterial({ color: tmpColor.clone(), metalness: 1, roughness: 0.3 });
  else
    material = new THREE.MeshPhysicalMaterial({
      color: tmpColor.clone(),
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
    });
  materialCache.set(hex, material);
  return material;
}

/** Curva 2D del SVG elevada a una altura z fija (para crear tubos). */
class LiftedCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly path: THREE.Path,
    private readonly z: number,
  ) {
    super();
  }
  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const p = this.path.getPoint(t);
    return target.set(p.x, p.y, this.z);
  }
}

const loader = new SVGLoader();
const templates = new Map<GlyphId, THREE.Group>();

const DEPTH = 1.1;
const BEVEL = 0.65;
const STEP = 0.8;

function glyphSvgSource(id: GlyphId): string {
  let body: string = GLYPHS[id];
  for (const [key, value] of Object.entries(GRADIENT_KEYS)) body = body.split(key).join(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${body}</svg>`;
}

/** Plantilla 3D (diámetro 1, en el plano XY, relieve hacia +Z). Se cachea por dibujo. */
export function charmTemplate(id: GlyphId): THREE.Group {
  const cached = templates.get(id);
  if (cached) return cached;

  const data = loader.parse(glyphSvgSource(id));
  const placed: { box: THREE.Box2; z: number }[] = [];
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const push = (material: THREE.Material, geometry: THREE.BufferGeometry): void => {
    const list = buckets.get(material) ?? [];
    list.push(geometry);
    buckets.set(material, list);
  };
  // Sólo se apila sobre lo que se superpone (así las cuentas de un medallón no hacen escalera)
  const baseFor = (box: THREE.Box2): number =>
    placed.reduce((z, p) => (p.box.intersectsBox(box) ? Math.max(z, p.z + STEP) : z), 0);
  const topFor = (box: THREE.Box2): number =>
    placed.reduce((t, p) => (p.box.intersectsBox(box) ? Math.max(t, p.z + DEPTH + BEVEL) : t), DEPTH + BEVEL);

  for (const path of data.paths) {
    const style = (path.userData?.style ?? {}) as Record<string, unknown>;
    const fill = typeof style.fill === 'string' && style.fill !== 'none' ? style.fill : null;
    const stroke = typeof style.stroke === 'string' && style.stroke !== 'none' ? style.stroke : null;
    const strokeWidth = Number(style.strokeWidth) || 1;
    const opacity = Number(style.opacity ?? 1);
    const fillOpacity = Number(style.fillOpacity ?? 1);
    let filled = false;

    // Los brillos blancos semitransparentes los pone la luz real
    if (fill && !(isWhite(fill) && (opacity < 1 || fillOpacity < 1))) {
      for (const shape of path.toShapes()) {
        const points = shape.getPoints(8);
        if (points.length < 3 || Math.abs(THREE.ShapeUtils.area(points)) < 1.2) continue;
        const box = new THREE.Box2().setFromPoints(points);
        const size = box.getSize(new THREE.Vector2());
        const bevel = Math.min(1.15, Math.min(size.x, size.y) * 0.22);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: DEPTH,
          bevelEnabled: true,
          bevelThickness: Math.max(BEVEL, bevel * 1.1),
          bevelSize: bevel,
          bevelOffset: -bevel, // redondea hacia adentro, sin engordar la forma
          bevelSegments: 5,
          curveSegments: 12,
        });
        const z = baseFor(box);
        geometry.translate(0, 0, z);
        push(materialFor(fill), geometry);
        placed.push({ box, z });
        filled = true;
      }
    }

    // Trazos sin relleno (tallos, aros, arcoíris, detalles): tubos.
    // Se omiten los contornos oscuros gruesos (son el "borde" del dibujo 2D).
    if (stroke && !filled && !isWhite(stroke) && !(isDark(stroke) && strokeWidth >= 3.5)) {
      const radius = isDark(stroke) ? Math.max(strokeWidth / 2, 0.6) : Math.max(strokeWidth / 2, 1.15);
      for (const subPath of path.subPaths) {
        const points = subPath.getPoints();
        const length = subPath.getLength();
        if (points.length < 2 || !(length > 0.5)) continue;
        const first = points[0];
        const last = points[points.length - 1];
        const box = new THREE.Box2().setFromPoints(points).expandByScalar(radius);
        const zCenter = topFor(box) - radius * 0.35;
        const closed = !!first && !!last && first.distanceTo(last) < 0.05;
        const segments = Math.min(160, Math.max(12, Math.ceil(length * 1.6)));
        const geometry = new THREE.TubeGeometry(
          new LiftedCurve(subPath, zCenter),
          segments,
          radius,
          10,
          closed,
        ).toNonIndexed();
        push(materialFor(stroke), geometry);
        placed.push({ box, z: zCenter - DEPTH * 0.5 });
      }
    }
  }

  const inner = new THREE.Group();
  buckets.forEach((geometries, material) => {
    const merged = mergeGeometries(
      geometries.map((g) => (g.index ? g.toNonIndexed() : g)),
      false,
    );
    geometries.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    inner.add(mesh);
  });
  const s = 1 / 48;
  inner.scale.set(s, -s, s); // en SVG la "y" crece hacia abajo
  inner.position.set(-24 * s, 24 * s, 0);

  const template = new THREE.Group();
  template.add(inner);
  templates.set(id, template);
  return template;
}

import type { SizeId } from '../config/site';
import { randomBetween, type Rng } from '../lib/random';

/** Posición de un chunki en % del forro (0–100) y su rotación en grados. */
export interface Position {
  x: number;
  y: number;
}

/** Zona de la cámara en % del forro (no se pueden poner chunkis encima). */
export interface CameraZone {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** Zona genérica: la vista 3D y los diseños sin un iPhone elegido. */
export const DEFAULT_CAMERA_ZONE: CameraZone = { x0: 8, x1: 50.7, y0: 3.7, y1: 25 };

/** Límites para que los chunkis no se salgan del forro. */
export const CASE_BOUNDS = { minX: 12, maxX: 88, minY: 6, maxY: 94 } as const;

/**
 * Margen para que el chunki completo (no sólo su centro) quede fuera de la cámara:
 * medio chunki, que mide el 19% del ancho del forro (y el forro es el doble de alto que de ancho).
 */
const CAMERA_MARGIN = { x: 9.5, y: 5 } as const;

/** Posiciones sugeridas, en un orden que reparte los chunkis por todo el forro. */
export const SLOTS: Readonly<Record<SizeId, readonly (readonly [number, number])[]>> = {
  grande: [
    [76, 9],
    [58, 47],
    [26, 32],
    [64, 77],
    [22, 62],
    [79, 38],
    [48, 91],
    [52, 30],
    [32, 78],
    [78, 58],
    [30, 47],
    [50, 63],
    [78, 23],
  ],
  pequeno: [
    [76, 12],
    [50, 48],
    [30, 34],
    [66, 76],
    [24, 56],
    [76, 56],
    [48, 90],
    [68, 30],
    [36, 73],
  ],
};

/** Distancia "visual": el forro es el doble de alto que de ancho. */
const visualDistance = (a: Position, b: Position): number => Math.hypot(a.x - b.x, (a.y - b.y) * 1.6);

export const isInCameraZone = (
  { x, y }: Position,
  zone: CameraZone = DEFAULT_CAMERA_ZONE,
  margin = 0,
): boolean => x < zone.x1 + margin && y < zone.y1 + margin;

/** Un chunki centrado en este punto tocaría la cámara. */
export const touchesCamera = ({ x, y }: Position, zone: CameraZone = DEFAULT_CAMERA_ZONE): boolean =>
  x < zone.x1 + CAMERA_MARGIN.x && y < zone.y1 + CAMERA_MARGIN.y;

/** Busca un lugar libre: primero las posiciones sugeridas, luego al azar fuera de la cámara. */
export function findFreeSpot(
  occupied: readonly Position[],
  size: SizeId,
  rng: Rng,
  zone: CameraZone = DEFAULT_CAMERA_ZONE,
): Position {
  for (const [sx, sy] of SLOTS[size]) {
    const slot = { x: sx, y: sy };
    if (touchesCamera(slot, zone)) continue;
    if (occupied.every((p) => visualDistance(p, slot) > 11)) {
      return clampToCase({ x: sx + randomBetween(rng, -3, 3), y: sy + randomBetween(rng, -1.5, 1.5) }, zone);
    }
  }
  for (let i = 0; i < 40; i++) {
    const candidate = { x: randomBetween(rng, 18, 82), y: randomBetween(rng, 10, 92) };
    if (touchesCamera(candidate, zone)) continue;
    if (occupied.every((p) => visualDistance(p, candidate) > 9)) return candidate;
  }
  return clampToCase({ x: randomBetween(rng, 20, 80), y: randomBetween(rng, 30, 90) }, zone);
}

/** Mantiene un punto dentro del forro y fuera de la cámara (empujándolo al borde más cercano). */
export function clampToCase(pos: Position, zone: CameraZone = DEFAULT_CAMERA_ZONE): Position {
  let x = Math.min(CASE_BOUNDS.maxX, Math.max(CASE_BOUNDS.minX, pos.x));
  let y = Math.min(CASE_BOUNDS.maxY, Math.max(CASE_BOUNDS.minY, pos.y));
  const right = zone.x1 + CAMERA_MARGIN.x;
  const below = zone.y1 + CAMERA_MARGIN.y;
  if (x < right && y < below) {
    // Con módulos de todo el ancho (iPhone 17 Pro, Air) a la derecha no hay espacio: va abajo
    if (right <= CASE_BOUNDS.maxX && right - x < (below - y) * 1.9) x = right;
    else y = below;
  }
  return { x, y };
}

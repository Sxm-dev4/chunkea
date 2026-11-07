import type { SizeId } from '../config/site';
import { randomBetween, type Rng } from '../lib/random';

/** Posición de un chunki en % del forro (0–100) y su rotación en grados. */
export interface Position {
  x: number;
  y: number;
}

/** Zona de la cámara en % (no se pueden poner chunkis encima). */
export const CAMERA_ZONE = { x0: 8, x1: 50.7, y0: 3.7, y1: 25 } as const;

/** Límites para que los chunkis no se salgan del forro. */
export const CASE_BOUNDS = { minX: 12, maxX: 88, minY: 6, maxY: 94 } as const;

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

export const isInCameraZone = ({ x, y }: Position, margin = 0): boolean =>
  x < CAMERA_ZONE.x1 + margin && y < CAMERA_ZONE.y1 + margin;

/** Busca un lugar libre: primero las posiciones sugeridas, luego al azar fuera de la cámara. */
export function findFreeSpot(occupied: readonly Position[], size: SizeId, rng: Rng): Position {
  for (const [sx, sy] of SLOTS[size]) {
    const slot = { x: sx, y: sy };
    if (occupied.every((p) => visualDistance(p, slot) > 11)) {
      return { x: sx + randomBetween(rng, -3, 3), y: sy + randomBetween(rng, -1.5, 1.5) };
    }
  }
  for (let i = 0; i < 40; i++) {
    const candidate = { x: randomBetween(rng, 18, 82), y: randomBetween(rng, 10, 92) };
    if (isInCameraZone(candidate, 3)) continue;
    if (occupied.every((p) => visualDistance(p, candidate) > 9)) return candidate;
  }
  return { x: randomBetween(rng, 20, 80), y: randomBetween(rng, 30, 90) };
}

/** Mantiene un punto dentro del forro y fuera de la cámara (empujándolo al borde más cercano). */
export function clampToCase(pos: Position): Position {
  let x = Math.min(CASE_BOUNDS.maxX, Math.max(CASE_BOUNDS.minX, pos.x));
  let y = Math.min(CASE_BOUNDS.maxY, Math.max(CASE_BOUNDS.minY, pos.y));
  const right = CAMERA_ZONE.x1 + 4;
  const below = CAMERA_ZONE.y1 + 3;
  if (x < right && y < below) {
    if (right - x < (below - y) * 1.9) x = right;
    else y = below;
  }
  return { x, y };
}

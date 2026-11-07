import { describe, expect, it } from 'vitest';
import {
  CASE_BOUNDS,
  SLOTS,
  clampToCase,
  findFreeSpot,
  isInCameraZone,
  type Position,
} from '../../src/builder/placement';
import { seededRng } from '../../src/lib/random';

describe('findFreeSpot', () => {
  it('usa primero la primera posición sugerida', () => {
    const spot = findFreeSpot([], 'grande', seededRng(1));
    const [sx, sy] = SLOTS.grande[0] ?? [0, 0];
    expect(Math.abs(spot.x - sx)).toBeLessThanOrEqual(3);
    expect(Math.abs(spot.y - sy)).toBeLessThanOrEqual(1.5);
  });

  it('reparte los chunkis sin ponerlos sobre la cámara', () => {
    const rng = seededRng(7);
    const placed: Position[] = [];
    for (let i = 0; i < 13; i++) placed.push(findFreeSpot(placed, 'grande', rng));
    expect(placed.every((p) => !isInCameraZone(p))).toBe(true);
  });

  it('siempre devuelve un punto aunque el forro esté lleno', () => {
    const crowded = Array.from({ length: 60 }, (_, i) => ({
      x: 15 + (i % 8) * 10,
      y: 8 + Math.floor(i / 8) * 12,
    }));
    const spot = findFreeSpot(crowded, 'pequeno', seededRng(3));
    expect(Number.isFinite(spot.x) && Number.isFinite(spot.y)).toBe(true);
  });
});

describe('clampToCase', () => {
  it('mantiene el punto dentro de los bordes del forro', () => {
    expect(clampToCase({ x: -10, y: 200 })).toEqual({ x: CASE_BOUNDS.minX, y: CASE_BOUNDS.maxY });
  });

  it('saca el punto de la zona de la cámara', () => {
    const out = clampToCase({ x: 30, y: 15 });
    expect(isInCameraZone(out)).toBe(false);
  });

  it('no mueve un punto válido', () => {
    expect(clampToCase({ x: 60, y: 60 })).toEqual({ x: 60, y: 60 });
  });
});

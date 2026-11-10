import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/config/site';
import { readdirSync } from 'node:fs';
import photos from '../../src/data/chunkiPhotos.json';
import {
  CHUNKIS,
  chunkiAspect,
  chunkiPhoto,
  chunkiPiecePhoto,
  chunkiWidth,
  getChunki,
  isAvailable,
} from '../../src/data/chunkis';
import { COMBOS } from '../../src/data/combos';

describe('catálogo de chunkis', () => {
  it('no repite ids', () => {
    const ids = CHUNKIS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tiene los 132 chunkis del catálogo: 43 plateados, 45 dorados y 44 coloridos', () => {
    expect(CHUNKIS).toHaveLength(132);
    const count = (category: string) => CHUNKIS.filter((c) => c.category === category).length;
    expect([count('plateados'), count('dorados'), count('coloridos')]).toEqual([43, 45, 44]);
  });

  it('por ahora todos los chunkis están disponibles', () => {
    expect(CHUNKIS.filter((c) => c.soldOut).map((c) => c.id)).toEqual([]);
    expect(CHUNKIS.every((c) => isAvailable(c.id))).toBe(true);
  });

  it('cada chunki tiene su foto y sus medidas', () => {
    const manifest = photos as Record<string, unknown>;
    for (const c of CHUNKIS) {
      expect(manifest[c.id], c.id).toBeDefined();
      expect(chunkiPhoto(c.id), c.id).not.toBe('');
      expect(chunkiPiecePhoto(c.id), c.id).not.toBe('');
      expect(chunkiAspect(c.id), c.id).toBeGreaterThan(0.2);
      const width = chunkiWidth(c.id);
      expect(width, c.id).toBeGreaterThanOrEqual(8);
      expect(width, c.id).toBeLessThanOrEqual(28);
    }
  });

  it('no sobran fotos de chunkis que ya no están en el catálogo', () => {
    const ids = new Set(CHUNKIS.map((c) => c.id));
    const files = readdirSync('src/assets/chunkis').map((f) => f.replace(/(-pieza)?\.webp$/, ''));
    expect(files.filter((id) => !ids.has(id))).toEqual([]);
    expect(Object.keys(photos).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('los mini se ven más pequeños que los grandes', () => {
    expect(chunkiWidth('plata-corazon-mini')).toBeLessThan(chunkiWidth('plata-sagrado-corazon'));
    expect(chunkiWidth('oro-mini-cora-rojo')).toBeLessThan(chunkiWidth('oro-sagrado-corazon'));
  });

  it('los ids sólo usan minúsculas, números y guiones', () => {
    for (const c of CHUNKIS) expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('encuentra chunkis por id', () => {
    expect(getChunki('plata-osito')?.name).toBe('Osito');
    expect(getChunki('oro-cruz')?.category).toBe('dorados');
    expect(getChunki('nada')).toBeUndefined();
    expect(isAvailable('nada')).toBe(false);
  });
});

describe('combos de Inspírate', () => {
  it.each(COMBOS.map((c) => [c.name, c] as const))(
    '%s usa chunkis válidos y cabe en su forro',
    (_, combo) => {
      expect(combo.items.length).toBeLessThanOrEqual(PRODUCTS[combo.size].maxCharms);
      for (const id of combo.items) expect(isAvailable(id), id).toBe(true);
    },
  );
});

describe('productos', () => {
  it('tienen precio y máximo positivos', () => {
    for (const p of Object.values(PRODUCTS)) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.maxCharms).toBeGreaterThan(0);
    }
  });
});

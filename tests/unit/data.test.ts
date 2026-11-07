import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/config/site';
import { CHUNKIS, getChunki, isAvailable } from '../../src/data/chunkis';
import { COMBOS } from '../../src/data/combos';
import { GLYPHS } from '../../src/icons/glyphs';

describe('catálogo de chunkis', () => {
  it('no repite ids', () => {
    const ids = CHUNKIS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada chunki tiene un dibujo existente', () => {
    for (const c of CHUNKIS) expect(GLYPHS[c.glyph], c.id).toBeTypeOf('string');
  });

  it('los ids sólo usan minúsculas, números y guiones', () => {
    for (const c of CHUNKIS) expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('encuentra chunkis por id', () => {
    expect(getChunki('osito')?.name).toBe('Osito');
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

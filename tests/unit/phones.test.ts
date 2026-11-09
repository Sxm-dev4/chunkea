import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { touchesCamera } from '../../src/builder/placement';
import { createBuilderStore } from '../../src/builder/store';
import { PRODUCTS } from '../../src/config/site';
import renders from '../../src/data/caseRenders.json';
import {
  GENERIC_RENDER,
  OTHER_PHONE,
  PHONES,
  cameraZoneFor,
  caseBox,
  getPhone,
  renderIdFor,
} from '../../src/data/phones';
import { seededRng } from '../../src/lib/random';
import { memoryStorage } from '../../src/lib/storage';

const manifest = renders as Record<string, unknown>;

describe('PHONES', () => {
  it('tiene los 30 iPhone sin repetir', () => {
    expect(PHONES).toHaveLength(30);
    expect(new Set(PHONES.map((p) => p.id)).size).toBe(30);
    expect(getPhone(OTHER_PHONE)).toBeUndefined();
  });

  it('cada modelo tiene su render y sus medidas', () => {
    for (const { id } of PHONES) {
      expect(manifest[id], `${id} en caseRenders.json`).toBeDefined();
      expect(existsSync(`src/assets/cases/${id}.webp`), `${id}.webp`).toBe(true);
    }
  });

  it('cada modelo 3D trae el forro, el celular y sus lentes', () => {
    for (const { id } of PHONES) {
      const file = `src/assets/cases3d/${id}.glb`;
      expect(existsSync(file), file).toBe(true);
      const content = readFileSync(file).toString('latin1');
      for (const part of ['Case_Transparente', 'Tel_Trasera', 'Tel_Modulo', 'Tel_Lente', 'Render_Flash']) {
        expect(content.includes(part), `${id}: ${part}`).toBe(true);
      }
    }
  });

  it('Plus, Pro Max y Air van como forro grande; el resto como pequeño', () => {
    for (const { name, size } of PHONES) {
      expect(size, name).toBe(/Plus|Pro Max|Air/.test(name) ? 'grande' : 'pequeno');
    }
  });

  it('el forro y la cámara quedan dentro de la imagen', () => {
    for (const { id } of PHONES) {
      const box = caseBox(id);
      expect(box.x0).toBeGreaterThan(0);
      expect(box.x1).toBeLessThan(1);
      expect(box.y0).toBeGreaterThan(0);
      expect(box.y1).toBeLessThan(1);
      const zone = cameraZoneFor(id);
      expect(zone.x0, id).toBeGreaterThanOrEqual(0);
      expect(zone.x1, id).toBeLessThanOrEqual(100);
      expect(zone.y1, id).toBeLessThan(45);
    }
  });

  it('usa un render genérico si no hay un iPhone elegido', () => {
    expect(renderIdFor(null, 'pequeno')).toBe(GENERIC_RENDER.pequeno);
    expect(renderIdFor(OTHER_PHONE, 'grande')).toBe(GENERIC_RENDER.grande);
    expect(renderIdFor('iphone-se', 'grande')).toBe('iphone-se');
    expect(getPhone(GENERIC_RENDER.pequeno)?.size).toBe('pequeno');
    expect(getPhone(GENERIC_RENDER.grande)?.size).toBe('grande');
  });

  it.each(PHONES.map((p) => p.id))('%s: el forro lleno no tapa la cámara', (id) => {
    const store = createBuilderStore({ storage: memoryStorage(), rng: seededRng(11) });
    store.setPhone(id);
    store.surprise();
    const { charms, size } = store.getState();
    expect(charms).toHaveLength(PRODUCTS[size].maxCharms);
    const zone = cameraZoneFor(id);
    expect(charms.filter((c) => touchesCamera(c, zone))).toEqual([]);
  });
});

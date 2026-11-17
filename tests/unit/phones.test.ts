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
  phoneColor,
  phoneLook,
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
      // El módulo no se exige: los de una sola lente (16e, 17e, SE) la llevan directo en la tapa
      for (const part of [
        'Case_Transparente',
        'Tel_Trasera',
        'Tel_Marco',
        'Tel_Lente',
        'Tel_Logo',
        'Tel_Pantalla',
        'Render_Flash',
      ]) {
        expect(content.includes(part), `${id}: ${part}`).toBe(true);
      }
    }
  });

  it('cada iPhone tiene sus colores, sin repetir y bien escritos', () => {
    for (const { id } of PHONES) {
      const { colors } = phoneLook(id);
      expect(colors.length, id).toBeGreaterThanOrEqual(2);
      expect(new Set(colors.map((c) => c.id)).size, id).toBe(colors.length);
      for (const color of colors) {
        for (const hex of [color.back, color.frame, color.module ?? color.back]) {
          expect(hex, `${id} ${color.id}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
      expect(phoneColor(id, null)).toBe(colors[0]);
      expect(phoneColor(id, 'no-existe')).toBe(colors[0]);
    }
    // Los Max y Plus heredan el acabado de su hermano
    expect(phoneLook('iphone-17-pro-max')).toEqual(phoneLook('iphone-17-pro'));
    expect(phoneLook('iphone-17e').front).toBe('notch');
    expect(phoneLook('iphone-17e').colors.map((c) => c.id)).toContain('rosa-suave');
  });

  it('el color se guarda con el iPhone y se reinicia al cambiar de modelo', () => {
    const storage = memoryStorage();
    const store = createBuilderStore({ storage, rng: seededRng(3) });
    store.setPhoneColor('plata'); // sin iPhone elegido no hay colores
    expect(store.getState().phoneColor).toBeNull();
    store.setPhone('iphone-17-pro');
    store.setPhoneColor('no-existe');
    expect(store.getState().phoneColor).toBeNull();
    store.setPhoneColor('azul-profundo');
    expect(store.getState().phoneColor).toBe('azul-profundo');
    expect(createBuilderStore({ storage }).getState().phoneColor).toBe('azul-profundo');
    store.setPhone('iphone-13');
    expect(store.getState().phoneColor).toBeNull();
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

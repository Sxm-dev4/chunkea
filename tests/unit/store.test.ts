import { describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  createBuilderStore,
  parseSavedDesign,
  type BuilderEvent,
} from '../../src/builder/store';
import { PRODUCTS } from '../../src/config/site';
import { COMBOS } from '../../src/data/combos';
import { seededRng } from '../../src/lib/random';
import { memoryStorage } from '../../src/lib/storage';

const newStore = (storage = memoryStorage()) => createBuilderStore({ storage, rng: seededRng(42) });

describe('createBuilderStore', () => {
  it('empieza con el forro grande vacío', () => {
    const store = newStore();
    expect(store.getState()).toMatchObject({ size: 'grande', model: '', charms: [], filter: 'todos' });
  });

  it('agrega chunkis hasta el máximo y luego los rechaza', () => {
    const store = newStore();
    const events: BuilderEvent['type'][] = [];
    store.subscribe((_, e) => events.push(e.type));
    for (let i = 0; i < PRODUCTS.grande.maxCharms; i++) expect(store.addCharm('plata-osito')).toBe(true);
    expect(store.addCharm('plata-osito')).toBe(false);
    expect(store.getState().charms).toHaveLength(PRODUCTS.grande.maxCharms);
    expect(events.at(-1)).toBe('rejected');
  });

  it('avisa cuando el forro queda lleno', () => {
    const store = newStore();
    const listener = vi.fn();
    store.subscribe(listener);
    for (let i = 0; i < PRODUCTS.grande.maxCharms; i++) store.addCharm('plata-cereza');
    const lastAdded = listener.mock.calls
      .map(([, e]) => e as BuilderEvent)
      .findLast((e) => e.type === 'added');
    expect(lastAdded).toMatchObject({ type: 'added', full: true });
  });

  it('rechaza chunkis que no existen', () => {
    const store = newStore();
    expect(store.addCharm('no-existe')).toBe(false);
    expect(store.getState().charms).toHaveLength(0);
  });

  it('quita por uid y el último de un tipo', () => {
    const store = newStore();
    store.addCharm('plata-osito');
    store.addCharm('plata-cereza');
    store.addCharm('plata-osito');
    store.removeOneOf('plata-osito');
    expect(store.getState().charms.map((c) => c.id)).toEqual(['plata-osito', 'plata-cereza']);
    const first = store.getState().charms[0];
    if (first) store.removeCharm(first.uid);
    expect(store.getState().charms.map((c) => c.id)).toEqual(['plata-cereza']);
  });

  it('al pasar a pequeño recorta al máximo y lo informa', () => {
    const store = newStore();
    for (let i = 0; i < 12; i++) store.addCharm('plata-osito');
    const listener = vi.fn();
    store.subscribe(listener);
    store.setSize('pequeno');
    expect(store.getState().charms).toHaveLength(PRODUCTS.pequeno.maxCharms);
    expect(listener).toHaveBeenCalledWith(expect.anything(), { type: 'size-changed', trimmed: 3 });
  });

  it('mueve chunkis dentro del forro y fuera de la cámara', () => {
    const store = newStore();
    store.addCharm('plata-osito');
    const charm = store.getState().charms[0];
    expect(charm).toBeDefined();
    store.moveCharm(charm!.uid, 200, -50);
    expect(charm!.x).toBeLessThanOrEqual(88);
    expect(charm!.y).toBeGreaterThanOrEqual(6);
    store.moveCharm(charm!.uid, 20, 10); // encima de la cámara
    expect(charm!.x >= 54.7 || charm!.y >= 28).toBe(true);
  });

  it('"Sorpréndeme" llena los espacios libres con el filtro actual', () => {
    const store = newStore();
    store.setFilter('dorados');
    store.addCharm('plata-osito');
    expect(store.surprise()).toBe(PRODUCTS.grande.maxCharms - 1);
    const ids = store.getState().charms.map((c) => c.id);
    expect(ids).toHaveLength(PRODUCTS.grande.maxCharms);
    // El primero lo puso a mano; el resto sale del filtro
    expect(ids.slice(1).every((id) => id.startsWith('oro-'))).toBe(true);
  });

  it('carga un combo con su tamaño y sus chunkis', () => {
    const store = newStore();
    const combo = COMBOS.find((c) => c.size === 'pequeno');
    expect(combo).toBeDefined();
    store.loadCombo(combo!);
    expect(store.getState().size).toBe('pequeno');
    expect(store.getState().charms.map((c) => c.id)).toEqual(combo!.items);
  });

  it('guarda el diseño y lo recupera al volver', () => {
    const storage = memoryStorage();
    const store = newStore(storage);
    store.setModel('iPhone 15');
    store.addCharm('plata-osito');
    store.addCharm('plata-cereza');
    const again = newStore(storage);
    expect(again.getState().model).toBe('iPhone 15');
    expect(again.getState().charms.map((c) => c.id)).toEqual(['plata-osito', 'plata-cereza']);
  });

  it('no guarda al cambiar de filtro', () => {
    const storage = memoryStorage();
    const spy = vi.spyOn(storage, 'set');
    newStore(storage).setFilter('coloridos');
    expect(spy).not.toHaveBeenCalled();
  });

  it('limita el largo del modelo', () => {
    const store = newStore();
    store.setModel('x'.repeat(100));
    expect(store.getState().model).toHaveLength(40);
  });
});

describe('parseSavedDesign', () => {
  it('ignora datos vacíos o dañados', () => {
    expect(parseSavedDesign(null)).toBeNull();
    expect(parseSavedDesign('{no es json')).toBeNull();
    expect(parseSavedDesign('42')).toBeNull();
  });

  it('descarta chunkis desconocidos y posiciones inválidas', () => {
    const raw = JSON.stringify({
      size: 'grande',
      model: 'Moto',
      charms: [
        { id: 'plata-osito', x: 60, y: 60, r: 10 },
        { id: 'inventado', x: 60, y: 60, r: 0 },
        { id: 'plata-cereza', x: 'a', y: 60, r: 0 },
        { id: 'plata-hongo', x: 500, y: 60 },
      ],
    });
    const design = parseSavedDesign(raw);
    expect(design?.charms.map((c) => c.id)).toEqual(['plata-osito', 'plata-hongo']);
    expect(design?.charms[1]).toMatchObject({ x: 88, r: 0 });
  });

  it('usa el tamaño por defecto si viene uno desconocido y recorta al máximo', () => {
    const charms = Array.from({ length: 20 }, () => ({ id: 'plata-osito', x: 60, y: 60, r: 0 }));
    const design = parseSavedDesign(JSON.stringify({ size: 'collar', charms }));
    expect(design?.size).toBe('grande');
    expect(design?.charms).toHaveLength(PRODUCTS.grande.maxCharms);
  });

  it('usa la clave de almacenamiento esperada', () => {
    expect(STORAGE_KEY).toBe('chunkea-diseno-v1');
  });
});

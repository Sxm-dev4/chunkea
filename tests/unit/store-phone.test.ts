import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  createBuilderStore,
  parseSavedDesign,
  type BuilderEvent,
} from '../../src/builder/store';
import { COMBOS } from '../../src/data/combos';
import { OTHER_PHONE, cameraZoneFor } from '../../src/data/phones';
import { isInCameraZone } from '../../src/builder/placement';
import { seededRng } from '../../src/lib/random';
import { memoryStorage } from '../../src/lib/storage';

const newStore = (storage = memoryStorage()) => createBuilderStore({ storage, rng: seededRng(42) });

describe('elegir celular', () => {
  it('un iPhone define el modelo, el tamaño y el precio', () => {
    const store = newStore();
    store.setPhone('iphone-15');
    expect(store.getState()).toMatchObject({ phoneId: 'iphone-15', model: 'iPhone 15', size: 'pequeno' });
    expect(store.product.price).toBe(55_000);
    store.setPhone('iphone-15-pro-max');
    expect(store.getState()).toMatchObject({ model: 'iPhone 15 Pro Max', size: 'grande' });
    expect(store.product.price).toBe(60_000);
  });

  it('al pasar a un iPhone pequeño recorta y avisa cuántos quitó', () => {
    const store = newStore();
    const events: BuilderEvent[] = [];
    store.surprise();
    store.subscribe((_, e) => events.push(e));
    store.setPhone('iphone-14');
    expect(store.getState().charms).toHaveLength(9);
    expect(events).toEqual([{ type: 'phone-changed', trimmed: 4 }]);
  });

  it('entre iPhone del mismo tamaño conserva el diseño y sólo saca lo que tapa la cámara', () => {
    const store = newStore();
    store.setPhone('iphone-se');
    store.addCharm('osito');
    const [charm] = store.getState().charms;
    store.moveCharm(charm!.uid, 60, 12); // libre en el SE: su cámara es pequeña
    expect(store.getState().charms[0]).toMatchObject({ x: 60, y: 12 });
    store.setPhone('iphone-17-pro'); // módulo de todo el ancho
    const [after] = store.getState().charms;
    expect(after?.uid).toBe(charm?.uid);
    expect(isInCameraZone(after!, cameraZoneFor('iphone-17-pro'))).toBe(false);
  });

  it('"otro celular" deja escribir el modelo y mantiene el tamaño', () => {
    const store = newStore();
    store.setPhone('iphone-15');
    store.setPhone(OTHER_PHONE);
    expect(store.getState()).toMatchObject({ phoneId: OTHER_PHONE, model: '', size: 'pequeno' });
    store.setModel('Galaxy S24');
    store.setSize('grande');
    expect(store.getState()).toMatchObject({ phoneId: OTHER_PHONE, model: 'Galaxy S24', size: 'grande' });
  });

  it('elegir un tamaño distinto al del iPhone deselecciona el iPhone', () => {
    const store = newStore();
    store.setPhone('iphone-15');
    store.setSize('grande');
    expect(store.getState()).toMatchObject({ phoneId: null, model: '', size: 'grande' });
  });

  it('un combo respeta el iPhone elegido', () => {
    const store = newStore();
    store.setPhone('iphone-15');
    const big = COMBOS.find((c) => c.size === 'grande');
    store.loadCombo(big!);
    expect(store.getState()).toMatchObject({ phoneId: 'iphone-15', size: 'pequeno' });
    expect(store.getState().charms.length).toBeLessThanOrEqual(9);
  });

  it('recuerda el celular al volver', () => {
    const storage = memoryStorage();
    newStore(storage).setPhone('iphone-16-plus');
    expect(newStore(storage).getState()).toMatchObject({
      phoneId: 'iphone-16-plus',
      model: 'iPhone 16 Plus',
      size: 'grande',
    });
    expect(storage.get(STORAGE_KEY)).toContain('iphone-16-plus');
  });
});

describe('diseños guardados', () => {
  const parse = (data: object) => parseSavedDesign(JSON.stringify(data));

  it('reconoce el iPhone de un diseño de la versión anterior', () => {
    expect(parse({ size: 'grande', model: ' iphone 15 ', charms: [] })).toMatchObject({
      phoneId: 'iphone-15',
      model: 'iPhone 15',
      size: 'pequeno',
    });
  });

  it('otro modelo escrito a mano queda como "otro celular"', () => {
    expect(parse({ size: 'grande', model: 'Galaxy S24', charms: [] })).toMatchObject({
      phoneId: OTHER_PHONE,
      model: 'Galaxy S24',
      size: 'grande',
    });
  });

  it('descarta un celular desconocido', () => {
    expect(parse({ size: 'pequeno', phoneId: 'nokia-3310', model: '', charms: [] })).toMatchObject({
      phoneId: null,
      size: 'pequeno',
    });
  });

  it('saca de la cámara los chunkis guardados encima', () => {
    const saved = parse({
      phoneId: 'iphone-17-pro',
      charms: [{ id: 'osito', x: 50, y: 10, r: 0 }],
    });
    const [charm] = saved?.charms ?? [];
    expect(isInCameraZone(charm!, cameraZoneFor('iphone-17-pro'))).toBe(false);
  });
});

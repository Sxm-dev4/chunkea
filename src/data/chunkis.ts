import type { GlyphId } from '../icons/glyphs';

export type Category = 'corazones' | 'misticos' | 'animalitos' | 'random';
export type CategoryFilter = Category | 'todos';

export interface Chunki {
  readonly id: string;
  readonly name: string;
  /** Dibujo que usa (ver icons/glyphs.ts). Varios chunkis pueden compartir dibujo. */
  readonly glyph: GlyphId;
  readonly category: Category;
  /** Se dibuja más pequeño sobre el forro. */
  readonly mini?: boolean;
  /** Se muestra como agotado y no se puede elegir. */
  readonly soldOut?: boolean;
}

/**
 * Catálogo de chunkis.
 * Para marcar uno como agotado agrega `soldOut: true`.
 */
export const CHUNKIS: readonly Chunki[] = [
  { id: 'corazon-3d', name: 'Corazón 3D', glyph: 'heart3d', category: 'corazones' },
  { id: 'corazon-mini-3d', name: 'Corazón mini 3D', glyph: 'heart3d', category: 'corazones', mini: true },
  { id: 'corazon-pellet', name: 'Corazón pellet', glyph: 'heartPellet', category: 'corazones', mini: true },
  { id: 'corazon-mini', name: 'Corazón mini', glyph: 'heart', category: 'corazones', mini: true },
  {
    id: 'corazon-plano-mini',
    name: 'Corazón plano mini',
    glyph: 'heartPlain',
    category: 'corazones',
    mini: true,
  },
  { id: 'sagrado-corazon', name: 'Sagrado corazón', glyph: 'heartSacred', category: 'corazones' },
  { id: 'corazon-cruz', name: 'Corazón cruz', glyph: 'heartCross', category: 'corazones' },
  { id: 'corazon-destello', name: 'Corazón destello', glyph: 'heartBurst', category: 'corazones' },
  { id: 'corazon-puas', name: 'Corazón púas', glyph: 'heartSpikes', category: 'corazones' },
  { id: 'corazon-ojo', name: 'Corazón con ojo', glyph: 'heartEye', category: 'corazones' },
  { id: 'corazon-ojo-rosa', name: 'Corazón ojo y rosa', glyph: 'heartEyeRose', category: 'corazones' },
  { id: 'corazon-cupido', name: 'Corazón cupido', glyph: 'heartArrow', category: 'corazones' },
  { id: 'corazon-rey', name: 'Corazón rey', glyph: 'heartCrown', category: 'corazones' },
  {
    id: 'corazon-coronita',
    name: 'Corazón coronita',
    glyph: 'heartCrown',
    category: 'corazones',
    mini: true,
  },
  {
    id: 'rey-puntos-dobles',
    name: 'Rey de corazón puntos dobles',
    glyph: 'heartCrownDots',
    category: 'corazones',
  },
  { id: 'rey-corazon-alas', name: 'Rey de corazón con alas', glyph: 'heartWings', category: 'corazones' },
  { id: 'ala-corazon', name: 'Ala corazón', glyph: 'heartWing', category: 'corazones' },
  { id: 'soles', name: 'Soles', glyph: 'sun', category: 'misticos' },
  { id: 'sol-luna', name: 'Sol y luna', glyph: 'sunMoon', category: 'misticos' },
  { id: 'ojo-sol', name: 'Ojo y sol', glyph: 'sunEye', category: 'misticos' },
  { id: 'mano-hamsa', name: 'Mano hamsa', glyph: 'hamsa', category: 'misticos' },
  { id: 'mano-vacia', name: 'Mano vacía', glyph: 'hand', category: 'misticos' },
  { id: 'llave-san-benito', name: 'Llave San Benito', glyph: 'key', category: 'misticos' },
  { id: 'cruz', name: 'Cruz', glyph: 'cross', category: 'misticos' },
  { id: 'virgen', name: 'Virgen', glyph: 'virgin', category: 'misticos' },
  { id: 'espejo', name: 'Espejo', glyph: 'mirror', category: 'misticos' },
  { id: 'cara-hindu', name: 'Cara hindú', glyph: 'faceHindu', category: 'misticos' },
  { id: 'rostro', name: 'Rostro', glyph: 'face', category: 'misticos' },
  { id: 'osito', name: 'Osito', glyph: 'bear', category: 'animalitos' },
  { id: 'leopardo', name: 'Leopardo', glyph: 'leopard', category: 'animalitos' },
  { id: 'elefante', name: 'Elefante', glyph: 'elephant', category: 'animalitos' },
  { id: 'tortuga', name: 'Tortuga', glyph: 'turtle', category: 'animalitos' },
  { id: 'cereza', name: 'Cereza', glyph: 'cherry', category: 'random' },
  { id: 'hongo', name: 'Hongo', glyph: 'mushroom', category: 'random' },
  { id: 'trebol', name: 'Trébol', glyph: 'clover', category: 'random' },
  { id: 'arcoiris', name: 'Arcoíris', glyph: 'rainbow', category: 'random' },
  { id: 'liston', name: 'Listón', glyph: 'ribbon', category: 'random' },
  { id: 'rey-manzanita', name: 'Rey manzanita', glyph: 'apple', category: 'random' },
  { id: 'reina-roja', name: 'Reina roja', glyph: 'crown', category: 'random' },
  { id: 'astronauta', name: 'Astronauta', glyph: 'astronaut', category: 'random' },
  { id: 'avion', name: 'Avión', glyph: 'plane', category: 'random' },
  { id: 'ancla', name: 'Ancla', glyph: 'anchor', category: 'random' },
  { id: 'ancla-mini', name: 'Ancla mini', glyph: 'anchor', category: 'random', mini: true },
];

const BY_ID: ReadonlyMap<string, Chunki> = new Map(CHUNKIS.map((c) => [c.id, c]));

export const getChunki = (id: string): Chunki | undefined => BY_ID.get(id);

export const isAvailable = (id: string): boolean => {
  const chunki = BY_ID.get(id);
  return !!chunki && !chunki.soldOut;
};

export const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  'todos',
  'corazones',
  'misticos',
  'animalitos',
  'random',
];

export const isCategoryFilter = (value: unknown): value is CategoryFilter =>
  typeof value === 'string' && (CATEGORY_FILTERS as readonly string[]).includes(value);

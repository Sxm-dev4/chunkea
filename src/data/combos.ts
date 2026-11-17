import type { SizeId } from '../config/site';

export interface Combo {
  readonly name: string;
  readonly description: string;
  /** Tamaño del forro de la foto. */
  readonly size: SizeId;
  /** Foto real del forro, en src/assets/photos/. */
  readonly photo: string;
  /**
   * Chunks del catálogo que más se parecen a los de la foto (se pueden repetir).
   * Máximo MAX_BIG_CHUNKS grandes.
   */
  readonly items: readonly string[];
}

/** Combos de la sección "Inspírate", armados a partir de fotos de forros reales. */
export const COMBOS: readonly Combo[] = [
  {
    name: 'Corazón salvaje',
    description: 'Rojo, plata y actitud',
    size: 'pequeno',
    photo: 'combo-corazon-salvaje.webp',
    items: [
      'plata-reina-roja',
      'color-corazon-rojo',
      'plata-ojo-sol',
      'plata-liston',
      'plata-cara-hindu',
      'color-hongo',
      'color-perritos',
      'plata-soles',
      'plata-soles',
    ],
  },
  {
    name: 'Místico dorado',
    description: 'Buena vibra y protección',
    size: 'pequeno',
    photo: 'combo-mistico-dorado.webp',
    items: [
      'oro-ojo-pestanas',
      'oro-talisman',
      'oro-ojo-corazon',
      'oro-estrella-fugaz',
      'oro-mano-hamsa-2',
      'oro-cora-globo',
    ],
  },
  {
    name: 'Dulce',
    description: 'Tierno pero chunky',
    size: 'grande',
    photo: 'combo-dulce.webp',
    items: [
      'color-taza-cafe',
      'color-chocolate',
      'color-corazon-rojo',
      'color-croissant',
      'color-carita-feliz',
      'color-perritos',
      'color-cutie-rosado',
      'color-cutie-blanco',
    ],
  },
  {
    name: 'Viajer@',
    description: 'Para ir a todas partes',
    size: 'pequeno',
    photo: 'combo-viajero.webp',
    items: [
      'oro-avion',
      'oro-rostro-sol-luna',
      'oro-sagrado-corazon',
      'oro-estrella-cardinal',
      'oro-estrella-fugaz',
      'oro-corazon-ojo-azul',
      'oro-cora-globo',
      'oro-letras',
    ],
  },
];

const photos = import.meta.glob<string>('../assets/photos/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** URL de la foto del combo ('' si falta el archivo). */
export const comboPhoto = (combo: Combo): string => photos[`../assets/photos/${combo.photo}`] ?? '';

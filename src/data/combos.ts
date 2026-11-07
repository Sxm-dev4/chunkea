import type { SizeId } from '../config/site';

export interface Combo {
  readonly name: string;
  readonly description: string;
  readonly size: SizeId;
  /** Ids de chunkis (se pueden repetir). */
  readonly items: readonly string[];
}

/** Combos de la sección "Inspírate". */
export const COMBOS: readonly Combo[] = [
  {
    name: 'Corazón salvaje',
    description: 'Rojo, plata y actitud',
    size: 'grande',
    items: [
      'corazon-puas',
      'rey-corazon-alas',
      'corazon-3d',
      'leopardo',
      'cereza',
      'corazon-destello',
      'reina-roja',
      'corazon-mini-3d',
      'corazon-cupido',
      'corazon-pellet',
      'corazon-3d',
      'ala-corazon',
      'corazon-mini',
    ],
  },
  {
    name: 'Místico',
    description: 'Buena vibra y protección',
    size: 'grande',
    items: [
      'ojo-sol',
      'sol-luna',
      'mano-hamsa',
      'soles',
      'llave-san-benito',
      'virgen',
      'sagrado-corazon',
      'cruz',
      'espejo',
      'cara-hindu',
      'corazon-ojo',
      'rostro',
      'corazon-cruz',
    ],
  },
  {
    name: 'Dulce',
    description: 'Tierno pero chunky',
    size: 'pequeno',
    items: [
      'osito',
      'cereza',
      'hongo',
      'trebol',
      'arcoiris',
      'liston',
      'corazon-coronita',
      'corazon-mini',
      'tortuga',
    ],
  },
  {
    name: 'Viajer@',
    description: 'Para ir a todas partes',
    size: 'pequeno',
    items: [
      'avion',
      'ancla',
      'astronauta',
      'sol-luna',
      'elefante',
      'trebol',
      'corazon-3d',
      'rey-manzanita',
      'ancla-mini',
    ],
  },
];

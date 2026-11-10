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
      'plata-corazon-puas',
      'plata-rey-corazon-alas',
      'plata-reina-roja',
      'plata-leopardo',
      'plata-corazon-coronita',
      'plata-corazon-3d',
      'plata-corazon-cruz',
      'oro-mini-cora-rojo',
      'plata-corazon-mini-3d',
      'plata-corazon-rey',
      'plata-cereza',
      'plata-corazon-mini',
      'plata-ala-corazon',
    ],
  },
  {
    name: 'Místico dorado',
    description: 'Buena vibra y protección',
    size: 'grande',
    items: [
      'oro-ojo-pestanas',
      'oro-mano-hamsa',
      'oro-virgen-roja',
      'oro-talisman',
      'oro-ojo-corazon',
      'oro-rostro-sol-luna',
      'oro-estrella-cardinal',
      'oro-cruz',
      'oro-ojo-gota-mini-azul',
      'oro-om',
      'oro-trebol-negro',
      'oro-sagrado-corazon',
      'oro-ojo-gota-mini',
    ],
  },
  {
    name: 'Dulce',
    description: 'Tierno pero chunky',
    size: 'pequeno',
    items: [
      'color-cupcake',
      'color-osito-goma',
      'color-paletas',
      'color-cutie-rosado',
      'color-pato',
      'color-carita-feliz',
      'color-croissant',
      'color-corazon-rojo',
      'color-patico-mini',
    ],
  },
  {
    name: 'Viajer@',
    description: 'Para ir a todas partes',
    size: 'pequeno',
    items: [
      'oro-avion',
      'oro-estrella-cardinal',
      'color-starbucks',
      'plata-ancla-mini',
      'oro-estrella-fugaz',
      'plata-tortuga',
      'color-taza-cafe',
      'oro-leopardo',
      'plata-astronauta',
    ],
  },
];

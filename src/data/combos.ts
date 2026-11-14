import type { SizeId } from '../config/site';

export interface Combo {
  readonly name: string;
  readonly description: string;
  readonly size: SizeId;
  /** Ids de chunks (se pueden repetir). Máximo MAX_BIG_CHUNKS grandes. */
  readonly items: readonly string[];
}

/** Combos de la sección "Inspírate". Cada uno lleva 3 chunks grandes y el resto pequeños. */
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
      'plata-corazon-3d',
      'oro-mini-cora-rojo',
      'plata-corazon-mini-3d',
      'plata-cereza',
      'plata-corazon-mini',
      'plata-corazon-pellet',
      'plata-corazon-plano-mini',
      'oro-mini-cora-negro',
      'oro-corazon-negro-ojo-rojo',
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
      'oro-cruz',
      'oro-ojo-gota-mini-azul',
      'oro-cuadro-ojo',
      'oro-mano-nacar',
      'oro-ojos-pintados',
      'oro-ojo-gota-mini',
      'oro-mano-mini',
      'oro-cora-globo',
      'oro-corazones-mini',
      'oro-argolla-curva',
    ],
  },
  {
    name: 'Dulce',
    description: 'Tierno pero chunky',
    size: 'pequeno',
    items: [
      'color-cupcake',
      'color-paletas',
      'color-corazon-rojo',
      'color-cutie-rosado',
      'color-carita-feliz',
      'color-croissant',
      'color-patico-mini',
      'color-pancito',
      'color-cereza',
    ],
  },
  {
    name: 'Viajer@',
    description: 'Para ir a todas partes',
    size: 'pequeno',
    items: [
      'oro-avion',
      'color-starbucks',
      'color-taza-cafe',
      'plata-ancla-mini',
      'plata-tortuga',
      'oro-leopardo',
      'plata-astronauta',
      'oro-ancla',
      'plata-sol-luna',
    ],
  },
];

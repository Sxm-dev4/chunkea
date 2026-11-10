import photos from './chunkiPhotos.json';

export type Category = 'plateados' | 'dorados' | 'coloridos';
export type CategoryFilter = Category | 'todos';

/** Lo que el cliente debe confirmar por WhatsApp: el color o la letra. */
export type ChunkiNote = 'color' | 'inicial';

export interface Chunki {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  /** Se muestra como agotado y no se puede elegir. */
  readonly soldOut?: boolean;
  readonly note?: ChunkiNote;
}

type Extra = Pick<Chunki, 'soldOut' | 'note'>;
const make =
  (category: Category, prefix: string) =>
  (slug: string, name: string, extra: Extra = {}): Chunki => ({
    id: `${prefix}-${slug}`,
    name,
    category,
    ...extra,
  });
const plata = make('plateados', 'plata');
const oro = make('dorados', 'oro');
const color = make('coloridos', 'color');
/** Por ahora no hay agotados; para agotar uno: plata('ancla', 'Ancla', AGOTADO). */
export const AGOTADO: Extra = { soldOut: true };
const COLORES: Extra = { note: 'color' };

/**
 * Catálogo de chunkis, en el mismo orden del catálogo de Chunkea.
 * Las fotos salen de scripts/extract-chunkis.mjs (src/assets/chunkis/<id>.webp).
 * Para marcar uno como agotado agrega `AGOTADO`; para quitarlo de agotado, bórralo.
 */
export const CHUNKIS: readonly Chunki[] = [
  // Plateados
  plata('sagrado-corazon', 'Sagrado corazón'),
  plata('corazon-ojo-rosa', 'Corazón ojo y rosa'),
  plata('corazon-plano-mini', 'Corazón plano mini'),
  plata('ojo-sol', 'Ojo y sol'),
  plata('corazon-3d', 'Corazón 3D'),
  plata('cara-hindu', 'Cara hindú'),
  plata('soles', 'Soles'),
  plata('sol-luna', 'Sol y luna'),
  plata('mano-hamsa', 'Mano hamsa'),
  plata('corazon-mini', 'Corazón mini'),
  plata('rey-corazon-alas', 'Rey de corazón con alas'),
  plata('astronauta', 'Astronauta'),
  plata('corazon-destello', 'Corazón destello'),
  plata('espejo', 'Espejo'),
  plata('corazon-cruz', 'Corazón cruz'),
  plata('corazon-rey', 'Corazón rey'),
  plata('cruz', 'Cruz'),
  plata('rey-puntos-dobles', 'Rey de corazón puntos dobles'),
  plata('llave-san-benito', 'Llave San Benito'),
  plata('virgen', 'Virgen'),
  plata('avion', 'Avión'),
  plata('corazon-ojo', 'Corazón con ojo'),
  plata('ala-corazon', 'Ala corazón'),
  plata('ancla', 'Ancla'),
  plata('reina-roja', 'Reina roja'),
  plata('corazon-puas', 'Corazón púas'),
  plata('arcoiris', 'Arcoíris'),
  plata('cereza', 'Cereza'),
  plata('hongo', 'Hongo'),
  plata('trebol', 'Trébol'),
  plata('osito', 'Osito'),
  plata('mano-vacia', 'Mano vacía'),
  plata('tortuga', 'Tortuga'),
  plata('corazon-mini-3d', 'Corazón mini 3D'),
  plata('corazon-coronita', 'Corazón coronita'),
  plata('leopardo', 'Leopardo'),
  plata('corazon-cupido', 'Corazón cupido'),
  plata('liston', 'Listón'),
  plata('rey-manzanita', 'Rey manzanita'),
  plata('rostro-sol-luna', 'Rostro sol y luna'),
  plata('elefante', 'Elefante'),
  plata('ancla-mini', 'Ancla mini'),
  plata('corazon-pellet', 'Corazón pellet'),

  // Dorados
  oro('mini-cora-rojo', 'Mini cora rojo'),
  oro('mini-cora-negro', 'Mini cora negro'),
  oro('corazon-negro-ojo-rojo', 'Corazón negro ojo rojo'),
  oro('cruz', 'Cruz'),
  oro('sagrado-corazon', 'Sagrado corazón'),
  oro('corazon-estrella', 'Corazón con estrella'),
  oro('trebol-negro', 'Trébol negro'),
  oro('reina-corazon', 'Reina corazón'),
  oro('astronauta', 'Astronauta'),
  oro('mano-hamsa', 'Mano hamsa'),
  oro('mano-hamsa-2', 'Mano hamsa 2'),
  oro('corazon-manzana', 'Corazón manzana'),
  oro('virgen', 'Virgen'),
  oro('estrella-fugaz', 'Estrella fugaz'),
  oro('om', 'Om'),
  oro('cerezas-rojas', 'Cerezas rojas'),
  oro('leopardo', 'Leopardo'),
  oro('oso-grabado', 'Oso grabado'),
  oro('rey-corazon-negro', 'Rey de corazón negro'),
  oro('cuadro-ojo', 'Cuadro ojo'),
  oro('cuadro-mano', 'Cuadro mano'),
  oro('rostro-sol-luna', 'Rostro sol y luna'),
  oro('cupido', 'Cupido'),
  oro('mano-nacar', 'Mano nácar'),
  oro('oso-liso', 'Oso liso'),
  oro('letras', 'Letras', { note: 'inicial' }),
  oro('mano-mini', 'Mano mini'),
  oro('estrella-cardinal', 'Estrella cardinal'),
  oro('pesas', 'Pesas'),
  oro('avion', 'Avión'),
  oro('ancla', 'Ancla'),
  oro('argolla-curva', 'Argolla curva'),
  oro('ojos-pintados', 'Ojos pintados'),
  oro('corazon-ojo-azul', 'Corazón ojo plano azul'),
  oro('talisman', 'Talismán'),
  oro('ojo-corazon', 'Ojo corazón'),
  oro('ojo-pestanas', 'Ojo pestañas'),
  oro('virgen-negra', 'Virgen negra'),
  oro('virgen-roja', 'Virgen roja'),
  oro('cerezas', 'Cerezas'),
  oro('ojo-gota-mini', 'Ojo gota mini'),
  oro('ojo-gota-mini-azul', 'Ojo gota mini azul'),
  oro('cora-mini-negro', 'Cora mini negro'),
  oro('cora-globo', 'Cora globo'),
  oro('corazones-mini', 'Corazones mini'),

  // Coloridos
  color('pan-salsa', 'Pan con salsa'),
  color('crispetas', 'Crispetas'),
  color('starbucks', 'Starbucks'),
  color('chocolate', 'Chocolate'),
  color('cheesecake', 'Cheesecake'),
  color('corona', 'Corona'),
  color('pancito', 'Pancito'),
  color('corazon-rojo', 'Corazón rojo'),
  color('coca-cola-lata', 'Coca-Cola lata'),
  color('coca-cola', 'Coca-Cola'),
  color('osito-goma', 'Osito de goma', COLORES),
  color('hongo', 'Hongo', COLORES),
  color('carita-feliz', 'Carita feliz', COLORES),
  color('paletas', 'Paletas', COLORES),
  color('pan-choco', 'Pan con choco'),
  color('cupcake', 'Cupcake'),
  color('waffle', 'Waffle'),
  color('croissant', 'Croissant'),
  color('pan-cacho', 'Pan cacho'),
  color('toasts', 'Toasts'),
  color('cereza', 'Cereza'),
  color('lego', 'Lego', COLORES),
  color('estrella-mario', 'Estrella Mario Bros'),
  color('pato', 'Pato', COLORES),
  color('paleta-bebe', 'Paleta bebé'),
  color('perritos', 'Perritos', COLORES),
  color('dado-turco-fucsia', 'Dado turco fucsia'),
  color('licores-mini', 'Licores mini'),
  color('patico-mini', 'Patico mini'),
  color('deportivos', 'Deportivos'),
  color('funny-face', 'Funny face'),
  color('foca-neon', 'Foca neón'),
  color('baby-bubbles', 'Baby bubbles'),
  color('patito-lila-mini', 'Patito lila mini'),
  color('patito-azul-mini', 'Patito azul mini'),
  color('dulces', 'Dulces'),
  color('pintura', 'Pintura'),
  color('aji', 'Ají'),
  color('dado-turco-morado', 'Dado turco morado'),
  color('dado-turco-rosado', 'Dado turco rosado'),
  color('dado-turco-rojo', 'Dado turco rojo'),
  color('cutie-blanco', 'Cutie blanco'),
  color('cutie-rosado', 'Cutie rosado'),
  color('taza-cafe', 'Taza de café', COLORES),
];

const BY_ID: ReadonlyMap<string, Chunki> = new Map(CHUNKIS.map((c) => [c.id, c]));

export const getChunki = (id: string): Chunki | undefined => BY_ID.get(id);

export const isAvailable = (id: string): boolean => {
  const chunki = BY_ID.get(id);
  return !!chunki && !chunki.soldOut;
};

/** Para el mensaje de WhatsApp: hay chunkis con el mismo nombre en plateado y en dorado. */
export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  plateados: 'plateado',
  dorados: 'dorado',
  coloridos: 'colorido',
};

export const NOTE_LABELS: Readonly<Record<ChunkiNote, { short: string; order: string }>> = {
  color: { short: 'Varios colores', order: 'color a confirmar' },
  inicial: { short: 'Elige tu inicial', order: 'inicial a confirmar' },
};

export const CATEGORY_FILTERS: readonly CategoryFilter[] = ['todos', 'plateados', 'dorados', 'coloridos'];

export const isCategoryFilter = (value: unknown): value is CategoryFilter =>
  typeof value === 'string' && (CATEGORY_FILTERS as readonly string[]).includes(value);

/* ---------- Fotos ---------- */

interface PhotoSize {
  readonly w: number;
  readonly h: number;
}
interface PhotoInfo extends PhotoSize {
  /** Si la foto muestra varias piezas, la que va sobre el forro. */
  readonly piece?: PhotoSize;
}
const PHOTOS = photos as Readonly<Record<string, PhotoInfo>>;

const images = import.meta.glob<string>('../assets/chunkis/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
const imageUrl = (file: string): string => images[`../assets/chunkis/${file}.webp`] ?? '';

/** Foto para el catálogo (con todas las variantes si las hay). */
export const chunkiPhoto = (id: string): string => imageUrl(id);

/** Foto de la pieza que va sobre el forro. */
export const chunkiPiecePhoto = (id: string): string =>
  PHOTOS[id]?.piece ? imageUrl(`${id}-pieza`) : imageUrl(id);

/** Proporción alto/ancho de la pieza que va sobre el forro. */
export const chunkiAspect = (id: string): number => {
  const size = PHOTOS[id]?.piece ?? PHOTOS[id];
  return size ? size.h / size.w : 1;
};

/** Pixels del catálogo por cada 1% del ancho del forro: las fotos del catálogo están a escala. */
const CATALOG_PX_PER_PERCENT = 5.2;
const MIN_WIDTH = 8;
const MAX_WIDTH = 28;

/** Ancho del chunki sobre el forro, en % del ancho del forro (los mini se ven mini). */
export const chunkiWidth = (id: string): number => {
  const size = PHOTOS[id]?.piece ?? PHOTOS[id];
  if (!size) return 19;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, size.w / CATALOG_PX_PER_PERCENT));
};

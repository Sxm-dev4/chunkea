/**
 * Datos del negocio. Es el primer lugar a revisar si cambia el WhatsApp,
 * una red social o los precios.
 */
export const SITE = {
  name: 'Chunkea',
  /** Número de WhatsApp (se configura en .env → VITE_WHATSAPP). */
  whatsapp: import.meta.env.VITE_WHATSAPP,
  instagram: 'https://www.instagram.com/chunkea.col/',
  tiktok: 'https://www.tiktok.com/@chunkea.col',
  city: 'Cali',
  locale: 'es-CO',
  currency: 'COP',
} as const;

export type SizeId = 'pequeno' | 'grande';

export interface Product {
  readonly id: SizeId;
  readonly name: string;
  /** Precio en pesos colombianos (sin decimales). */
  readonly price: number;
  /** Máximo de chunkis incluidos en el precio. */
  readonly maxCharms: number;
}

export const PRODUCTS: Readonly<Record<SizeId, Product>> = {
  pequeno: { id: 'pequeno', name: 'Forro pequeño', price: 55_000, maxCharms: 9 },
  grande: { id: 'grande', name: 'Forro grande', price: 60_000, maxCharms: 13 },
};

export const DEFAULT_SIZE: SizeId = 'grande';

/** Máximo de chunks grandes por forro (en cualquier tamaño); el resto van pequeños. */
export const MAX_BIG_CHUNKS = 3;

export const isSizeId = (value: unknown): value is SizeId => value === 'pequeno' || value === 'grande';

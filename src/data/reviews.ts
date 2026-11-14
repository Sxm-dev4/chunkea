/**
 * Reseñas de clientes para el carrusel «Lo que dicen».
 *
 * Sólo reseñas reales, con permiso de quien la escribió. Mientras la lista esté
 * vacía, la sección no se muestra en la página.
 *
 * Para agregar una:
 *  1. Si trae foto, guárdala en src/assets/reviews/ (webp, jpg o png; mejor cuadrada,
 *     unos 800 px de lado). Ejemplo: src/assets/reviews/laura.webp
 *  2. Agrega una entrada aquí, por ejemplo:
 *     { name: 'Laura M.', text: 'Me encantó…', photo: 'laura.webp', source: 'Instagram' }
 */

export type ReviewSource = 'Instagram' | 'WhatsApp' | 'TikTok';

export interface Review {
  /** Nombre como la persona quiere aparecer (nombre e inicial, o su usuario). */
  readonly name: string;
  readonly text: string;
  /** Archivo dentro de src/assets/reviews/. */
  readonly photo?: string;
  /** Dónde dejó la reseña. */
  readonly source?: ReviewSource;
}

export const REVIEWS: readonly Review[] = [];

const photos = import.meta.glob<string>('../assets/reviews/*.{webp,jpg,jpeg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** URL de la foto de una reseña ('' si no tiene o no existe el archivo). */
export const reviewPhoto = (file: string | undefined): string =>
  file ? (photos[`../assets/reviews/${file}`] ?? '') : '';

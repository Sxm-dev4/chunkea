import { beforeEach, describe, expect, it } from 'vitest';
import type { Review } from '../../src/data/reviews';
import { mountReviews } from '../../src/ui/reviews';

// Datos de prueba: no son reseñas reales y nunca se muestran en el sitio
const SAMPLE: readonly Review[] = [
  { name: 'Persona A', text: 'Texto de prueba uno', photo: 'a.webp', source: 'Instagram' },
  { name: 'Persona B', text: 'Texto de prueba dos' },
];

const photoUrl = (file: string | undefined): string => (file ? `/fotos/${file}` : '');

function section(): HTMLElement {
  document.body.innerHTML = `
    <section id="resenas" hidden>
      <div class="reviews-track"></div>
      <button data-review-prev></button><button data-review-next></button>
    </section>`;
  return document.getElementById('resenas') as HTMLElement;
}

describe('carrusel de reseñas', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sin reseñas la sección sigue oculta', () => {
    const el = section();
    mountReviews(el, [], photoUrl);
    expect(el.hidden).toBe(true);
    expect(el.querySelectorAll('.review')).toHaveLength(0);
  });

  it('con reseñas muestra una tarjeta por cada una', () => {
    const el = section();
    mountReviews(el, SAMPLE, photoUrl);
    expect(el.hidden).toBe(false);
    const cards = el.querySelectorAll('.review');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.getAttribute('aria-label')).toBe('1 de 2');
    expect(cards[0]?.querySelector('img')?.getAttribute('src')).toBe('/fotos/a.webp');
    expect(cards[0]?.querySelector('.review-source')?.textContent).toBe('Instagram');
    // la segunda no trae foto ni origen
    expect(cards[1]?.querySelector('img')).toBeNull();
    expect(cards[1]?.querySelector('.review-source')).toBeNull();
    expect(cards[1]?.querySelector('blockquote')?.textContent).toBe('Texto de prueba dos');
  });

  it('el texto se pone como texto, no como HTML', () => {
    const el = section();
    mountReviews(el, [{ name: '<b>x</b>', text: '<img src=x onerror=alert(1)>' }], photoUrl);
    expect(el.querySelector('blockquote img')).toBeNull();
    expect(el.querySelector('figcaption b')).toBeNull();
  });
});

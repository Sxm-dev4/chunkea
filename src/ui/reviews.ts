import type { Review } from '../data/reviews';

/** Pinta el carrusel de reseñas. Sin reseñas, la sección sigue oculta. */
export function mountReviews(
  section: HTMLElement,
  reviews: readonly Review[],
  photoUrl: (file: string | undefined) => string,
): void {
  const track = section.querySelector<HTMLElement>('.reviews-track');
  if (!track || reviews.length === 0) return;

  track.replaceChildren(
    ...reviews.map((review, i) => {
      const card = document.createElement('figure');
      card.className = 'review';
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'reseña');
      card.setAttribute('aria-label', `${i + 1} de ${reviews.length}`);

      const src = photoUrl(review.photo);
      if (src) {
        const img = document.createElement('img');
        img.className = 'review-photo';
        img.src = src;
        img.alt = `Forro de ${review.name}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 400;
        img.height = 400;
        card.append(img);
      }

      const quote = document.createElement('blockquote');
      quote.className = 'review-text';
      quote.textContent = review.text;

      const caption = document.createElement('figcaption');
      caption.className = 'review-name';
      caption.textContent = review.name;
      if (review.source) {
        const source = document.createElement('span');
        source.className = 'review-source';
        source.textContent = review.source;
        caption.append(source);
      }

      card.append(quote, caption);
      return card;
    }),
  );

  // Flechas: avanzan una tarjeta (el desplazamiento con el dedo lo da el scroll-snap)
  const step = (direction: 1 | -1): void => {
    const card = track.querySelector<HTMLElement>('.review');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * ((card?.offsetWidth ?? track.clientWidth) + gap),
      behavior: 'smooth',
    });
  };
  section.querySelector('[data-review-prev]')?.addEventListener('click', () => step(-1));
  section.querySelector('[data-review-next]')?.addEventListener('click', () => step(1));

  section.hidden = false;
}

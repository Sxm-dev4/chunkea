/** Aparición suave de tarjetas al hacer scroll. */
export function mountReveal(root: ParentNode = document): void {
  const items = [...root.querySelectorAll<HTMLElement>('.reveal')];
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }),
    { threshold: 0.15 },
  );
  items.forEach((el) => observer.observe(el));
}

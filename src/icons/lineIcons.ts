/**
 * Iconos de línea propios (48×48). Clase "l1" = color del texto, "l2" = color de acento,
 * "d" = puntos (trazo más grueso). Se usan dentro de textos y donde la librería
 * AnimatedIcons no tiene un equivalente gratuito.
 */
export const LINE_ICONS = {
  heart:
    '<path class="l1" d="M24 40C12 32 7 25 7 18.5a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2C41 25 36 32 24 40Z"/><path class="l2" d="M14 18a4.5 4.5 0 0 1 4.5-4.5"/>',
  cherry:
    '<path class="l1" d="M16 30C18 21 22 13 30 7M33 29C32 21 31 14 30 7"/><path class="l1" d="M30 7c4-3.5 10-3.5 12.5 0-3 3.5-9.5 3.5-12.5 0Z"/><circle class="l2" cx="15" cy="35" r="7"/><circle class="l2" cx="33" cy="34" r="7"/>',
  sparkle:
    '<path class="l2" d="M22 5c1.5 10 4.5 13 15 14.5C26.5 21 23.5 24 22 34.5 20.5 24 17.5 21 7 19.5 17.5 18 20.5 15 22 5Z"/><path class="l1" d="M37 30c.6 3.6 1.6 4.6 5.2 5.2-3.6.6-4.6 1.6-5.2 5.2-.6-3.6-1.6-4.6-5.2-5.2 3.6-.6 4.6-1.6 5.2-5.2Z"/>',
  pin: '<path class="l1" d="M24 44S11 31.5 11 21a13 13 0 0 1 26 0c0 10.5-13 23-13 23Z"/><circle class="l2" cx="24" cy="21" r="4.5"/>',
  truck:
    '<path class="l1" d="M4 12h24v21H4zM28 19h8.5l7.5 7.5V33H28z"/><circle class="l2" cx="12" cy="36" r="4"/><circle class="l2" cx="35" cy="36" r="4"/>',
  hand: '<path class="l1" d="M16 29V14a3 3 0 0 1 6 0v10M22 24V10a3 3 0 0 1 6 0v14M28 24V12a3 3 0 0 1 6 0v13M34 25v-6a3 3 0 0 1 6 0v11c0 9-6 15-14 15-6 0-9.5-3-12.5-7.5L8 30a3 3 0 0 1 5-3.4l3 3.4"/><path class="l2" d="M8 12 5 9M12 7l-1-4"/>',
  arrow: '<path class="l1" d="M6 24h32"/><path class="l2" d="M28 13l12 11-12 11"/>',
  eyes: '<circle class="l1" cx="15" cy="24" r="9"/><circle class="l1" cx="33" cy="24" r="9"/><circle class="l2" cx="17.5" cy="25" r="2.5"/><circle class="l2" cx="35.5" cy="25" r="2.5"/>',
  chat: '<path class="l1" d="M9 9h30a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H23l-9 8v-8H9a5 5 0 0 1-5-5V14a5 5 0 0 1 5-5Z"/><path class="l2 d" d="M15 22h.01M24 22h.01M33 22h.01"/>',
  dice: '<rect class="l1" x="7" y="7" width="34" height="34" rx="8"/><path class="l2 d" d="M16 16h.01M32 16h.01M24 24h.01M16 32h.01M32 32h.01"/>',
  trash:
    '<path class="l1" d="M8 13h32M19 13V8h10v5M12 13l2 29h20l2-29"/><path class="l2" d="M21 20v15M27 20v15"/>',
  phone: '<rect class="l1" x="13" y="4" width="22" height="40" rx="6"/><path class="l2" d="M21 38h6"/>',
  rotate: '<path class="l1" d="M39 27A15.5 15.5 0 1 1 34.5 12.5"/><path class="l2" d="M36 4.5v9h-9"/>',
} as const;

export type LineIconId = keyof typeof LINE_ICONS;

export const isLineIconId = (value: unknown): value is LineIconId =>
  typeof value === 'string' && Object.hasOwn(LINE_ICONS, value);

/** Icono de línea para usar dentro de textos (toma el color del texto). */
export const lineIcon = (id: LineIconId, className = 'ico'): string =>
  `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${LINE_ICONS[id]}</svg>`;

/** Reemplaza cada <i data-ico="nombre"> del HTML por su SVG. */
export function hydrateInlineIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('i[data-ico]').forEach((placeholder) => {
    const id = placeholder.dataset.ico;
    if (isLineIconId(id)) placeholder.outerHTML = lineIcon(id);
  });
}

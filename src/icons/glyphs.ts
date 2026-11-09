/**
 * Dibujos SVG de los chunkis (plata + esmalte), en un lienzo de 48×48.
 * Se usan en la vista 2D (como <symbol>) y la vista 3D los convierte en piezas con relieve.
 *
 * Colores con degradado (definidos en GRADIENTS):
 *   url(#ag) plata · url(#rb) rubí · url(#bl) azul · url(#gd) oro · url(#mr) espejo
 */

const HEART = 'M24 42C11 33 5 25 5 17.5A10 10 0 0 1 24 12.5A10 10 0 0 1 43 17.5C43 25 37 33 24 42Z';
const S = 'fill="url(#ag)" stroke="#45454f" stroke-width="1.4" stroke-linejoin="round"';
const R = 'fill="url(#rb)" stroke="#4d0a16" stroke-width="1.2" stroke-linejoin="round"';
const DARK = '#45454f';

const star = (n: number, ro: number, ri: number, cx = 24, cy = 24): string => {
  const points: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = (Math.PI * i) / n - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return points.join(' ');
};

const beads = (cx: number, cy: number, rx: number, ry: number, n: number, r: number): string => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    out += `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}" fill="url(#ag)" stroke="${DARK}" stroke-width=".8"/>`;
  }
  return out;
};

const scaleAt = (s: number, cx: number, cy: number, tx = cx, ty = cy): string =>
  `translate(${tx} ${ty}) scale(${s}) translate(${-cx} ${-cy})`;

const highlight = (cx: number, cy: number, rx = 3, ry = 2, rot = -30): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".75" transform="rotate(${rot} ${cx} ${cy})"/>`;

const heartRuby = `<path d="${HEART}" ${S}/><path d="${HEART}" ${R} transform="${scaleAt(0.62, 24, 26)}"/>${highlight(19, 22, 2.4, 1.5)}`;

const eye = (cx: number, cy: number, w: number, iris = 'url(#bl)'): string =>
  `<path d="M${cx - w} ${cy}Q${cx} ${cy - w * 0.8} ${cx + w} ${cy}Q${cx} ${cy + w * 0.8} ${cx - w} ${cy}z" fill="#fff" stroke="${DARK}" stroke-width="1.1"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${w * 0.4}" fill="${iris}" stroke="#1f2a40" stroke-width=".8"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${w * 0.17}" fill="#111"/><circle cx="${cx - w * 0.15}" cy="${cy - w * 0.15}" r="${w * 0.08}" fill="#fff"/>`;

const medallion = (inner: string): string =>
  `<ellipse cx="24" cy="25" rx="17" ry="21" ${S}/>${beads(24, 25, 17, 21, 22, 1.5)}<ellipse cx="24" cy="25" rx="12.5" ry="16.5" fill="#9fa0ad" stroke="${DARK}" stroke-width="1"/>${inner}`;

const CROWN = 'M14 21L15 10l5 5 4-8 4 8 5-5 1 11z';
const HAND =
  'M24 46C15 46 8 41 7 33L5 26C4 22 9 21 10 24L12 28 13 12C13 8 19 8 19 12L20 24 21 8C21 4 27 4 27 8L28 24 29 12C29 8 35 8 35 12L36 28 38 24C39 21 44 22 43 26L41 33C40 41 33 46 24 46Z';
const WING = 'M17 22C11 13 4 11 .5 14c3 2 3 4 1 6 4 0 5 2 3 4 4 0 6 1 6 3 3-1 5-2 7-3z';

export const GLYPHS = {
  heart: heartRuby,
  heartPlain: `<path d="${HEART}" ${S}/><path d="M12 18a6 6 0 0 1 8-4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  heart3d: `<path d="${HEART}" fill="#cfd0da" stroke="${DARK}" stroke-width="1.4"/><path d="${HEART}" ${R} transform="${scaleAt(0.84, 24, 26)}"/>${highlight(15.5, 19, 4, 2.4)}${highlight(31, 30, 1.6, 1, -30)}`,
  heartPellet: `<path d="${HEART}" ${R}/>${highlight(15, 19, 4.5, 2.8)}<circle cx="31" cy="18" r="1.3" fill="#fff" opacity=".7"/>`,
  heartCross: `${heartRuby}<path d="M22 15h4v6h6v4h-6v10h-4V25h-6v-4h6z" ${S}/>`,
  heartSacred: `<path d="M20 15c-2-4 1-7 4-10 0 3 2 4 2 6 1-1 2-2 2-4 3 3 3 7 0 9z" fill="url(#gd)" stroke="${DARK}" stroke-width="1"/><path d="M22.5 2h3v4h3.5v3h-3.5v5h-3V9H19V6h3.5z" ${S}/><g transform="${scaleAt(0.8, 24, 26, 24, 30)}">${heartRuby}</g>`,
  heartBurst: `<polygon points="${star(8, 23, 7, 24, 25)}" ${S}/><polygon points="${star(8, 17, 6, 24, 25)}" ${S} transform="rotate(22.5 24 25)"/><g transform="${scaleAt(0.6, 24, 26, 24, 25)}"><path d="${HEART}" ${R}/></g>${highlight(20, 22, 2, 1.3)}`,
  heartSpikes: `<polygon points="${star(16, 23, 16, 24, 25)}" ${S}/><g transform="${scaleAt(0.78, 24, 26, 24, 25.5)}"><path d="${HEART}" ${R}/></g>${highlight(18, 20, 3, 1.8)}`,
  heartEye: `<path d="${HEART}" ${S}/>${eye(24, 25, 11)}`,
  heartEyeRose: `<path d="${HEART}" ${R}/>${eye(24, 24, 9.5)}<circle cx="33" cy="34" r="4.5" fill="#ff8fb3" stroke="#7a1330" stroke-width="1"/><path d="M31 33.5q2-2 4 0q-1 2.5-4 0" fill="none" stroke="#7a1330" stroke-width=".9"/>`,
  heartArrow: `<path d="M6 40L42 8" stroke="${DARK}" stroke-width="4.2" stroke-linecap="round"/><path d="M6 40L42 8" stroke="#e9e9ef" stroke-width="2.2" stroke-linecap="round"/><g transform="${scaleAt(0.78, 24, 26, 24, 25)}">${heartRuby}</g><path d="M44 6l-10 2.5 7.5 7.5z" ${S}/><path d="M6 40l-1-7 4.5 2.5zM6 40l7 1-2.5-4.5z" ${S}/>`,
  heartCrown: `<g transform="${scaleAt(0.76, 24, 26, 24, 31)}">${heartRuby}</g><path d="${CROWN}" ${S}/><circle cx="24" cy="6.5" r="1.8" fill="url(#rb)"/>`,
  heartCrownDots: `<g transform="${scaleAt(0.76, 24, 26, 24, 31)}"><path d="${HEART}" ${S}/><path d="${HEART}" ${R} transform="${scaleAt(0.62, 24, 26)}"/>${(
    [
      [17, 20],
      [31, 20],
      [24, 36],
      [12, 26],
      [36, 26],
      [24, 15],
    ] as const
  )
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" stroke="${DARK}" stroke-width=".6"/>`)
    .join(
      '',
    )}</g><path d="${CROWN}" ${S}/><circle cx="20" cy="17" r="1.2" fill="#fff"/><circle cx="28" cy="17" r="1.2" fill="#fff"/>`,
  heartWings: `<path d="${WING}" ${S}/><path d="${WING}" ${S} transform="translate(48 0) scale(-1 1)"/><g transform="${scaleAt(0.6, 24, 26, 24, 26)}">${heartRuby}</g><path d="M17 15l1-6 3.5 3 2.5-5 2.5 5 3.5-3 1 6z" ${S}/>`,
  heartWing: `<path d="M20 24C13 13 5 10 1 13c3 2 3 4 1 6 4 0 5 2 3 4 4 0 6 1 6 3 3-1 6-2 9-2z" ${S}/><g transform="${scaleAt(0.66, 24, 26, 28, 27)}">${heartRuby}</g>`,
  sun: `<polygon points="${star(16, 23, 15)}" ${S}/><circle cx="24" cy="24" r="11.5" ${S}/><circle cx="20" cy="22" r="1.3" fill="${DARK}"/><circle cx="28" cy="22" r="1.3" fill="${DARK}"/><path d="M19.5 27q4.5 4 9 0" stroke="${DARK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>${highlight(18, 18, 2.4, 1.4)}`,
  sunMoon: `<polygon points="${star(12, 23.5, 17.5)}" ${S}/><circle cx="24" cy="24" r="15" ${S}/><path d="M24 9a15 15 0 0 0 0 30a10 15 0 0 1 0-30z" fill="#6f7080" opacity=".55"/><circle cx="18" cy="21" r="1.3" fill="${DARK}"/><circle cx="30" cy="21" r="1.3" fill="${DARK}"/><path d="M19 28q5 4 10 0" stroke="${DARK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  sunEye: `<polygon points="${star(14, 23.5, 15)}" ${S}/><circle cx="24" cy="24" r="13" ${S}/>${eye(24, 24, 10)}`,
  hamsa: `<path d="${HAND}" ${S}/>${eye(24, 35, 7.5)}`,
  hand: `<path d="${HAND}" ${S}/><path d="M16 36q8 6 16 0" fill="none" stroke="${DARK}" stroke-width="1.1"/>${highlight(17, 16, 1.4, 3, 0)}`,
  key: `<circle cx="24" cy="12" r="8.5" fill="none" stroke="${DARK}" stroke-width="6"/><circle cx="24" cy="12" r="8.5" fill="none" stroke="#dcdce4" stroke-width="3.8"/><path d="M22.8 8v8M20 11h5.6" stroke="${DARK}" stroke-width="1.6"/><rect x="21.5" y="19.5" width="5" height="26" rx="1.5" ${S}/><path d="M26.5 33h7v3.5h-7zM26.5 39h9v3.5h-9z" ${S}/>`,
  cross: `<path d="M20 3h8v11h11v8H28v23h-8V22H9v-8h11z" ${S}/><circle cx="24" cy="18" r="4.5" fill="url(#rb)" stroke="#4d0a16" stroke-width="1"/>${highlight(22.5, 16.5, 1.4, 0.9)}`,
  virgin: medallion(
    `<path d="M24 11c-5 0-8 4-8 9v4c-3 4-4.5 10-4.5 16h25c0-6-1.5-12-4.5-16v-4c0-5-3-9-8-9z" fill="url(#ag)" stroke="${DARK}" stroke-width="1"/><circle cx="24" cy="20" r="3.6" fill="#f4f4f7" stroke="${DARK}" stroke-width=".8"/><path d="M21 31l3-4 3 4" fill="none" stroke="${DARK}" stroke-width="1"/>`,
  ),
  mirror: `<ellipse cx="24" cy="25" rx="18" ry="22" ${S}/>${beads(24, 25, 18, 22, 24, 1.6)}<ellipse cx="24" cy="25" rx="12.5" ry="16.5" fill="url(#mr)" stroke="${DARK}" stroke-width="1"/><path d="M16 18q3-6 9-7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>`,
  face: medallion(
    `<path d="M18 22q2.5 2 5 0M25 22q2.5 2 5 0" fill="none" stroke="#f4f4f7" stroke-width="1.3" stroke-linecap="round"/><path d="M24 23v6l-1.5 1" fill="none" stroke="#f4f4f7" stroke-width="1.1"/><path d="M20.5 33q3.5 2 7 0q-3.5-2-7 0z" fill="url(#rb)"/>`,
  ),
  faceHindu: medallion(
    `<path d="M14 15q10-8 20 0" fill="none" stroke="url(#gd)" stroke-width="2.4"/><circle cx="24" cy="18" r="1.8" fill="url(#rb)"/><path d="M18 23q2.5 2 5 0M25 23q2.5 2 5 0" fill="none" stroke="#f4f4f7" stroke-width="1.3" stroke-linecap="round"/><path d="M24 24v5l-1.5 1" fill="none" stroke="#f4f4f7" stroke-width="1.1"/><path d="M20.5 33q3.5 2 7 0q-3.5-2-7 0z" fill="url(#rb)"/>`,
  ),
  bear: `<circle cx="12" cy="11" r="7" ${S}/><circle cx="36" cy="11" r="7" ${S}/><circle cx="12" cy="11" r="3.4" fill="#9a9aa6"/><circle cx="36" cy="11" r="3.4" fill="#9a9aa6"/><circle cx="24" cy="26" r="17" ${S}/><ellipse cx="24" cy="32" rx="7.5" ry="6" fill="#ececf1" stroke="${DARK}" stroke-width="1"/><ellipse cx="24" cy="29.5" rx="2.8" ry="2" fill="#26262c"/><path d="M24 31.5v2.5M21 35q3 2 6 0" stroke="#26262c" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="17.5" cy="22" r="1.9" fill="#26262c"/><circle cx="30.5" cy="22" r="1.9" fill="#26262c"/><circle cx="14" cy="29" r="2" fill="#ff8fb3" opacity=".6"/><circle cx="34" cy="29" r="2" fill="#ff8fb3" opacity=".6"/>`,
  leopard: `<path d="M6 5l10 8h16l10-8-1 19c0 12-8 20-17 20S7 36 7 24z" ${S}/><g fill="#4a4a55" opacity=".75"><circle cx="14" cy="18" r="1.8"/><circle cx="34" cy="18" r="1.8"/><circle cx="24" cy="15" r="1.6"/><circle cx="11" cy="28" r="1.5"/><circle cx="37" cy="28" r="1.5"/><circle cx="19" cy="17" r="1"/><circle cx="29" cy="17" r="1"/></g><path d="M15 24q3-3 6 0q-3 2-6 0zM27 24q3-3 6 0q-3 2-6 0z" fill="#d5e57a" stroke="${DARK}" stroke-width=".9"/><path d="M22 30h4l-2 2.5z" fill="url(#rb)"/><path d="M24 32.5v2M21 36q3 2 6 0" stroke="${DARK}" stroke-width="1.1" fill="none"/>`,
  elephant: `<ellipse cx="31" cy="30" rx="13" ry="10" ${S}/><rect x="22" y="34" width="6" height="10" rx="2" ${S}/><rect x="34" y="34" width="6" height="10" rx="2" ${S}/><circle cx="19" cy="22" r="12" ${S}/><path d="M9 26C4 31 4 40 10 43c2 .5 3-2 1-3-3-2-2-7 2-10z" ${S}/><ellipse cx="24" cy="22" rx="7" ry="9" fill="#cfd0da" stroke="${DARK}" stroke-width="1.2"/><circle cx="14.5" cy="19.5" r="1.6" fill="#26262c"/><path d="M44 28q3 2 2 5" stroke="${DARK}" stroke-width="1.4" fill="none"/>`,
  turtle: `<circle cx="24" cy="7" r="5" ${S}/><ellipse cx="11" cy="16" rx="5" ry="3.5" ${S} transform="rotate(-35 11 16)"/><ellipse cx="37" cy="16" rx="5" ry="3.5" ${S} transform="rotate(35 37 16)"/><ellipse cx="11" cy="37" rx="5" ry="3.5" ${S} transform="rotate(35 11 37)"/><ellipse cx="37" cy="37" rx="5" ry="3.5" ${S} transform="rotate(-35 37 37)"/><path d="M24 42l-2 4h4z" ${S}/><ellipse cx="24" cy="27" rx="14.5" ry="16" ${S}/><path d="M24 19l6 4v7l-6 4-6-4v-7z" fill="url(#rb)" stroke="${DARK}" stroke-width="1"/><path d="M24 11v8M30 23l7-4M30 30l7 4M24 34v8M18 30l-7 4M18 23l-7-4" stroke="${DARK}" stroke-width="1.1"/>`,
  cherry: `<path d="M14 34C17 22 22 14 30 6M34 33C33 22 31 14 30 6" stroke="${DARK}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M14 34C17 22 22 14 30 6M34 33C33 22 31 14 30 6" stroke="#e4e4ea" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M30 6c5-4 12-3 15 0-4 4-11 4-15 0z" ${S}/><circle cx="14" cy="36" r="9" ${R}/><circle cx="34" cy="35" r="9" ${R}/>${highlight(10.5, 32.5, 2.6, 1.6)}${highlight(30.5, 31.5, 2.6, 1.6)}`,
  mushroom: `<path d="M16 25h16l2 15c0 4-4 6-10 6s-10-2-10-6z" ${S}/><path d="M3 27C3 13 13 4 24 4s21 9 21 23z" ${R}/><g fill="#fff" stroke="${DARK}" stroke-width=".6"><circle cx="15" cy="14" r="3"/><circle cx="27" cy="10" r="2.4"/><circle cx="35" cy="19" r="3.2"/><circle cx="22" cy="21" r="2.2"/><circle cx="9" cy="23" r="1.8"/></g>`,
  clover: `<path d="M27 31q6 8 14 13" stroke="${DARK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M27 31q6 8 14 13" stroke="#e4e4ea" stroke-width="2" fill="none" stroke-linecap="round"/><g ${S}><circle cx="24" cy="12" r="8.5"/><circle cx="36" cy="24" r="8.5"/><circle cx="24" cy="36" r="8.5"/><circle cx="12" cy="24" r="8.5"/></g><circle cx="24" cy="24" r="4.5" fill="url(#rb)" stroke="#4d0a16" stroke-width="1"/>${highlight(21, 9, 2.4, 1.4)}`,
  rainbow: `<g fill="none" stroke-linecap="round"><path d="M5 38a19 19 0 0 1 38 0" stroke="${DARK}" stroke-width="7.5"/><path d="M5 38a19 19 0 0 1 38 0" stroke="url(#ag)" stroke-width="5.2"/><path d="M11.5 38a12.5 12.5 0 0 1 25 0" stroke="${DARK}" stroke-width="7.5"/><path d="M11.5 38a12.5 12.5 0 0 1 25 0" stroke="#d8345f" stroke-width="5.2"/><path d="M18 38a6 6 0 0 1 12 0" stroke="${DARK}" stroke-width="7.5"/><path d="M18 38a6 6 0 0 1 12 0" stroke="#ffc2dc" stroke-width="5.2"/></g><g ${S}><circle cx="6" cy="40" r="5"/><circle cx="12" cy="42" r="4"/><circle cx="42" cy="40" r="5"/><circle cx="36" cy="42" r="4"/></g>`,
  ribbon: `<path d="M22 25l-9 19 5-1.5 3 4.5 5-21zM26 25l9 19-5-1.5-3 4.5-5-21z" ${S}/><path d="M24 21C16 9 3 9 3 18s13 10 21 4z" ${S}/><path d="M24 21C32 9 45 9 45 18s-13 10-21 4z" ${S}/><ellipse cx="24" cy="22" rx="5" ry="6" ${S}/>${highlight(10, 15, 3, 1.6)}`,
  apple: `<path d="M24 19c-4-3-12-3-15 4-4 9 1 21 9 23 3 1 4-1 6-1s3 2 6 1c8-2 13-14 9-23-3-7-11-7-15-4z" ${R}/><path d="M16 17l1-9 4 4 3-7 3 7 4-4 1 9z" ${S}/>${highlight(14, 27, 2.4, 4, 20)}`,
  crown: `<path d="M5 37L3 13l10 9 11-17 11 17 10-9-2 24z" ${S}/><rect x="5" y="37" width="38" height="7" rx="2" ${S}/><circle cx="24" cy="27" r="4.5" fill="url(#rb)" stroke="#4d0a16" stroke-width="1"/><circle cx="12.5" cy="30" r="2.8" fill="url(#rb)"/><circle cx="35.5" cy="30" r="2.8" fill="url(#rb)"/><circle cx="24" cy="5" r="2.2" ${S}/><circle cx="3" cy="13" r="2" ${S}/><circle cx="45" cy="13" r="2" ${S}/>`,
  astronaut: `<rect x="13" y="30" width="22" height="16" rx="6" ${S}/><rect x="20" y="35" width="8" height="5" rx="1.5" fill="url(#rb)"/><circle cx="24" cy="19" r="15" ${S}/><ellipse cx="24" cy="20" rx="10" ry="8" fill="url(#bl)" stroke="${DARK}" stroke-width="1.2"/><path d="M17 17q3-4 8-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/><rect x="7" y="16" width="3.5" height="8" rx="1.5" ${S}/><rect x="37.5" y="16" width="3.5" height="8" rx="1.5" ${S}/>`,
  plane: `<path d="M24 2c2 0 3 3 3 6v10l17 10v4l-17-5v11l5 4v3l-8-2-8 2v-3l5-4V27L4 32v-4l17-10V8c0-3 1-6 3-6z" ${S}/><path d="M23 6h2v8h-2z" fill="url(#bl)"/>`,
  anchor: `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M24 13V44M15 20h18M7 30c2 9 9 14 17 14s15-5 17-14" stroke="${DARK}" stroke-width="6.2"/><path d="M24 13V44M15 20h18M7 30c2 9 9 14 17 14s15-5 17-14" stroke="#dcdce4" stroke-width="3.8"/><circle cx="24" cy="8" r="4.5" stroke="${DARK}" stroke-width="5.4"/><circle cx="24" cy="8" r="4.5" stroke="#dcdce4" stroke-width="3.2"/></g><path d="M3 31l6-4 1 7zM45 31l-6-4-1 7z" ${S}/>`,
} as const;

export type GlyphId = keyof typeof GLYPHS;

const GRADIENTS = `
  <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#c3c4cf"/><stop offset=".55" stop-color="#f3f3f7"/><stop offset="1" stop-color="#7c7d8a"/></linearGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#d6a536"/><stop offset=".6" stop-color="#fbe39a"/><stop offset="1" stop-color="#94680f"/></linearGradient>
  <radialGradient id="rb" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ff7084"/><stop offset=".45" stop-color="#c8102e"/><stop offset="1" stop-color="#560615"/></radialGradient>
  <radialGradient id="bl" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#d7f0ff"/><stop offset=".5" stop-color="#6e9fd8"/><stop offset="1" stop-color="#253f73"/></radialGradient>
  <linearGradient id="mr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset=".5" stop-color="#b9cfe0"/><stop offset="1" stop-color="#6d8399"/></linearGradient>`;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Inserta una sola vez el sprite con todos los dibujos y degradados. */
export function mountGlyphSprite(doc: Document = document): void {
  if (doc.getElementById('chunkea-sprite')) return;
  const symbols = (Object.keys(GLYPHS) as GlyphId[])
    .map((id) => `<symbol id="g-${id}" viewBox="0 0 48 48" overflow="visible">${GLYPHS[id]}</symbol>`)
    .join('');
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.id = 'chunkea-sprite';
  svg.setAttribute('class', 'svg-sprite');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<defs>${GRADIENTS}</defs>${symbols}`;
  doc.body.prepend(svg);
}

/** SVG de un chunki que referencia el sprite. */
export const glyphSvg = (id: GlyphId): string =>
  `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><use href="#g-${id}"/></svg>`;

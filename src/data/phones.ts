import { DEFAULT_SIZE, type SizeId } from '../config/site';
import renders from './caseRenders.json';
import iphones from './iphones.json';

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export interface Phone {
  /** Coincide con el nombre del render en src/assets/cases/. */
  readonly id: string;
  readonly name: string;
  readonly family: string;
  /** Define el precio y el máximo de chunkis (ver PRODUCTS en config/site.ts). */
  readonly size: SizeId;
}

/** Valor del selector para celulares que no están en la lista. */
export const OTHER_PHONE = 'otro';

const phone = (id: string, name: string, family: string, size: SizeId): Phone => ({ id, name, family, size });

/**
 * iPhones disponibles, del más nuevo al más antiguo.
 * Para cambiar el precio de un modelo, cambia su tamaño aquí.
 */
export const PHONES: readonly Phone[] = [
  phone('iphone-17-pro-max', 'iPhone 17 Pro Max', 'iPhone 17', 'grande'),
  phone('iphone-17-pro', 'iPhone 17 Pro', 'iPhone 17', 'pequeno'),
  phone('iphone-air', 'iPhone Air', 'iPhone 17', 'grande'),
  phone('iphone-17', 'iPhone 17', 'iPhone 17', 'pequeno'),
  phone('iphone-17e', 'iPhone 17e', 'iPhone 17', 'pequeno'),
  phone('iphone-16-pro-max', 'iPhone 16 Pro Max', 'iPhone 16', 'grande'),
  phone('iphone-16-pro', 'iPhone 16 Pro', 'iPhone 16', 'pequeno'),
  phone('iphone-16-plus', 'iPhone 16 Plus', 'iPhone 16', 'grande'),
  phone('iphone-16', 'iPhone 16', 'iPhone 16', 'pequeno'),
  phone('iphone-16e', 'iPhone 16e', 'iPhone 16', 'pequeno'),
  phone('iphone-15-pro-max', 'iPhone 15 Pro Max', 'iPhone 15', 'grande'),
  phone('iphone-15-pro', 'iPhone 15 Pro', 'iPhone 15', 'pequeno'),
  phone('iphone-15-plus', 'iPhone 15 Plus', 'iPhone 15', 'grande'),
  phone('iphone-15', 'iPhone 15', 'iPhone 15', 'pequeno'),
  phone('iphone-14-pro-max', 'iPhone 14 Pro Max', 'iPhone 14', 'grande'),
  phone('iphone-14-pro', 'iPhone 14 Pro', 'iPhone 14', 'pequeno'),
  phone('iphone-14-plus', 'iPhone 14 Plus', 'iPhone 14', 'grande'),
  phone('iphone-14', 'iPhone 14', 'iPhone 14', 'pequeno'),
  phone('iphone-13-pro-max', 'iPhone 13 Pro Max', 'iPhone 13', 'grande'),
  phone('iphone-13-pro', 'iPhone 13 Pro', 'iPhone 13', 'pequeno'),
  phone('iphone-13', 'iPhone 13', 'iPhone 13', 'pequeno'),
  phone('iphone-13-mini', 'iPhone 13 mini', 'iPhone 13', 'pequeno'),
  phone('iphone-12-pro-max', 'iPhone 12 Pro Max', 'iPhone 12', 'grande'),
  phone('iphone-12-pro', 'iPhone 12 Pro', 'iPhone 12', 'pequeno'),
  phone('iphone-12', 'iPhone 12', 'iPhone 12', 'pequeno'),
  phone('iphone-12-mini', 'iPhone 12 mini', 'iPhone 12', 'pequeno'),
  phone('iphone-11-pro-max', 'iPhone 11 Pro Max', 'iPhone 11', 'grande'),
  phone('iphone-11-pro', 'iPhone 11 Pro', 'iPhone 11', 'pequeno'),
  phone('iphone-11', 'iPhone 11', 'iPhone 11', 'pequeno'),
  phone('iphone-se', 'iPhone SE', 'iPhone SE', 'pequeno'),
];

const BY_ID: ReadonlyMap<string, Phone> = new Map(PHONES.map((p) => [p.id, p]));

export const getPhone = (id: string | null): Phone | undefined => (id ? BY_ID.get(id) : undefined);

/** Render que se muestra cuando no hay un iPhone elegido. */
export const GENERIC_RENDER: Readonly<Record<SizeId, string>> = {
  pequeno: 'iphone-16-pro',
  grande: 'iphone-16-pro-max',
};

/** Render a mostrar para la elección actual. */
export const renderIdFor = (phoneId: string | null, size: SizeId = DEFAULT_SIZE): string =>
  getPhone(phoneId)?.id ?? GENERIC_RENDER[size];

export type PhoneFinish = 'brillante' | 'mate';
export type FrameMetal = 'aluminio' | 'acero' | 'titanio' | 'titanio-pulido';
export type PhoneFront = 'isla' | 'notch' | 'home';

/** Un color oficial del iPhone: tapa trasera, marco y (si es distinto) módulo de cámara. */
export interface PhoneColor {
  readonly id: string;
  readonly name: string;
  readonly back: string;
  readonly frame: string;
  readonly module?: string;
}

/** Cómo se ve un iPhone por fuera (ver iphones.json; la geometría sale de scripts/iphone_parts.py). */
export interface PhoneLook {
  readonly frame: FrameMetal;
  readonly back: PhoneFinish;
  readonly moduleFinish: PhoneFinish;
  readonly front: PhoneFront;
  readonly colors: readonly PhoneColor[];
}

type RawLook = Partial<PhoneLook> & { readonly like?: string };
const LOOKS = iphones as unknown as Readonly<Record<string, RawLook>>;

const FALLBACK_COLOR: PhoneColor = { id: 'negro', name: 'Negro', back: '#35393b', frame: '#3a3d40' };
const FALLBACK_LOOK: PhoneLook = {
  frame: 'aluminio',
  back: 'mate',
  moduleFinish: 'mate',
  front: 'isla',
  colors: [FALLBACK_COLOR],
};

/** Acabados y colores de un modelo; "like" hereda de otro (los Max y Plus del mismo año). */
export function phoneLook(renderId: string): PhoneLook {
  const raw = LOOKS[renderId];
  if (!raw) return FALLBACK_LOOK;
  const base = raw.like ? phoneLook(raw.like) : FALLBACK_LOOK;
  return {
    frame: raw.frame ?? base.frame,
    back: raw.back ?? base.back,
    moduleFinish: raw.moduleFinish ?? base.moduleFinish,
    front: raw.front ?? base.front,
    colors: raw.colors?.length ? raw.colors : base.colors,
  };
}

/** El color elegido si existe en ese modelo; si no, el primero de su lista. */
export function phoneColor(renderId: string, colorId: string | null): PhoneColor {
  const colors = phoneLook(renderId).colors;
  return colors.find((c) => c.id === colorId) ?? colors[0] ?? FALLBACK_COLOR;
}

interface RenderInfo {
  readonly case: Box;
  readonly camera: Box;
}
const RENDERS = renders as Readonly<Record<string, RenderInfo>>;

const images = import.meta.glob<string>('../assets/cases/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * Foto del forro con el iPhone de ese color. La principal (`<modelo>.webp`) lleva el primer color;
 * los demás van en `<modelo>--<color>.webp` y, si alguno falta, se muestra la principal.
 */
export const caseImageUrl = (renderId: string, colorId: string | null = null): string =>
  (colorId ? images[`../assets/cases/${renderId}--${colorId}.webp`] : undefined) ??
  images[`../assets/cases/${renderId}.webp`] ??
  '';

/** Dónde está el forro dentro de la imagen (fracciones 0–1 desde arriba a la izquierda). */
export const caseBox = (renderId: string): Box =>
  RENDERS[renderId]?.case ?? { x0: 0.1, x1: 0.9, y0: 0.1, y1: 0.9 };

/** Módulo de cámara en % del forro: ahí no se pueden poner chunkis. */
export function cameraZoneFor(renderId: string): Box {
  const info = RENDERS[renderId];
  if (!info) return { x0: 8, x1: 50.7, y0: 3.7, y1: 25 };
  const { case: c, camera: m } = info;
  const width = c.x1 - c.x0;
  const height = c.y1 - c.y0;
  return {
    x0: ((m.x0 - c.x0) / width) * 100,
    x1: ((m.x1 - c.x0) / width) * 100,
    y0: ((m.y0 - c.y0) / height) * 100,
    y1: ((m.y1 - c.y0) / height) * 100,
  };
}

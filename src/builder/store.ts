import { DEFAULT_SIZE, PRODUCTS, isSizeId, type SizeId } from '../config/site';
import { CHUNKIS, isAvailable, type CategoryFilter } from '../data/chunkis';
import type { Combo } from '../data/combos';
import { defaultRng, randomBetween, type Rng } from '../lib/random';
import { browserStorage, type KeyValueStore } from '../lib/storage';
import { clampToCase, findFreeSpot } from './placement';

/** Un chunki puesto en el forro. x/y en % del forro, r en grados. */
export interface PlacedCharm {
  readonly uid: number;
  readonly id: string;
  x: number;
  y: number;
  r: number;
}

export interface BuilderState {
  size: SizeId;
  model: string;
  charms: PlacedCharm[];
  filter: CategoryFilter;
}

export type BuilderEvent =
  | { type: 'init' }
  | { type: 'added'; uid: number; full: boolean }
  | { type: 'rejected'; reason: 'full' | 'unavailable' }
  | { type: 'removed'; uid: number }
  | { type: 'moved'; uid: number }
  | { type: 'size-changed'; trimmed: number }
  | { type: 'filled'; added: number }
  | { type: 'cleared' }
  | { type: 'combo-loaded'; name: string }
  | { type: 'model-changed' }
  | { type: 'filter-changed' };

export type Listener = (state: Readonly<BuilderState>, event: BuilderEvent) => void;

export const STORAGE_KEY = 'chunkea-diseno-v1';
const MAX_MODEL_LENGTH = 40;

interface SavedDesign {
  size: SizeId;
  model: string;
  charms: { id: string; x: number; y: number; r: number }[];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Valida un diseño guardado (puede venir dañado o de una versión anterior):
 * descarta chunkis desconocidos o agotados y recorta al máximo del tamaño.
 */
export function parseSavedDesign(raw: string | null): SavedDesign | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  const size = isSizeId(d.size) ? d.size : DEFAULT_SIZE;
  const model = typeof d.model === 'string' ? d.model.slice(0, MAX_MODEL_LENGTH) : '';
  const charms = (Array.isArray(d.charms) ? d.charms : [])
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .filter((c) => typeof c.id === 'string' && isAvailable(c.id))
    .filter((c) => isFiniteNumber(c.x) && isFiniteNumber(c.y))
    .map((c) => {
      const pos = clampToCase({ x: c.x as number, y: c.y as number });
      return { id: c.id as string, x: pos.x, y: pos.y, r: isFiniteNumber(c.r) ? c.r : 0 };
    })
    .slice(0, PRODUCTS[size].maxCharms);
  return { size, model, charms };
}

export interface StoreOptions {
  storage?: KeyValueStore;
  rng?: Rng;
}

export type BuilderStore = ReturnType<typeof createBuilderStore>;

/** Estado del armador + acciones. La UI y la vista 3D se suscriben a los eventos. */
export function createBuilderStore({ storage = browserStorage, rng = defaultRng }: StoreOptions = {}) {
  let uidSeq = 1;
  const listeners = new Set<Listener>();
  const state: BuilderState = { size: DEFAULT_SIZE, model: '', charms: [], filter: 'todos' };

  const saved = parseSavedDesign(storage.get(STORAGE_KEY));
  if (saved) {
    state.size = saved.size;
    state.model = saved.model;
    state.charms = saved.charms.map((c) => ({ ...c, uid: uidSeq++ }));
  }

  const maxCharms = (): number => PRODUCTS[state.size].maxCharms;

  const persist = (): void => {
    const design: SavedDesign = {
      size: state.size,
      model: state.model,
      charms: state.charms.map(({ id, x, y, r }) => ({ id, x, y, r })),
    };
    storage.set(STORAGE_KEY, JSON.stringify(design));
  };

  const emit = (event: BuilderEvent): void => {
    if (event.type !== 'filter-changed' && event.type !== 'rejected' && event.type !== 'init') persist();
    listeners.forEach((fn) => fn(state, event));
  };

  /** Agrega sin avisar (para operaciones en lote). Devuelve el uid o null. */
  const place = (id: string): number | null => {
    if (!isAvailable(id) || state.charms.length >= maxCharms()) return null;
    const pos = findFreeSpot(state.charms, state.size, rng);
    const uid = uidSeq++;
    state.charms.push({ uid, id, x: pos.x, y: pos.y, r: Math.round(randomBetween(rng, -28, 28)) });
    return uid;
  };

  /** Vuelve a ubicar todos los chunkis en las posiciones sugeridas del tamaño actual. */
  const relayout = (ids: readonly string[]): void => {
    state.charms = [];
    ids.forEach((id) => place(id));
  };

  const removeCharm = (uid: number): void => {
    const index = state.charms.findIndex((c) => c.uid === uid);
    if (index < 0) return;
    state.charms.splice(index, 1);
    emit({ type: 'removed', uid });
  };

  return {
    getState: (): Readonly<BuilderState> => state,
    get product() {
      return PRODUCTS[state.size];
    },

    subscribe(fn: Listener): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Notifica el estado inicial a los suscriptores. */
    start(): void {
      emit({ type: 'init' });
    },

    addCharm(id: string): boolean {
      if (!isAvailable(id)) {
        emit({ type: 'rejected', reason: 'unavailable' });
        return false;
      }
      const uid = place(id);
      if (uid === null) {
        emit({ type: 'rejected', reason: 'full' });
        return false;
      }
      emit({ type: 'added', uid, full: state.charms.length >= maxCharms() });
      return true;
    },

    removeCharm,

    /** Quita el último chunki de ese tipo (botón "−" del catálogo). */
    removeOneOf(id: string): void {
      const last = [...state.charms].reverse().find((c) => c.id === id);
      if (last) removeCharm(last.uid);
    },

    moveCharm(uid: number, x: number, y: number): void {
      const charm = state.charms.find((c) => c.uid === uid);
      if (!charm) return;
      const pos = clampToCase({ x, y });
      charm.x = pos.x;
      charm.y = pos.y;
      emit({ type: 'moved', uid });
    },

    setSize(size: SizeId): void {
      if (size === state.size) return;
      state.size = size;
      const ids = state.charms.map((c) => c.id);
      const trimmed = Math.max(0, ids.length - maxCharms());
      relayout(ids.slice(0, maxCharms()));
      emit({ type: 'size-changed', trimmed });
    },

    setModel(model: string): void {
      const value = model.slice(0, MAX_MODEL_LENGTH);
      if (value === state.model) return;
      state.model = value;
      emit({ type: 'model-changed' });
    },

    setFilter(filter: CategoryFilter): void {
      if (filter === state.filter) return;
      state.filter = filter;
      emit({ type: 'filter-changed' });
    },

    /** Llena los espacios libres con chunkis al azar (del filtro actual). */
    surprise(): number {
      const pool = CHUNKIS.filter(
        (c) => !c.soldOut && (state.filter === 'todos' || c.category === state.filter),
      );
      const free = maxCharms() - state.charms.length;
      if (free <= 0 || pool.length === 0) {
        emit({ type: 'rejected', reason: 'full' });
        return 0;
      }
      let added = 0;
      for (let i = 0; i < free; i++) {
        const pick = pool[Math.floor(rng() * pool.length)];
        if (pick && place(pick.id) !== null) added++;
      }
      emit({ type: 'filled', added });
      return added;
    },

    clear(): void {
      if (state.charms.length === 0) return;
      state.charms = [];
      emit({ type: 'cleared' });
    },

    loadCombo(combo: Combo): void {
      state.size = combo.size;
      relayout(combo.items);
      emit({ type: 'combo-loaded', name: combo.name });
    },
  };
}

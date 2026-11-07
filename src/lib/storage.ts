/**
 * Acceso seguro a localStorage: puede no existir (modo privado, bloqueado por el
 * navegador) y nunca debe romper la página.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export const browserStorage: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento disponible: se ignora */
    }
  },
};

export const memoryStorage = (): KeyValueStore => {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

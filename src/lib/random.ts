/** Generador de números aleatorios en [0, 1). Se inyecta para poder probar la lógica. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export const randomBetween = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

/** Generador determinista (para que los mini-forros se vean igual en cada visita). */
export function seededRng(seed: number): Rng {
  let s = seed % 233_280;
  return () => {
    s = (s * 9301 + 49_297) % 233_280;
    return s / 233_280;
  };
}

import { lineIcon } from './icons/lineIcons';
import { escapeHtml } from './lib/html';

/**
 * Textos que cambian según lo que hace la persona.
 * Los que devuelven HTML sólo combinan texto propio con iconos (nunca datos del usuario).
 */
export const COPY = {
  counter(count: number, max: number): string {
    if (count === 0) return '¡Todos incluidos en el precio!';
    if (count >= max) return `¡Full chunky! ${lineIcon('heart')}`;
    return `Te quedan ${max - count} chunkis incluidos ${lineIcon('eyes')}`;
  },
  charmsLabel: (count: number): string => `${count} chunki${count === 1 ? '' : 's'}`,
  emptyCase: `Tu forro está muy solito…<br><strong>¡dale chunkis! ${lineIcon('arrow')}</strong>`,
  hint2D: `${lineIcon('hand')} Arrastra para mover · toca para quitar`,
  hint3D: `${lineIcon('rotate')} Gira el forro · mueve o toca los chunkis`,
  toast: {
    full: `¡Ya está full! Quita uno para cambiarlo ${lineIcon('heart')}`,
    fullSurprise: `${lineIcon('heart')} Ya está full. Vacíalo para otra sorpresa`,
    surprise: `${lineIcon('dice')} ¡Sorpresa chunky! Cambia lo que quieras`,
    cleared: `${lineIcon('trash')} Listo, lienzo en blanco`,
    combo: (name: string): string => `${lineIcon('sparkle')} Cargamos “${escapeHtml(name)}”. ¡Hazlo tuyo!`,
    trimmed: (n: number, max: number): string =>
      `Quitamos ${n} chunki${n > 1 ? 's' : ''}: aquí caben hasta ${max}`,
    missingModel: `${lineIcon('phone')} Cuéntanos el modelo de tu cel para hacer tu forro`,
    noCharms: `${lineIcon('heart')} Elige al menos un chunki`,
    opening: `${lineIcon('chat')} ¡Abriendo WhatsApp! Tu diseño ya va en el mensaje`,
  },
} as const;

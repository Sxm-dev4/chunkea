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
    return `Te quedan ${max - count} chunks incluidos ${lineIcon('eyes')}`;
  },
  charmsLabel: (count: number): string => `${count} chunk${count === 1 ? '' : 's'}`,
  bigCount: (count: number, max: number): string => `${count}/${max} grandes`,
  emptyCase: `Tu forro está muy solito…<br><strong>¡dale chunks! ${lineIcon('arrow')}</strong>`,
  hint2D: `${lineIcon('hand')} Arrastra para mover · toca un chunk para girarlo o quitarlo`,
  hint3D: `${lineIcon('rotate')} Gira el forro · arrastra un chunk o tócalo para girarlo o quitarlo`,
  toast: {
    full: `¡Ya está full! Quita uno para cambiarlo ${lineIcon('heart')}`,
    fullSurprise: `${lineIcon('heart')} Ya está full. Vacíalo para otra sorpresa`,
    surprise: `${lineIcon('dice')} ¡Sorpresa chunky! Cambia lo que quieras`,
    cleared: `${lineIcon('trash')} Listo, lienzo en blanco`,
    combo: (name: string): string => `${lineIcon('sparkle')} Cargamos “${escapeHtml(name)}”. ¡Hazlo tuyo!`,
    trimmed: (n: number, max: number): string =>
      `Quitamos ${n} chunk${n > 1 ? 's' : ''}: aquí caben hasta ${max}`,
    missingModel: `${lineIcon('phone')} Cuéntanos cuál es tu celular para hacer tu forro`,
    noCharms: `${lineIcon('heart')} Elige al menos un chunk`,
    bigLimit: (max: number): string =>
      `${lineIcon('heart')} Máximo ${max} chunks grandes por forro: el resto, pequeños`,
    opening: `${lineIcon('chat')} ¡Abriendo WhatsApp! Tu diseño ya va en el mensaje`,
  },
} as const;

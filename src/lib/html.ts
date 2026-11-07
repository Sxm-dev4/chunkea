const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa texto antes de insertarlo en HTML. */
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);

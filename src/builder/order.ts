import { PRODUCTS, SITE } from '../config/site';
import { getChunki } from '../data/chunkis';
import { formatCOP } from './money';
import type { BuilderState } from './store';

export type OrderProblem = 'missing-model' | 'no-charms';

/** Revisa que el pedido esté completo antes de abrir WhatsApp. */
export function validateOrder(state: Pick<BuilderState, 'model' | 'charms'>): OrderProblem | null {
  if (!state.model.trim()) return 'missing-model';
  if (state.charms.length === 0) return 'no-charms';
  return null;
}

/** Arma el mensaje que llega a Chunkea (texto plano con negritas de WhatsApp). */
export function buildOrderMessage(state: Pick<BuilderState, 'size' | 'model' | 'charms'>): string {
  const product = PRODUCTS[state.size];
  const counts = new Map<string, number>();
  for (const charm of state.charms) counts.set(charm.id, (counts.get(charm.id) ?? 0) + 1);

  const lines = [...counts].map(([id, n]) => {
    const name = getChunki(id)?.name ?? id;
    return `• ${name}${n > 1 ? ` x${n}` : ''}`;
  });

  return [
    'Hola Chunkea, ¡quiero chunkear mi vida!',
    '',
    `*Producto:* ${product.name}`,
    `*Celular:* ${state.model.trim()}`,
    `*Chunkis (${state.charms.length}/${product.maxCharms}):*`,
    ...lines,
    '',
    `*Total:* ${formatCOP(product.price)} + envío`,
    '',
    '¿Me confirman disponibilidad y el envío a mi ciudad?',
  ].join('\n');
}

export const whatsappUrl = (message: string, phone: string = SITE.whatsapp): string =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

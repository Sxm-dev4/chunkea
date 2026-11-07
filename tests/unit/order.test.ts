import { describe, expect, it } from 'vitest';
import { formatCOP } from '../../src/builder/money';
import { buildOrderMessage, validateOrder, whatsappUrl } from '../../src/builder/order';
import type { PlacedCharm } from '../../src/builder/store';

const charm = (uid: number, id: string): PlacedCharm => ({ uid, id, x: 50, y: 50, r: 0 });

describe('formatCOP', () => {
  it('usa el formato colombiano sin decimales', () => {
    expect(formatCOP(60_000)).toBe('$60.000');
    expect(formatCOP(55_000)).toBe('$55.000');
  });
});

describe('validateOrder', () => {
  it('pide el modelo del celular', () => {
    expect(validateOrder({ model: '  ', charms: [charm(1, 'osito')] })).toBe('missing-model');
  });

  it('pide al menos un chunki', () => {
    expect(validateOrder({ model: 'iPhone 15', charms: [] })).toBe('no-charms');
  });

  it('acepta un pedido completo', () => {
    expect(validateOrder({ model: 'iPhone 15', charms: [charm(1, 'osito')] })).toBeNull();
  });
});

describe('buildOrderMessage', () => {
  const message = buildOrderMessage({
    size: 'grande',
    model: ' iPhone 15 Pro Max ',
    charms: [charm(1, 'osito'), charm(2, 'cereza'), charm(3, 'osito')],
  });

  it('incluye producto, celular, conteo y total', () => {
    expect(message).toContain('*Producto:* Forro grande');
    expect(message).toContain('*Celular:* iPhone 15 Pro Max');
    expect(message).toContain('*Chunkis (3/13):*');
    expect(message).toContain('*Total:* $60.000 + envío');
  });

  it('agrupa los chunkis repetidos', () => {
    expect(message).toContain('• Osito x2');
    expect(message).toContain('• Cereza');
    expect(message).not.toContain('• Cereza x');
  });

  it('no usa emojis (el mensaje es texto plano)', () => {
    expect(message).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('whatsappUrl', () => {
  it('codifica el mensaje en la URL de wa.me', () => {
    const url = whatsappUrl('Hola & chao\n¿sí?', '570000000000');
    expect(url).toBe('https://wa.me/570000000000?text=Hola%20%26%20chao%0A%C2%BFs%C3%AD%3F');
  });

  it('usa el número configurado por defecto', () => {
    expect(whatsappUrl('x')).toMatch(/^https:\/\/wa\.me\/\d{10,15}\?text=x$/);
  });
});

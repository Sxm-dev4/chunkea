import { SITE } from '../config/site';

const formatter = new Intl.NumberFormat(SITE.locale, {
  style: 'currency',
  currency: SITE.currency,
  maximumFractionDigits: 0,
});

/** 60000 → "$ 60.000" (formato colombiano, sin espacio duro raro). */
export const formatCOP = (value: number): string => formatter.format(value).replace(/\s/g, '');

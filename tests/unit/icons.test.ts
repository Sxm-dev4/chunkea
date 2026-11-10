import { describe, expect, it } from 'vitest';
import { paintIcon, strokeForSize } from '../../src/icons/animatedIcons';
import { hydrateInlineIcons, isLineIconId, lineIcon } from '../../src/icons/lineIcons';
import { escapeHtml } from '../../src/lib/html';

describe('iconos de línea', () => {
  it('reemplaza los marcadores <i data-ico> por SVG', () => {
    document.body.innerHTML = '<p>Hola <i data-ico="heart"></i><i data-ico="desconocido"></i></p>';
    hydrateInlineIcons();
    expect(document.querySelectorAll('svg.ico')).toHaveLength(1);
    expect(document.querySelector('i[data-ico="desconocido"]')).not.toBeNull();
  });

  it('valida nombres', () => {
    expect(isLineIconId('sparkle')).toBe(true);
    expect(isLineIconId('toString')).toBe(false);
    expect(lineIcon('chat')).toContain('class="ico"');
  });
});

describe('paintIcon', () => {
  const sample = () => ({
    layers: [
      {
        nm: 'frame_s1g1_s2g2_background Outlines',
        shapes: [
          { ty: 'gr', it: [{ ty: 'st', c: { a: 0, k: [0, 0, 1] }, w: { a: 0, k: 1 } }] },
          { ty: 'fl', c: { a: 0, k: [1, 1, 1] } },
        ],
      },
      { nm: 'dots_s2g1', shapes: [{ ty: 'fl', c: { a: 0, k: [0, 0, 0] } }] },
      { nm: 'mask_s2g1_background', td: 1, shapes: [{ ty: 'fl', c: { a: 0, k: [1, 1, 1] } }] },
    ],
  });

  it('pinta trazos por grupo y rellenos de fondo con la superficie', () => {
    const data = paintIcon(sample(), ['#000000', '#FF0000'], 2.4, [0.5, 0.5, 0.5]);
    const [frame, dots, mask] = data.layers ?? [];
    const stroke = frame?.shapes?.[0]?.it?.[0];
    expect(stroke?.c?.k).toEqual([1, 0, 0, 1]); // grupo 2 → segundo color
    expect(stroke?.w?.k).toBe(2.4);
    expect(frame?.shapes?.[1]?.c?.k).toEqual([0.5, 0.5, 0.5, 1]); // fondo → superficie
    expect(dots?.shapes?.[0]?.c?.k).toEqual([0, 0, 0, 1]); // relleno del grupo 1
    expect(mask?.shapes?.[0]?.c?.k).toEqual([1, 1, 1]); // máscara intacta
  });

  it('ajusta el grosor según el tamaño', () => {
    expect(strokeForSize(20)).toBeGreaterThan(strokeForSize(64));
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres especiales', () => {
    expect(escapeHtml(`<b class="x">'&'</b>`)).toBe('&lt;b class=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;');
  });
});

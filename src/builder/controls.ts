import { PRODUCTS, isSizeId } from '../config/site';
import { COPY } from '../copy';
import { CHUNKIS, NOTE_LABELS, chunkiPhoto, isCategoryFilter } from '../data/chunkis';
import { OTHER_PHONE, PHONES, getPhone } from '../data/phones';
import { escapeHtml } from '../lib/html';
import { requireEl } from '../lib/env';
import { formatCOP } from './money';
import type { BuilderState, BuilderStore } from './store';

/** Catálogo, filtros, tamaño, modelo, contador y resumen del pedido. */
export function mountControls(store: BuilderStore, root: HTMLElement = document.body): void {
  const picker = requireEl('#picker', root);
  const counter = requireEl('#counter', root);
  const countNow = requireEl('#countNow', root);
  const countMax = requireEl('#countMax', root);
  const counterMsg = requireEl('#counterMsg', root);
  const counterFill = requireEl('#counterFill', root);
  const model = requireEl<HTMLInputElement>('#model', root);
  const phoneSelect = requireEl<HTMLSelectElement>('#phone', root);
  const phoneInfo = requireEl('#phoneInfo', root);
  const sizeArea = requireEl('#sizeArea', root);
  const modelField = requireEl('#modelField', root);
  const sumTitle = requireEl('#sumTitle', root);
  const sumSub = requireEl('#sumSub', root);
  const sumPrice = requireEl('#sumPrice', root);
  const barPrice = requireEl('#barPrice', root);
  const barCount = requireEl('#barCount', root);
  const sizeButtons = [...root.querySelectorAll<HTMLButtonElement>('.size-card[data-size]')];
  const filterButtons = [...root.querySelectorAll<HTMLButtonElement>('.filter[data-cat]')];

  /* ---------- Catálogo ---------- */
  picker.innerHTML = CHUNKIS.map((c) => {
    const name = escapeHtml(c.name);
    const note = c.note ? `<span class="pick-note">${NOTE_LABELS[c.note].short}</span>` : '';
    return `<li class="pick-wrap${c.soldOut ? ' soldout' : ''}" data-id="${c.id}" data-cat="${c.category}">
      <button type="button" class="pick" data-add="${c.id}"${c.soldOut ? ' disabled' : ''} aria-label="Agregar ${name}${c.soldOut ? ' (agotado)' : ''}">
        <span class="pick-photo"><img src="${chunkiPhoto(c.id)}" alt="" loading="lazy" decoding="async" draggable="false" /></span><span class="pick-name">${name}</span>${note}
      </button>
      <span class="pick-count" aria-hidden="true">0</span>
      <button type="button" class="pick-minus" data-remove="${c.id}" aria-label="Quitar un ${name}">−</button>
    </li>`;
  }).join('');
  const pickItems = [...picker.querySelectorAll<HTMLElement>('.pick-wrap')];

  picker.addEventListener('click', (e) => {
    const target = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!target) return;
    if (target.dataset.add) store.addCharm(target.dataset.add);
    else if (target.dataset.remove) store.removeOneOf(target.dataset.remove);
  });

  /* ---------- Filtros ---------- */
  filterButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (isCategoryFilter(btn.dataset.cat)) store.setFilter(btn.dataset.cat);
    }),
  );

  /* ---------- Tamaño (radio group con flechas) ---------- */
  sizeButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      if (isSizeId(btn.dataset.size)) store.setSize(btn.dataset.size);
    }),
  );
  const sizeGroup = sizeButtons[0]?.parentElement;
  sizeGroup?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const index = sizeButtons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = sizeButtons[(index + step + sizeButtons.length) % sizeButtons.length];
    next?.focus();
    next?.click();
  });

  /* ---------- Celular ---------- */
  const families = [...new Set(PHONES.map((p) => p.family))];
  phoneSelect.innerHTML =
    `<option value="">Elige tu celular…</option>` +
    families
      .map((family) => {
        const options = PHONES.filter((p) => p.family === family)
          .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
          .join('');
        return `<optgroup label="${escapeHtml(family)}">${options}</optgroup>`;
      })
      .join('') +
    `<option value="${OTHER_PHONE}">Otro celular (Samsung, Xiaomi…)</option>`;
  phoneSelect.addEventListener('change', () => {
    phoneSelect.closest('.field')?.classList.remove('invalid');
    store.setPhone(phoneSelect.value || null);
  });

  /* ---------- Modelo escrito a mano (otras marcas) ---------- */
  model.addEventListener('input', () => {
    model.closest('.field')?.classList.remove('invalid');
    store.setModel(model.value.trim());
  });

  /* ---------- Render ---------- */
  const render = (state: Readonly<BuilderState>): void => {
    const product = PRODUCTS[state.size];
    const count = state.charms.length;

    sizeButtons.forEach((b) => {
      const checked = b.dataset.size === state.size;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
    });
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.filter)));
    const listed = getPhone(state.phoneId);
    phoneSelect.value = state.phoneId ?? '';
    sizeArea.hidden = !!listed;
    modelField.hidden = state.phoneId !== OTHER_PHONE;
    phoneInfo.hidden = !listed;
    phoneInfo.textContent = listed
      ? `${product.name} · hasta ${product.maxCharms} chunkis · ${formatCOP(product.price)}`
      : '';
    if (document.activeElement !== model && model.value !== state.model) model.value = state.model;

    const perId = new Map<string, number>();
    state.charms.forEach((c) => perId.set(c.id, (perId.get(c.id) ?? 0) + 1));
    pickItems.forEach((item) => {
      const n = perId.get(item.dataset.id ?? '') ?? 0;
      item.classList.toggle('has', n > 0);
      item.hidden = state.filter !== 'todos' && item.dataset.cat !== state.filter;
      const badge = item.querySelector('.pick-count');
      if (badge) badge.textContent = String(n);
    });

    countNow.textContent = String(count);
    countMax.textContent = String(product.maxCharms);
    counterFill.style.width = `${(count / product.maxCharms) * 100}%`;
    counter.classList.toggle('full', count >= product.maxCharms);
    counterMsg.innerHTML = COPY.counter(count, product.maxCharms);

    sumTitle.textContent = product.name;
    sumSub.textContent = COPY.charmsLabel(count) + (state.model ? ` · ${state.model}` : '');
    sumPrice.textContent = formatCOP(product.price);
    barPrice.textContent = formatCOP(product.price);
    barCount.textContent = `${count}/${product.maxCharms} chunkis`;
  };

  store.subscribe((state) => render(state));
}

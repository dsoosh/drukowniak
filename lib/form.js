// Wspólny formularz parametrów: definicje → pola, walidacja, stan w adresie URL.
// Definicja pola: { key, group, label, type: 'num'|'select'|'bool'|'text', def, min, max, step, unit, options, show(p), measure }

export function defaultsOf(PARAMS) {
  return Object.fromEntries(PARAMS.map((d) => [d.key, d.def]));
}

/** Uzupełnia braki, przycina liczby do zakresów, odrzuca nieznane opcje. */
export function normalizeWith(PARAMS, input = {}) {
  const p = defaultsOf(PARAMS);
  for (const d of PARAMS) {
    const v = input[d.key];
    if (v === undefined || v === null || v === '') continue;
    if (d.type === 'select') {
      if (d.options.some(([k]) => k === v)) p[d.key] = v;
    } else if (d.type === 'bool') {
      p[d.key] = v === true || v === 'true' || v === '1' || v === 1;
    } else if (d.type === 'text') {
      p[d.key] = String(v).slice(0, d.max ?? 200);
    } else {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isFinite(n)) p[d.key] = Math.min(d.max, Math.max(d.min, d.step >= 1 ? Math.round(n) : n));
    }
  }
  return p;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderForm(host, PARAMS, GROUPS, p) {
  const html = [];
  for (const g of GROUPS) {
    const items = PARAMS.filter((d) => d.group === g && !d.hidden);
    if (!items.length) continue;
    html.push(`<fieldset data-group="${esc(g)}"><legend>${esc(g)}</legend>`);
    for (const d of items) {
      const tag = d.measure ? `<span class="tag">${d.measure}</span>` : '';
      const label = `<span>${tag}${esc(d.label)}</span>`;
      if (d.type === 'select') {
        html.push(`<label class="row" data-key="${d.key}">${label}<select name="${d.key}">${
          d.options.map(([v, t]) => `<option value="${esc(v)}"${p[d.key] === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`);
      } else if (d.type === 'bool') {
        html.push(`<label class="row" data-key="${d.key}">${label}<input type="checkbox" name="${d.key}"${p[d.key] ? ' checked' : ''}></label>`);
      } else if (d.type === 'text') {
        html.push(`<label class="row wide" data-key="${d.key}">${label}<textarea name="${d.key}" rows="2" maxlength="${d.max ?? 200}">${esc(p[d.key])}</textarea></label>`);
      } else {
        html.push(`<label class="row" data-key="${d.key}">${label}<span class="num"><input name="${d.key}" type="number" inputmode="decimal" min="${d.min}" max="${d.max}" step="${d.step}" value="${p[d.key]}"><i>${d.unit ?? 'mm'}</i></span></label>`);
      }
    }
    html.push('</fieldset>');
  }
  host.innerHTML = html.join('');
  applyVisibility(host, PARAMS, p);
}

export function applyVisibility(host, PARAMS, p) {
  for (const d of PARAMS) {
    const row = host.querySelector(`.row[data-key="${d.key}"]`);
    if (row) row.hidden = d.show ? !d.show(p) : false;
  }
  for (const fs of host.querySelectorAll('fieldset')) fs.hidden = [...fs.querySelectorAll('.row')].every((r) => r.hidden);
}

/** Wartość z pola formularza w postaci, którą rozumie normalizeWith. */
export function fieldValue(el) {
  return el.type === 'checkbox' ? el.checked : el.value;
}

/** Odczyt stanu z adresu: ?p=wariant&klucz=wartość… */
export function readUrlState(PARAMS, PRESETS) {
  const q = new URLSearchParams(location.search);
  const id = q.get('p');
  const preset = PRESETS.find((x) => x.id === id) || null;
  const over = {};
  for (const d of PARAMS) if (q.has(d.key)) over[d.key] = q.get(d.key);
  return { preset: preset?.id ?? null, p: normalizeWith(PARAMS, { ...(preset?.values ?? {}), ...over }) };
}

export function writeUrlState(PARAMS, PRESETS, presetId, p, skip = []) {
  const preset = PRESETS.find((x) => x.id === presetId);
  const base = normalizeWith(PARAMS, preset?.values ?? {});
  const q = new URLSearchParams();
  if (preset) q.set('p', preset.id);
  for (const d of PARAMS) if (!skip.includes(d.key) && p[d.key] !== base[d.key]) q.set(d.key, p[d.key]);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

export function renderPresetChips(host, PRESETS, active, onPick) {
  host.innerHTML = PRESETS.map((pr) => `<button type="button" class="chip" data-id="${pr.id}" aria-pressed="${pr.id === active}">${esc(pr.title)}</button>`).join('');
  host.onclick = (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) onPick(b.dataset.id);
  };
}

export function downloadBlob(data, name, type = 'model/stl') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

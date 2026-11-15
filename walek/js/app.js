// Konfigurator wałka do ceramiki: wzór → manifold-3d → model 3D i rozwinięcie odcisku → STL.
import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
import { PARAMS, GROUPS, PRESETS, normalize } from './params.js';
import { buildRoller, patternSection, imageTile, tileGrid } from './model.js';
import { meshToStl } from '../../lib/stl.js';
import { renderForm, applyVisibility, fieldValue, readUrlState, writeUrlState, renderPresetChips, downloadBlob } from '../../lib/form.js';
import { createViewer, cssVar } from '../../lib/viewer.js';
import { sourceFromImage, maskFromSource, bindImageInput } from '../../lib/imagemask.js';

const $ = (s) => document.querySelector(s);
const state = { ...readUrlState(PARAMS, PRESETS), view: 'model', img: null, imgName: '', result: null, mask: null };
let wasm, viewer, timer, busy = false, again = false;

function syncForm() {
  renderForm($('#form'), PARAMS, GROUPS, state.p);
  $('#drop').hidden = state.p.wzor !== 'obraz';
}
function onInput(e) {
  const el = e.target;
  if (!el.name) return;
  state.p = normalize({ ...state.p, [el.name]: fieldValue(el) });
  if (e.type === 'change' && el.type === 'number') el.value = state.p[el.name];
  applyVisibility($('#form'), PARAMS, state.p);
  $('#drop').hidden = state.p.wzor !== 'obraz';
  schedule();
}

/** Promień, na którym wzór ma nominalną skalę (jak w modelu). */
const refRadius = (p) => (p.tryb === 'wypukly' ? p.srednica / 2 - p.relief : p.srednica / 2);

function makeMask() {
  const p = state.p;
  if (p.wzor !== 'obraz' || !state.img) return null;
  const { tw, th } = tileGrid(p, 2 * Math.PI * refRadius(p));
  return maskFromSource(sourceFromImage(state.img), {
    width: tw * 0.92, height: th * 0.92, px: p.rozdz, threshold: p.prog / 100, minBlobMm2: p.plamki,
  });
}

// ---------- rozwinięcie: odcisk na płaskim plastrze gliny ----------
function drawUnroll() {
  const host = $('#view2d'), cv = $('#unroll');
  const dpr = Math.min(2, devicePixelRatio);
  const W = host.clientWidth, H = host.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cssVar('--panel'); ctx.fillRect(0, 0, W, H);
  if (!wasm) return;
  const p = state.p, L = p.dlugosc, C = 2 * Math.PI * refRadius(p);
  const ring = p.tryb === 'wypukly' && p.pierscienie ? p.pierscienSzer : 0;
  const v0 = ring + p.margines, v1 = L - ring - p.margines;
  const tile = p.wzor === 'obraz' ? imageTile(wasm, p, state.mask) : null;
  const pat = patternSection(wasm, p, C, v0, v1, tile);
  // poziomo: obwód (kierunek toczenia), pionowo: długość wałka
  const s = Math.min((W - 30) / C, (H - 30) / L);
  const ox = (W - C * s) / 2, oy = (H - L * s) / 2;
  ctx.fillStyle = cssVar('--clay'); ctx.fillRect(ox, oy, C * s, L * s);
  ctx.save();
  ctx.beginPath(); ctx.rect(ox, oy + (L - v1) * s, C * s, (v1 - v0) * s); ctx.clip();
  const band = wasm.CrossSection.square([C, v1 - v0]).translate([0, v0]);
  const cs = pat ? pat.intersect(band) : null;
  // wypukły wałek → wzór jest wgłębieniem w glinie (ciemniejszy); wklęsły → wzór wystaje, wgłębione tło
  const deep = cssVar('--clay-deep');
  if (p.tryb === 'wklesly') { ctx.fillStyle = deep; ctx.fillRect(ox, oy, C * s, L * s); ctx.fillStyle = cssVar('--clay'); } else ctx.fillStyle = deep;
  if (cs && !cs.isEmpty()) {
    ctx.beginPath();
    for (const poly of cs.toPolygons()) {
      poly.forEach(([u, v], i) => (i ? ctx.lineTo(ox + u * s, oy + (L - v) * s) : ctx.moveTo(ox + u * s, oy + (L - v) * s)));
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  ctx.restore();
  ctx.strokeStyle = cssVar('--line'); ctx.strokeRect(ox, oy, C * s, L * s);
}

function show3d() {
  if (!state.result || !viewer) return;
  viewer.show([{ manifold: state.result.part, color: cssVar('--accent') }], { key: 'model', dir: [1, -1.3, 0.5] });
}

function setView(v) {
  state.view = v;
  document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.view === v));
  $('#view3d').hidden = v !== 'model';
  $('#view2d').hidden = v !== 'unroll';
  if (v === 'unroll') drawUnroll(); else show3d();
}

function schedule(ms = 250) { clearTimeout(timer); timer = setTimeout(update, ms); }

async function update() {
  writeUrlState(PARAMS, PRESETS, state.preset, state.p);
  if (!wasm) return;
  if (busy) { again = true; return; }
  busy = true;
  $('#time').textContent = 'liczę…';
  await new Promise((r) => setTimeout(r, 0)); // pozwól odświeżyć napis przed dłuższym liczeniem
  const t0 = performance.now();
  try {
    state.mask = makeMask();
    const r = buildRoller(wasm, state.p, state.mask);
    state.result = r;
    const fmt = (v) => v.toFixed(v < 10 ? 1 : 0).replace('.', ',');
    const i = r.info;
    $('#warnings').innerHTML = r.warnings.map((w) => `<li>${w}</li>`).join('');
    $('#info').innerHTML = `
      <div><dt>Wałek</dt><dd>⌀${fmt(state.p.srednica)} × ${fmt(state.p.dlugosc)} mm</dd></div>
      <div><dt>Kafel wzoru</dt><dd>${fmt(i.tw)} × ${fmt(i.th)} mm, ${i.n}× dookoła</dd></div>
      <div><dt>Odcisk z jednego obrotu</dt><dd>${fmt(Math.PI * state.p.srednica)} mm</dd></div>
      <div><dt>Masa PLA (pełne wypełnienie)</dt><dd>≈ ${fmt((i.volume / 1000) * 1.24)} g</dd></div>`;
    $('#time').textContent = `${Math.round(performance.now() - t0)} ms`;
    if (state.view === 'unroll') drawUnroll(); else show3d();
  } catch (err) {
    $('#warnings').innerHTML = `<li>Nie udało się zbudować wałka: ${err.message}</li>`;
  } finally {
    busy = false;
    if (again) { again = false; schedule(0); }
  }
}

function pickPreset(id) {
  state.preset = id;
  state.p = normalize(PRESETS.find((x) => x.id === id).values);
  renderPresetChips($('#presets'), PRESETS, id, pickPreset);
  syncForm(); update();
}
renderPresetChips($('#presets'), PRESETS, state.preset, pickPreset);
syncForm();
$('#form').addEventListener('input', onInput);
$('#form').addEventListener('change', onInput);
bindImageInput($('#drop'), (img, name) => {
  state.img = img; state.imgName = name || 'schowek';
  $('#drop-text').textContent = `${state.imgName} — kliknij albo wklej, żeby zmienić`;
  if (state.p.wzor !== 'obraz') { state.p = normalize({ ...state.p, wzor: 'obraz' }); syncForm(); }
  update();
});
document.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$('#reset').onclick = () => { state.p = normalize(PRESETS.find((x) => x.id === state.preset)?.values ?? {}); syncForm(); update(); };
$('#dl').onclick = () => state.result && downloadBlob(meshToStl(state.result.part.getMesh()), `walek-${state.p.wzor}-${state.p.srednica}x${state.p.dlugosc}.stl`.replace(/\.(?=\d)/g, '_'));
new ResizeObserver(() => state.view === 'unroll' && drawUnroll()).observe($('#view2d'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setView(state.view));

Module().then((m) => {
  m.setup();
  wasm = m;
  viewer = createViewer($('#view3d'));
  $('#status').hidden = true;
  if (location.hash === '#odcisk') setView('unroll');
  update();
}).catch((err) => { $('#status').textContent = `Nie udało się wczytać silnika geometrii: ${err.message}`; });

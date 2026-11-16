// Konfigurator stempli: źródło (tekst/obraz) → maska → manifold-3d → odcisk 2D, model 3D, STL.
import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
import { PARAMS, GROUPS, PRESETS, normalize, contentSize } from './params.js';
import { buildStamp } from './model.js';
import { meshToStl } from '../../lib/stl.js';
import { renderForm, applyVisibility, fieldValue, readUrlState, writeUrlState, renderPresetChips, downloadBlob } from '../../lib/form.js';
import { createViewer, cssVar } from '../../lib/viewer.js';
import { sourceFromImage, sourceFromText, maskFromSource, bindImageInput, autoThreshold } from '../../lib/imagemask.js?v=20261116h';

const $ = (s) => document.querySelector(s);
const state = { ...readUrlState(PARAMS, PRESETS), view: 'imprint', img: null, imgName: '', src: null, srcKey: '', mask: null, result: null };
let wasm, viewer, timer, busy = false, again = false;

// ---------- formularz ----------
function syncForm() {
  renderForm($('#form'), PARAMS, GROUPS, state.p);
  $('#drop').hidden = state.p.zrodlo !== 'obraz';
}
function setValue(key, v) {
  state.p = normalize({ ...state.p, [key]: v });
  const el = $(`#form [name="${key}"]`);
  if (el) el.value = state.p[key];
}
function onInput(e) {
  const el = e.target;
  if (!el.name) return;
  state.p = normalize({ ...state.p, [el.name]: fieldValue(el) });
  if (e.type === 'change' && el.type === 'number') el.value = state.p[el.name];
  applyVisibility($('#form'), PARAMS, state.p);
  $('#drop').hidden = state.p.zrodlo !== 'obraz';
  schedule();
}

// ---------- maska ----------
async function currentSource() {
  const p = state.p;
  const key = p.zrodlo === 'obraz' ? `img:${state.imgName}:${state.img?.src}` : `txt:${p.font}:${p.tekst}`;
  if (key !== state.srcKey) {
    state.srcKey = key;
    state.src = p.zrodlo === 'obraz' ? (state.img ? sourceFromImage(state.img) : null) : await sourceFromText(p.tekst, p.font);
  }
  return state.src;
}

async function makeMask() {
  const p = state.p;
  const src = await currentSource();
  const [w, h] = contentSize(p);
  return maskFromSource(src, {
    width: w, height: h, px: Math.min(p.rozdz, Math.max(w, h) / 500), // małe stemple: drobniejsza siatka
    threshold: p.zrodlo !== 'obraz' ? 0.5 : p.krawedzie ? p.czulosc / 100 : p.prog / 100,
    edges: p.zrodlo === 'obraz' && p.krawedzie,
    scale: p.skala / 100, dx: p.przesX, dy: p.przesY, minBlobMm2: p.plamki,
  });
}

// ---------- podgląd odcisku 2D ----------
const cv = $('#imprint');
let view2d = { scale: 1, ox: 0, oy: 0 };
function drawImprint() {
  const host = $('#view2d');
  const dpr = Math.min(2, devicePixelRatio);
  cv.width = host.clientWidth * dpr; cv.height = host.clientHeight * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = host.clientWidth, H = host.clientHeight, p = state.p;
  const sw = p.szer, sh = p.ksztalt === 'prostokat' ? p.wys : p.szer;
  const s = Math.min((W - 40) / sw, (H - 40) / sh);
  view2d = { scale: s, ox: W / 2, oy: H / 2 };
  ctx.fillStyle = cssVar('--panel'); ctx.fillRect(0, 0, W, H);
  // obrys stempla
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.beginPath();
  if (p.ksztalt === 'okragly') ctx.arc(0, 0, (sw / 2) * s, 0, Math.PI * 2);
  else ctx.roundRect(-(sw / 2) * s, -(sh / 2) * s, sw * s, sh * s, 2 * s);
  ctx.fillStyle = cssVar('--paper'); ctx.fill();
  ctx.strokeStyle = cssVar('--line'); ctx.lineWidth = 1; ctx.stroke();
  ctx.clip();
  // relief jako odcisk (bez lustra): z przekroju z geometrii, a jeśli go nie ma — z maski
  const cs = state.result?.reliefCs;
  ctx.fillStyle = cssVar('--relief');
  if (cs && !cs.isEmpty()) {
    const flip = p.lustro ? -1 : 1;
    ctx.beginPath();
    for (const poly of cs.toPolygons()) {
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(flip * x * s, -y * s) : ctx.moveTo(flip * x * s, -y * s)));
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  ctx.restore();
  // pole na wzór
  const [cw, ch] = contentSize(p);
  ctx.setLineDash([4, 4]); ctx.strokeStyle = cssVar('--muted');
  ctx.strokeRect(W / 2 - (cw / 2) * s, H / 2 - (ch / 2) * s, cw * s, ch * s);
  ctx.setLineDash([]);
}

function bindDrag() {
  // mysz / pióro: przesuwanie; dotyk: dopiero dwa palce przesuwają (środkiem) i skalują (rozsuwaniem),
  // jeden palec przewija stronę (touch-action: pan-y) — inaczej przewijanie po podglądzie wyrzucało wzór poza stempel
  const pts = new Map();
  let drag = null;
  const centre = () => {
    const ps = [...pts.values()];
    return { ps, x: ps.reduce((a, q) => a + q.x, 0) / ps.length, y: ps.reduce((a, q) => a + q.y, 0) / ps.length,
      dist: ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0 };
  };
  const start = () => {
    if (!pts.size) { drag = null; return; }
    const c = centre();
    drag = { x: c.x, y: c.y, dist: c.dist, px: state.p.przesX, py: state.p.przesY, skala: state.p.skala };
  };
  cv.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' });
    if (e.pointerType !== 'touch' || pts.size > 1) for (const id of pts.keys()) try { cv.setPointerCapture(id); } catch { /* palec już zniknął */ }
    start();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' });
    const c = centre();
    if (c.ps.length < 2 && c.ps[0].touch) return; // jeden palec: przewijanie strony
    if (e.pointerType === 'touch') e.preventDefault();
    setValue('przesX', +(drag.px + (c.x - drag.x) / view2d.scale).toFixed(1));
    setValue('przesY', +(drag.py - (c.y - drag.y) / view2d.scale).toFixed(1));
    if (c.ps.length > 1 && drag.dist > 10) setValue('skala', Math.round((drag.skala * c.dist) / drag.dist));
    schedule(60);
  });
  // dwa palce na podglądzie: przeglądarka nie przejmuje gestu jako przewijania (pan-y)
  const twoFingers = (e) => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); };
  cv.addEventListener('touchstart', twoFingers, { passive: false });
  cv.addEventListener('touchmove', twoFingers, { passive: false });
  const end = (e) => { pts.delete(e.pointerId); start(); };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    setValue('skala', Math.round(state.p.skala * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
    schedule(60);
  }, { passive: false });
}

// ---------- 3D ----------
function show3d() {
  const r = state.result;
  if (!r || !viewer) return;
  const accent = cssVar('--accent');
  if (state.view === 'model') {
    const items = [{ manifold: r.part, color: accent }];
    if (r.handle) items.push({ manifold: r.handle, color: cssVar('--peg') });
    viewer.show(items, { key: 'model', dir: [0.5, -1.2, 1.3] });
  } else if (state.view === 'print') {
    viewer.show([{ manifold: r.print, color: accent }], { key: 'print', dir: [0.6, -1.2, 1.1], bed: state.p.stol });
  }
}

function setView(v) {
  state.view = v;
  document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.view === v));
  $('#view2d').hidden = v !== 'imprint';
  $('#view3d').hidden = v === 'imprint';
  if (v === 'imprint') drawImprint(); else show3d();
}

// ---------- obliczenia ----------
function schedule(ms = 200) { clearTimeout(timer); timer = setTimeout(update, ms); }

async function update() {
  writeUrlState(PARAMS, PRESETS, state.preset, state.p, state.p.zrodlo === 'obraz' ? ['tekst'] : []);
  if (!wasm) return;
  if (busy) { again = true; return; }
  busy = true;
  const t0 = performance.now();
  try {
    state.mask = await makeMask();
    const r = buildStamp(wasm, state.p, state.mask);
    state.result = r;
    const fmt = (v) => v.toFixed(v < 10 ? 1 : 0).replace('.', ',');
    const i = r.info;
    const warn = [...r.warnings];
    if (state.p.zrodlo === 'obraz' && !state.img) warn.unshift('Wczytaj obraz: upuść plik, wybierz go albo wklej ze schowka.');
    $('#warnings').innerHTML = warn.map((w) => `<li>${w}</li>`).join('');
    $('#info').innerHTML = `
      <div><dt>Stempel</dt><dd>${i.size.map(fmt).join(' × ')} mm</dd></div>
      <div><dt>Pole wzoru</dt><dd>${contentSize(state.p).map(fmt).join(' × ')} mm</dd></div>
      <div><dt>Na stole</dt><dd>${i.printSize.slice(0, 2).map(fmt).join(' × ')} mm</dd></div>
      <div><dt>Masa PLA (pełne wypełnienie)</dt><dd>≈ ${fmt((i.volume / 1000) * 1.24)} g</dd></div>`;
    $('#dl-handle').hidden = !r.handle;
    $('#time').textContent = `${Math.round(performance.now() - t0)} ms`;
    if (state.view === 'imprint') drawImprint(); else show3d();
  } catch (err) {
    $('#warnings').innerHTML = `<li>Nie udało się zbudować stempla: ${err.message}</li>`;
  } finally {
    busy = false;
    if (again) { again = false; schedule(0); }
  }
}

const fileBase = () => (state.p.zrodlo === 'tekst' ? state.p.tekst : state.imgName.replace(/\.[^.]+$/, '') || 'obraz')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'stempel';

// ---------- start ----------
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
bindDrag();
bindImageInput($('#drop'), (img, name) => {
  state.img = img; state.imgName = name || 'schowek';
  $('#drop-text').textContent = `${state.imgName} — kliknij albo wklej, żeby zmienić`;
  if (state.p.zrodlo !== 'obraz') setValue('zrodlo', 'obraz');
  setValue('skala', 100); setValue('przesX', 0); setValue('przesY', 0); // nowy obraz: od środka
  const auto = autoThreshold(sourceFromImage(img));
  setValue('prog', Math.round(auto.threshold * 100));
  syncForm();
  $('#thumb img').src = img.src;
  $('#thumb-text').textContent = `${state.imgName} (${img.naturalWidth} × ${img.naturalHeight} px)${img.flattened ? ', wyrównane oświetlenie' : ''}: próg jasności ${state.p.prog} %, ciemne ${Math.round(auto.dark * 100)} % kadru. Za grube albo za cienkie linie? Zmień próg w parametrach.`;
  $('#thumb').hidden = false;
  if (img.blank) $('#thumb-text').textContent = `${state.imgName} (${img.naturalWidth} × ${img.naturalHeight} px): przeglądarka pokazała zdjęcie, ale nie dała go odczytać — obraz wyszedł pusty. Ustaw w aparacie mniejszą rozdzielczość albo zrób zrzut ekranu zdjęcia i wybierz go z galerii.`;
  $('#pick-name').textContent = 'Dwoma palcami na podglądzie przesuniesz i powiększysz wzór.';
  if (matchMedia('(max-width: 860px)').matches) $('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  update();
}, [$('#camera'), $('#gallery')], (msg) => {
  $('#pick-name').textContent = msg;
  $('#drop-text').textContent = msg;
});
const coarse = matchMedia('(pointer: coarse)');
const setHint = () => ($('#hint').textContent = coarse.matches ? 'dwa palce: przesuwanie i skala' : 'przeciągnij, żeby przesunąć · kółko myszy: skala');
$('#center').onclick = () => { setValue('skala', 100); setValue('przesX', 0); setValue('przesY', 0); update(); };
setHint();
coarse.addEventListener('change', setHint);
document.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$('#reset').onclick = () => { state.p = normalize(PRESETS.find((x) => x.id === state.preset)?.values ?? {}); syncForm(); update(); };
$('#dl').onclick = () => state.result && downloadBlob(meshToStl(state.result.print.getMesh()), `stempel-${fileBase()}.stl`);
$('#dl-stamp').onclick = () => state.result && downloadBlob(meshToStl(state.result.part.getMesh()), `stempel-${fileBase()}-sam.stl`);
$('#dl-handle').onclick = () => state.result?.handle && downloadBlob(meshToStl(state.result.handle.getMesh()), `stempel-raczka-${state.p.raczkaWys}mm.stl`);
new ResizeObserver(() => state.view === 'imprint' && drawImprint()).observe($('#view2d'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setView(state.view));

Module().then((m) => {
  m.setup();
  wasm = m;
  viewer = createViewer($('#view3d'));
  $('#status').hidden = true;
  const v = location.hash.slice(1);
  if (['imprint', 'model', 'print'].includes(v)) setView(v);
  update();
}).catch((err) => { $('#status').textContent = `Nie udało się wczytać silnika geometrii: ${err.message}`; });

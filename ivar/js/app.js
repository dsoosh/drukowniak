// Konfigurator mocowań IVAR: formularz → manifold-3d → podgląd three.js → STL do pobrania.
import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PARAMS, GROUPS, PRESETS, defaults, normalize, presetParams } from './params.js';
import { buildIvar, buildPost } from './model.js';
import { meshToStl, stlName } from '../../lib/stl.js';

const $ = (s) => document.querySelector(s);
const state = { preset: null, p: defaults(), view: 'mount', result: null };

// ---------- stan w adresie ----------
function readUrl() {
  const q = new URLSearchParams(location.search);
  const id = q.get('p');
  const base = id ? presetParams(id) : defaults();
  const over = {};
  for (const d of PARAMS) if (q.has(d.key)) over[d.key] = q.get(d.key);
  state.preset = PRESETS.some((x) => x.id === id) ? id : null;
  state.p = normalize({ ...base, ...over });
}
function writeUrl() {
  const base = state.preset ? presetParams(state.preset) : defaults();
  const q = new URLSearchParams();
  if (state.preset) q.set('p', state.preset);
  for (const d of PARAMS) if (state.p[d.key] !== base[d.key]) q.set(d.key, state.p[d.key]);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

// ---------- formularz ----------
function renderPresets() {
  $('#presets').innerHTML = PRESETS.map((pr) =>
    `<button type="button" class="chip" data-id="${pr.id}" aria-pressed="${pr.id === state.preset}">${pr.title}</button>`).join('');
  $('#presets').onclick = (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    state.preset = b.dataset.id;
    state.p = presetParams(state.preset);
    renderPresets(); renderForm(); update();
  };
}

function renderForm() {
  const html = [];
  for (const g of GROUPS) {
    const items = PARAMS.filter((d) => d.group === g);
    if (!items.length) continue;
    html.push(`<fieldset data-group="${g}"><legend>${g}</legend>`);
    for (const d of items) {
      const id = `f-${d.key}`;
      const tag = d.measure ? `<span class="tag">${d.measure}</span>` : '';
      if (d.type === 'select') {
        html.push(`<label class="row" data-key="${d.key}"><span>${tag}${d.label}</span><select id="${id}" name="${d.key}">${
          d.options.map(([v, t]) => `<option value="${v}"${state.p[d.key] === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`);
      } else {
        html.push(`<label class="row" data-key="${d.key}"><span>${tag}${d.label}</span><span class="num"><input id="${id}" name="${d.key}" type="number" inputmode="decimal" min="${d.min}" max="${d.max}" step="${d.step}" value="${state.p[d.key]}"><i>${d.key === 'obejmaOtwarcie' ? '%' : d.key.startsWith('kolkiIle') || d.key === 'kolkiCo' || d.key === 'plOtwory' ? 'szt.' : 'mm'}</i></span></label>`);
      }
    }
    html.push('</fieldset>');
  }
  $('#form').innerHTML = html.join('');
  applyVisibility();
}

function applyVisibility() {
  for (const d of PARAMS) {
    const row = document.querySelector(`.row[data-key="${d.key}"]`);
    if (row) row.hidden = d.show ? !d.show(state.p) : false;
  }
  for (const fs of document.querySelectorAll('#form fieldset')) {
    fs.hidden = [...fs.querySelectorAll('.row')].every((r) => r.hidden);
  }
}

function onInput(e) {
  const el = e.target;
  if (!el.name) return;
  const raw = { ...state.p, [el.name]: el.value };
  state.p = normalize(raw);
  if (e.type === 'change' && el.type === 'number') el.value = state.p[el.name];
  applyVisibility();
  scheduleUpdate();
}

// ---------- 3D ----------
let renderer, scene, camera, controls, group;
function initView() {
  const host = $('#view');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  camera.up.set(0, 0, 1);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-200, -300, 500);
  scene.add(sun);
  group = new THREE.Group();
  scene.add(group);
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); // rozmiar płótna z CSS, inaczej rozpycha układ na telefonie
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
}

function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function meshOf(manifold, color, opts = {}) {
  const m = manifold.getMesh();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.vertProperties, m.numProp));
  g.setIndex(new THREE.BufferAttribute(m.triVerts, 1));
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0, ...opts });
  return new THREE.Mesh(g, mat);
}

let lastFrame = '';
function show() {
  const r = state.result;
  if (!r) return;
  for (const c of [...group.children]) { c.geometry?.dispose(); group.remove(c); }
  const accent = css('--accent'), wood = css('--wood');
  if (state.view === 'mount') {
    group.add(meshOf(r.part, accent));
    for (const pg of r.pegs) group.add(meshOf(pg, css('--peg')));
    const bb = r.part.boundingBox();
    group.add(meshOf(r.post, wood, { transparent: true, opacity: 0.55, roughness: 0.9 }));
    frame(bb, 'mount');
  } else {
    group.add(meshOf(r.print, accent));
    const bb = r.print.boundingBox();
    const s = state.p.stol;
    const grid = new THREE.GridHelper(s, s / 10, css('--line'), css('--line'));
    grid.rotation.x = Math.PI / 2;
    grid.position.set((bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, -0.05);
    group.add(grid);
    frame(bb, 'print');
  }
}

function frame(bb, kind) {
  const key = `${kind}`;
  const c = new THREE.Vector3((bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2);
  const size = Math.max(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]);
  if (key === lastFrame) { controls.target.copy(c); return; }
  lastFrame = key;
  const dir = kind === 'mount' ? new THREE.Vector3(-1.1, -1.4, 0.8) : new THREE.Vector3(0.6, -1.2, 1.1);
  camera.position.copy(c).add(dir.normalize().multiplyScalar(size * 2.6 + 60));
  controls.target.copy(c);
}

// ---------- obliczenia ----------
let wasm, timer;
function scheduleUpdate() { clearTimeout(timer); timer = setTimeout(update, 120); }

function update() {
  writeUrl();
  if (!wasm) return;
  const t0 = performance.now();
  let r;
  try {
    r = buildIvar(wasm, state.p);
  } catch (err) {
    $('#warnings').innerHTML = `<li>Nie udało się zbudować bryły: ${err.message}</li>`;
    return;
  }
  const bb = r.part.boundingBox();
  r.post = buildPost(wasm, state.p, bb.min[2], bb.max[2], r.info.pegZs[0]);
  state.result = r;
  show();
  const i = r.info;
  const fmt = (v) => v.toFixed(v < 10 ? 1 : 0).replace('.', ',');
  const pegs = i.pegCount ? `osobne, ${i.pegCount} × ⌀${fmt(state.p.kolekD)} × ${fmt(i.pegShaft)} mm (+ łeb)`
    : i.latch ? `zatrzask, języczek wygina się o ${(i.latch.strain * 100).toFixed(1).replace('.', ',')} %` : 'wbudowane w płytkę';
  $('#info').innerHTML = `
    <div><dt>Część do druku</dt><dd>${i.partSize.map(fmt).join(' × ')} mm</dd></div>
    <div><dt>Na stole razem z kołkami</dt><dd>${i.printSize.slice(0, 2).map(fmt).join(' × ')} mm</dd></div>
    <div><dt>Kołki</dt><dd>${pegs}</dd></div>
    <div><dt>Masa PLA (pełne wypełnienie)</dt><dd>≈ ${fmt((i.volume / 1000) * 1.24)} g</dd></div>`;
  $('#warnings').innerHTML = r.warnings.map((w) => `<li>${w}</li>`).join('');
  $('#time').textContent = `${Math.round(performance.now() - t0)} ms`;
  $('#dl-pegs').hidden = !r.pegPrint;
}

function download(manifold, name) {
  const blob = new Blob([meshToStl(manifold.getMesh(), `drukowniak ${name}`)], { type: 'model/stl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- start ----------
readUrl();
renderPresets();
renderForm();
initView();
$('#form').addEventListener('input', onInput);
$('#form').addEventListener('change', onInput);
for (const b of document.querySelectorAll('[data-view]')) {
  b.onclick = () => {
    state.view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    show();
  };
}
$('#dl').onclick = () => state.result && download(state.result.print, stlName('ivar', state.p));
$('#dl-pegs').onclick = () => state.result?.pegPrint && download(state.result.pegPrint, `ivar-kolki-${state.result.pegs.length}x.stl`);
$('#reset').onclick = () => { state.p = state.preset ? presetParams(state.preset) : defaults(); renderForm(); update(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', show);

Module().then((m) => {
  m.setup();
  wasm = m;
  $('#status').hidden = true;
  update();
}).catch((err) => { $('#status').textContent = `Nie udało się wczytać silnika geometrii: ${err.message}`; });

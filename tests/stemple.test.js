// Testy stempli: node tests/stemple.test.js
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { buildStamp } from '../stemple/js/model.js';
import { PRESETS, normalize, contentSize } from '../stemple/js/params.js';
import { maskToPolygons, removeSmallBlobs } from '../lib/mask.js';

const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', e.message); }
}

/** Syntetyczna maska: litera „L” (asymetryczna, żeby sprawdzić lustro) + kropka-plamka. */
function sampleMask(p) {
  const [cw, ch] = contentSize(p);
  const px = p.rozdz, w = Math.round(cw / px), h = Math.round(ch / px);
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h; // v = 0 to góra obrazu
    const L = (u > 0.1 && u < 0.3 && v > 0.1 && v < 0.9) || (u > 0.1 && u < 0.7 && v > 0.7 && v < 0.9);
    data[y * w + x] = L ? 1 : 0;
  }
  data[2 * w + w - 3] = 1; // pojedynczy piksel — plamka
  return { w, h, data, px };
}

test('kontury maski: kwadrat 3×3 px z dziurą 1 px', () => {
  const data = new Uint8Array(25);
  for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) data[y * 5 + x] = 1;
  data[12] = 0;
  const polys = maskToPolygons({ w: 5, h: 5, data, px: 1 });
  const area = polys.reduce((s, pts) => s + pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0), 0);
  assert.equal(polys.length, 2);
  assert.equal(area, 8);
});

test('usuwanie plamek nie rusza tła przy krawędzi', () => {
  const m = { w: 4, h: 4, data: new Uint8Array(16), px: 1 };
  m.data[5] = 1;
  removeSmallBlobs(m, 2);
  assert.equal(m.data.reduce((a, b) => a + b, 0), 0);
});

for (const pr of PRESETS) {
  const p = normalize(pr.values);
  const r = buildStamp(wasm, p, sampleMask(p));
  test(`${pr.id}: poprawna bryła, relief na licu, bez ostrzeżeń`, () => {
    assert.equal(r.part.status(), 'NoError');
    assert.equal(r.part.decompose().length, 1);
    assert.deepEqual(r.warnings, []);
    const bb = r.part.boundingBox();
    assert.ok(Math.abs(bb.max[2] - (p.podstawa + p.relief)) < 0.02);
    assert.ok(Math.abs(bb.min[2]) < 1e-6);
  });
  test(`${pr.id}: rączka pasuje w gniazdo, druk na stole`, () => {
    assert.ok(r.handle, 'brak rączki');
    assert.equal(r.handle.status(), 'NoError');
    assert.ok(r.handle.intersect(r.part).volume() < 0.5, 'rączka koliduje ze stemplem');
    const pegTop = r.handle.boundingBox().max[2];
    assert.ok(pegTop > 2.5 && pegTop < p.podstawa - 1, `kołek kończy się w z=${pegTop}`);
    assert.ok(Math.abs(r.print.boundingBox().min[2]) < 1e-6);
    assert.equal(r.print.decompose().length, 2);
  });
}

test('lustro: odbicie zmienia stronę dłuższego ramienia „L”', () => {
  const p = normalize({ ksztalt: 'kwadrat', szer: 40, relief: 2, pochylenie: 0, raczka: 'brak' });
  const cx = (cs) => { const b = cs.bounds(); return b; };
  const a = buildStamp(wasm, { ...p, lustro: false }, sampleMask(p)).reliefCs;
  const b = buildStamp(wasm, { ...p, lustro: true }, sampleMask(p)).reliefCs;
  // pionowa kreska L po lewej (bez lustra) / po prawej (z lustrem)
  const leftA = a.intersect(wasm.CrossSection.square([20, 40]).translate([-20, -20])).area();
  const leftB = b.intersect(wasm.CrossSection.square([20, 40]).translate([-20, -20])).area();
  assert.ok(leftA > leftB * 1.5, `${leftA} vs ${leftB}`);
  assert.ok(cx(a).min[0] < 0);
});

test('pochylenie: relief szerszy u podstawy niż na licu', () => {
  const p = normalize({ ksztalt: 'kwadrat', szer: 40, relief: 2, pochylenie: 40, raczka: 'brak' });
  const r = buildStamp(wasm, p, sampleMask(p));
  const slab = (z) => r.part.intersect(Manifold.cube([60, 60, 0.1], true).translate([0, 0, z])).volume();
  assert.ok(slab(p.podstawa + 0.2) > slab(p.podstawa + p.relief - 0.2) * 1.2);
});

test('pusta maska → ostrzeżenie, sama podstawa', () => {
  const p = normalize({});
  const r = buildStamp(wasm, p, null);
  assert.ok(r.warnings.some((w) => w.includes('Brak reliefu')));
  assert.equal(r.part.status(), 'NoError');
});

if (failed) { console.log(`\n${failed} nieudanych`); process.exit(1); }
console.log('\nwszystko ok');

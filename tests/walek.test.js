// Testy wałka do ceramiki: node tests/walek.test.js
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { buildRoller, tileGrid } from '../walek/js/model.js';
import { PRESETS, normalize } from '../walek/js/params.js';

const wasm = await Module();
wasm.setup();
const { Manifold, CrossSection: CS } = wasm;

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', e.message); }
}

/** Objętość materiału w pierścieniu promieni [r0, r1] i wysokości [z0, z1]. */
const shell = (m, r0, r1, z0, z1) => m.intersect(CS.circle(r1, 256).subtract(CS.circle(r0, 256)).extrude(z1 - z0).translate([0, 0, z0])).volume();

for (const pr of PRESETS) {
  const p = normalize(pr.values);
  const r = buildRoller(wasm, p);
  const Ro = p.srednica / 2, h = p.relief;
  test(`${pr.id}: jedna poprawna bryła z otworem na oś, bez ostrzeżeń`, () => {
    assert.equal(r.part.status(), 'NoError');
    assert.equal(r.part.decompose().length, 1);
    assert.deepEqual(r.warnings, []);
    const bb = r.part.boundingBox();
    assert.ok(Math.abs(bb.min[2]) < 1e-6 && Math.abs(bb.max[2] - p.dlugosc) < 1e-6);
    assert.ok(bb.max[0] <= Ro + 0.05 && bb.max[0] > Ro - 0.3, `promień zewn. ${bb.max[0]}`);
  });
  test(`${pr.id}: relief w zadanej warstwie`, () => {
    const mid0 = p.dlugosc * 0.3, mid1 = p.dlugosc * 0.7;
    const full = Math.PI * ((Ro) ** 2 - (Ro - h) ** 2) * (mid1 - mid0);
    const frac = shell(r.part, Ro - h + 0.05, Ro - 0.05, mid0, mid1) / full;
    assert.ok(frac > 0.08 && frac < 0.97, `wypełnienie warstwy reliefu ${frac.toFixed(2)}`);
    assert.ok(shell(r.part, Ro + 0.05, Ro + 3, 0, p.dlugosc) < 1e-6, 'coś wystaje ponad średnicę');
  });
  test(`${pr.id}: wzór ciągły na szwie (obrót o kafel nic nie zmienia)`, () => {
    const { n } = tileGrid(p, 2 * Math.PI * (p.tryb === 'wypukly' ? Ro - h : Ro));
    const z0 = p.dlugosc * 0.3, z1 = p.dlugosc * 0.7;
    const band = (m) => m.intersect(CS.circle(Ro + 1, 256).subtract(CS.circle(Ro - h - 0.2, 256)).extrude(z1 - z0).translate([0, 0, z0]));
    const a = band(r.part), b = band(r.part.rotate([0, 0, 360 / n]));
    const diff = a.subtract(b).volume() + b.subtract(a).volume();
    assert.ok(diff / a.volume() < 0.03, `różnica po obrocie ${(diff / a.volume() * 100).toFixed(1)} %`);
  });
}

test('pierścienie dystansowe: promień = zewnętrzny − głębokość odcisku', () => {
  const p = normalize({ wzor: 'romby', pierscienie: true, glebokosc: 1 });
  const r = buildRoller(wasm, p);
  const ringR = p.srednica / 2 - p.glebokosc;
  assert.ok(shell(r.part, ringR - 0.1, ringR - 0.02, 1, p.pierscienSzer - 1) > 0, 'brak pierścienia');
  assert.ok(shell(r.part, ringR + 0.05, ringR + 2, 0.5, p.pierscienSzer - 1) < 1e-6, 'pierścień za duży');
});

test('ostrzeżenia: głębokość > relief, za duży otwór', () => {
  assert.ok(buildRoller(wasm, normalize({ glebokosc: 3, relief: 1.5 })).warnings.length > 0);
  assert.ok(buildRoller(wasm, normalize({ os: 25, srednica: 30 })).warnings.length > 0);
});

if (failed) { console.log(`\n${failed} nieudanych`); process.exit(1); }
console.log('\nwszystko ok');

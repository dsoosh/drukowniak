// Testy geometrii mocowań IVAR: node tests/ivar.test.js
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { buildIvar, buildPost } from '../ivar/js/model.js';
import { PRESETS, presetParams, normalize } from '../ivar/js/params.js';
import { meshToStl } from '../lib/stl.js';

const wasm = await Module();
wasm.setup();
const { Manifold } = wasm;

let failed = 0;
function test(name, fn) {
  try { fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, '\n     ', e.message); }
}

const postBox = (p) => Manifold.cube([p.slupekGrub, p.slupekSzer, 2000]).translate([0, 0, -1000]);

const solidPost = (p, r) => buildPost(wasm, p, -100, 300, r.info.pegZs[0]);

for (const pr of PRESETS) {
  for (const kolki of ['jedna', 'osobne']) {
    const p = normalize({ ...presetParams(pr.id), kolki });
    const r = buildIvar(wasm, p);
    const id = `${pr.id}/${kolki}`;
    test(`${id}: poprawna, jedna bryła, bez ostrzeżeń`, () => {
      assert.equal(r.part.status(), 'NoError');
      assert.equal(r.part.decompose().length, 1);
      assert.ok(r.part.volume() > 1000);
      assert.deepEqual(r.warnings, []);
    });
    test(`${id}: nie wchodzi w słupek poza otworami`, () => {
      const overlap = r.part.intersect(solidPost(p, r)).volume();
      assert.ok(overlap < 0.5, `część wchodzi w słupek: ${overlap.toFixed(2)} mm³`);
    });
    test(`${id}: kołki w osi otworów co rozstaw`, () => {
      for (let i = 1; i < r.info.pegZs.length; i++) assert.equal(r.info.pegZs[i] - r.info.pegZs[i - 1], p.otworRozstaw * p.kolkiCo);
      if (kolki === 'osobne') {
        assert.equal(r.pegs.length, p.kolkiIle);
        for (const [i, pg] of r.pegs.entries()) {
          const bb = pg.boundingBox();
          assert.ok(Math.abs((bb.min[2] + bb.max[2]) / 2 - r.info.pegZs[i]) < 0.01);
          assert.ok(Math.abs((bb.min[1] + bb.max[1]) / 2 - p.otworY) < 0.01);
          assert.ok(Math.abs(bb.max[0] - p.kolekGleb) < 0.01, `kołek kończy się w x=${bb.max[0]}`);
          assert.ok(pg.intersect(r.part).volume() < 0.5, 'kołek koliduje z częścią');
        }
      } else {
        assert.equal(r.pegs.length, 0);
        assert.equal(r.pegPrint, null);
        const depth = p.mocowanie === 'opaska' ? p.zatrzaskGleb : p.kolekGleb;
        for (const z of r.info.pegZs) {
          const probe = Manifold.cube([depth - 1.5, 1, 1], true).translate([(depth - 1.5) / 2 + 0.5, p.otworY, z]);
          assert.ok(r.part.intersect(probe).volume() > 0.4 * probe.volume(), `brak kołka w otworze z=${z}`);
        }
      }
    });
    test(`${id}: układ do druku leży na stole i się mieści`, () => {
      const bb = r.print.boundingBox();
      assert.ok(Math.abs(bb.min[2]) < 1e-6);
      assert.ok(r.info.printSize[0] <= p.stol && r.info.printSize[1] <= p.stol);
      const stl = meshToStl(r.print.getMesh());
      assert.equal(stl.byteLength, 84 + 50 * (r.print.getMesh().triVerts.length / 3));
    });
  }
}

test('zatrzask: języczek oddzielony nacięciami, odkształcenie w granicach PETG', () => {
  for (const strona of ['lewa', 'prawa']) {
    const p = normalize({ mocowanie: 'opaska', element: 'hak', strona });
    const r = buildIvar(wasm, p);
    const z = r.info.pegZs[0], wt = Math.max(p.kolekD + 3, 9);
    const yMid = strona === 'lewa' ? p.slupekSzer / 4 : (3 * p.slupekSzer) / 4;
    const slit = Manifold.cube([p.opaskaScianka, 2, 0.5], true).translate([-p.luz - p.opaskaScianka / 2, yMid, z - wt / 2 - 0.35]);
    assert.ok(r.part.intersect(slit).volume() < 1e-6, `${strona}: brak nacięcia`);
    assert.ok(r.info.latch.strain > 0.005 && r.info.latch.strain < 0.03, `odkształcenie ${r.info.latch.strain}`);
  }
});

test('opaska: luz wokół słupka, ścianka boczna po wybranej stronie', () => {
  for (const strona of ['lewa', 'prawa']) {
    const p = normalize({ mocowanie: 'opaska', element: 'hak', strona, kolki: 'osobne' });
    const r = buildIvar(wasm, p);
    const grown = Manifold.cube([p.slupekGrub + 2 * p.luz - 0.02, p.slupekSzer + p.luz - 0.02, 2000]).translate([-p.luz + 0.01, strona === 'lewa' ? 0.01 : -p.luz + 0.01, -1000]);
    assert.ok(r.part.intersect(grown).volume() < 0.5, `${strona}: brak luzu`);
    const bb = r.part.boundingBox();
    if (strona === 'lewa') assert.ok(bb.max[1] > p.slupekSzer + p.luz && bb.min[1] >= -0.01);
    else assert.ok(bb.min[1] < -p.luz && bb.max[1] <= p.slupekSzer + 0.01);
  }
});

test('kołki wbudowane: objętość w otworach', () => {
  const p = normalize({ mocowanie: 'otwory', element: 'hak', kolki: 'jedna' });
  const r = buildIvar(wasm, p);
  assert.equal(r.pegs.length, 0);
  assert.equal(r.pegPrint, null);
  const inPost = r.part.intersect(postBox(p)).volume();
  const r2 = (p.kolekD / 2) ** 2;
  const expected = p.kolkiIle * (Math.PI * r2 / 2 + r2) * p.kolekGleb; // pół koła + V
  assert.ok(Math.abs(inPost - expected) / expected < 0.08, `${inPost} vs ${expected}`);
});

test('ostrzeżenia: za niska opaska, płytka przy mocowaniu w otwory', () => {
  assert.ok(buildIvar(wasm, normalize({ mocowanie: 'opaska', opaskaWys: 20, kolkiIle: 2, kolki: 'osobne' })).warnings.length > 0);
  assert.ok(buildIvar(wasm, normalize({ mocowanie: 'otwory', element: 'plytka' })).warnings.length > 0);
});

test('normalize przycina do zakresów i odrzuca nieznane opcje', () => {
  const p = normalize({ kolkiIle: 99, element: 'xxx', luz: '0.3' });
  assert.equal(p.kolkiIle, 4);
  assert.equal(p.element, 'hak');
  assert.equal(p.luz, 0.3);
});

test('słupek do podglądu ma otwór w osi kołka', () => {
  const p = presetParams('hak-otwory');
  const r = buildIvar(wasm, p);
  const post = buildPost(wasm, p, 0, 60, r.info.pegZs[0]);
  assert.equal(post.status(), 'NoError');
  const probe = Manifold.cube([2, 1, 1], true).translate([p.slupekGrub / 2, p.otworY, r.info.pegZs[0]]);
  assert.ok(post.intersect(probe).volume() < 1e-6);
});

if (failed) { console.log(`\n${failed} nieudanych`); process.exit(1); }
console.log('\nwszystko ok');

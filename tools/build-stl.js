// Generuje gotowe STL dla wariantów z ivar/js/params.js (wymiary domyślne) do stl/ivar/.
// Usage: node tools/build-stl.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Module from 'manifold-3d';
import { buildIvar } from '../ivar/js/model.js';
import { PRESETS, presetParams } from '../ivar/js/params.js';
import { meshToStl } from '../lib/stl.js';
import { meshToPng } from './thumb.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'stl', 'ivar');
fs.mkdirSync(out, { recursive: true });

const wasm = await Module();
wasm.setup();

const write = (name, manifold) => {
  const buf = Buffer.from(meshToStl(manifold.getMesh(), `drukowniak ${name}`));
  fs.writeFileSync(path.join(out, name), buf);
  console.log(`${name}  ${(buf.length / 1024).toFixed(0)} kB`);
};

for (const pr of PRESETS) {
  const r = buildIvar(wasm, presetParams(pr.id));
  if (r.warnings.length) throw new Error(`${pr.id}: ${r.warnings.join(' ')}`);
  write(`${pr.id}.stl`, r.print);
  // miniatura: część w pozycji montażowej z kołkami w otworach
  fs.writeFileSync(path.join(out, `${pr.id}.png`), meshToPng(wasm.Manifold.union([r.part, ...r.pegs]).getMesh()));
}
// pojedynczy kołek do opaski (najdłuższy) — zapas albo zamiennik
const r = buildIvar(wasm, { ...presetParams('hak-opaska'), kolki: 'osobne' });
write('kolek.stl', r.pegPrint.decompose()[0]);

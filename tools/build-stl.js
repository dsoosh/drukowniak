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

// ---------- miniatury kafelków strony głównej ----------
const img = path.join(root, 'img');
fs.mkdirSync(img, { recursive: true });
const { buildStamp } = await import('../stemple/js/model.js');
const stampParams = await import('../stemple/js/params.js');
const { buildRoller } = await import('../walek/js/model.js');
const rollerParams = await import('../walek/js/params.js');

// stempel: gwiazda w kole (maska syntetyczna, bez canvasa)
{
  const p = stampParams.normalize({ ksztalt: 'okragly', szer: 40, ramka: true, pochylenie: 30 });
  const [cw, ch] = stampParams.contentSize(p);
  const px = 0.1, w = Math.round(cw / px), h = Math.round(ch / px);
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x / w - 0.5) * 2, v = (0.5 - y / h) * 2;
    const a = Math.atan2(v, u), r = Math.hypot(u, v);
    const star = 0.55 + 0.4 * Math.cos(5 * (a - Math.PI / 2));
    data[y * w + x] = r < star * 0.95 ? 1 : 0;
  }
  const r = buildStamp(wasm, p, { w, h, data, px });
  fs.writeFileSync(path.join(img, 'stemple.png'), meshToPng(wasm.Manifold.union([r.part, r.handle]).getMesh()));
}
{
  const r = buildRoller(wasm, rollerParams.normalize({ wzor: 'luski', kafel: 10, proporcja: 60 }));
  fs.writeFileSync(path.join(img, 'walek.png'), meshToPng(r.part.getMesh()));
}
fs.copyFileSync(path.join(out, 'hak-opaska.png'), path.join(img, 'ivar.png'));
console.log('miniatury: img/ivar.png, img/stemple.png, img/walek.png');

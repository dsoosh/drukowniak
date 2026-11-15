// Maska binarna (obraz po progowaniu) → kontury → CrossSection. Czyste funkcje, bez canvasa.
// Maska: { w, h, data: Uint8Array (1 = relief), px: mm na piksel }. Wiersz 0 to GÓRA obrazu.

/** Usuwa spójne obszary (reliefu i dziur) mniejsze niż minArea pikseli. Zmienia data w miejscu. */
export function removeSmallBlobs(mask, minArea) {
  if (minArea <= 0) return mask;
  const { w, h, data } = mask;
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const comp = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const val = data[start];
    let sp = 0, n = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let touchesEdge = false;
    while (sp) {
      const i = stack[--sp];
      comp[n++] = i;
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true;
      if (x > 0 && !seen[i - 1] && data[i - 1] === val) { seen[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && data[i + 1] === val) { seen[i + 1] = 1; stack[sp++] = i + 1; }
      if (y > 0 && !seen[i - w] && data[i - w] === val) { seen[i - w] = 1; stack[sp++] = i - w; }
      if (y < h - 1 && !seen[i + w] && data[i + w] === val) { seen[i + w] = 1; stack[sp++] = i + w; }
    }
    // tło dotykające krawędzi zostaje zawsze (to nie jest dziura)
    if (n < minArea && !(val === 0 && touchesEdge)) for (let k = 0; k < n; k++) data[comp[k]] = 1 - val;
  }
  return mask;
}

/**
 * Kontury wzdłuż krawędzi pikseli, relief po lewej stronie (zewnętrzne CCW, dziury CW), w mm,
 * środek maski w (0, 0), oś y w górę. mirror = odbicie w poziomie (stempel odbija się lustrzanie).
 */
export function maskToPolygons(mask, { mirror = false } = {}) {
  const { w, h, data, px } = mask;
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? data[(h - 1 - y) * w + x] : 0); // y w górę
  const W = w + 1;
  const next = new Map(); // wierzchołek startowy → lista końców
  const add = (x0, y0, x1, y1) => {
    const k = y0 * W + x0;
    const v = y1 * W + x1;
    const l = next.get(k);
    if (l) l.push(v); else next.set(k, [v]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const polys = [];
  const ox = (w * px) / 2, oy = (h * px) / 2;
  for (const [startKey] of next) {
    while (next.get(startKey)?.length) {
      const loop = [];
      let k = startKey;
      do {
        loop.push(k);
        const l = next.get(k);
        const v = l.pop();
        if (!l.length) next.delete(k);
        k = v;
      } while (k !== startKey && next.has(k));
      // usuń punkty współliniowe
      const pts = [];
      for (let i = 0; i < loop.length; i++) {
        const a = loop[(i + loop.length - 1) % loop.length], b = loop[i], c = loop[(i + 1) % loop.length];
        const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0, cx = c % W, cy = (c / W) | 0;
        if ((bx - ax) * (cy - by) - (by - ay) * (cx - bx) !== 0) pts.push([bx * px - ox, by * px - oy]);
      }
      if (pts.length >= 3) {
        if (mirror) { for (const p of pts) p[0] = -p[0]; pts.reverse(); }
        polys.push(pts);
      }
    }
  }
  return polys;
}

/** Maska → CrossSection w mm (wymaga wasm manifold-3d). smooth: zaokrąglenie schodków w mm. */
export function maskToCrossSection(wasm, mask, { mirror = false, smooth = 0 } = {}) {
  const { CrossSection: CS } = wasm;
  const polys = maskToPolygons(mask, { mirror });
  if (!polys.length) return null;
  let cs = new CS(polys, 'Positive');
  if (smooth > 0) cs = cs.offset(smooth, 'Round', 2, 16).offset(-2 * smooth, 'Round', 2, 16).offset(smooth, 'Round', 2, 16);
  return cs.simplify(mask.px * 0.05);
}

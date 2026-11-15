// Binarny STL z siatki manifold-3d (getMesh()). Wspólne dla przeglądarki i Node.

/** @returns {ArrayBuffer} */
export function meshToStl(mesh, header = 'drukowniak') {
  const { vertProperties: vp, numProp: np, triVerts: tv } = mesh;
  const nTri = tv.length / 3;
  const buf = new ArrayBuffer(84 + nTri * 50);
  const dv = new DataView(buf);
  for (let i = 0; i < Math.min(80, header.length); i++) dv.setUint8(i, header.charCodeAt(i) & 0x7f);
  dv.setUint32(80, nTri, true);
  let o = 84;
  for (let t = 0; t < nTri; t++) {
    const a = tv[3 * t] * np, b = tv[3 * t + 1] * np, c = tv[3 * t + 2] * np;
    const ux = vp[b] - vp[a], uy = vp[b + 1] - vp[a + 1], uz = vp[b + 2] - vp[a + 2];
    const wx = vp[c] - vp[a], wy = vp[c + 1] - vp[a + 1], wz = vp[c + 2] - vp[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (const v of [nx, ny, nz]) { dv.setFloat32(o, v, true); o += 4; }
    for (const i of [a, b, c]) {
      dv.setFloat32(o, vp[i], true); dv.setFloat32(o + 4, vp[i + 1], true); dv.setFloat32(o + 8, vp[i + 2], true);
      o += 12;
    }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

/** Nazwa pliku z kluczowych parametrów, np. ivar-hak-otwory-44x22.stl */
export function stlName(prefix, p) {
  return `${prefix}-${p.element}-${p.mocowanie}-${p.slupekSzer}x${p.slupekGrub}.stl`.replace(/\.(?=\d)/g, '_');
}

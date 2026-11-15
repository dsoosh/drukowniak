// Miniatura PNG (przezroczyste tło) z siatki manifold-3d: rzut izometryczny, z-bufor, cieniowanie płaskie.
import zlib from 'zlib';

const VIEW = [[0.707, 0.707, 0], [-0.408, 0.408, 0.816], [0.577, -0.577, 0.577]];

export function meshToPng(mesh, size = 360, rgb = [194, 83, 29]) {
  const { vertProperties: vp, numProp: np, triVerts: tv } = mesh;
  const P = (i) => VIEW.map((r) => r[0] * vp[i * np] + r[1] * vp[i * np + 1] + r[2] * vp[i * np + 2]);
  const nV = vp.length / np;
  const pts = Array.from({ length: nV }, (_, i) => P(i));
  const mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
  for (const p of pts) for (let k = 0; k < 2; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
  const pad = 12, sc = (size - 2 * pad) / Math.max(mx[0] - mn[0], mx[1] - mn[1]);
  const ox = (size - (mx[0] - mn[0]) * sc) / 2, oy = (size - (mx[1] - mn[1]) * sc) / 2;
  const img = new Uint8Array(size * size * 4);
  const zb = new Float32Array(size * size).fill(-Infinity);
  for (let t = 0; t < tv.length; t += 3) {
    const p = [pts[tv[t]], pts[tv[t + 1]], pts[tv[t + 2]]];
    const q = p.map((v) => [ox + (v[0] - mn[0]) * sc, size - oy - (v[1] - mn[1]) * sc, v[2]]);
    const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], w = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const L = Math.hypot(...n) || 1;
    const sh = Math.min(1.15, Math.max(0.35, 0.55 + 0.45 * (n[1] / L) + 0.25 * (n[2] / L) - 0.1 * (n[0] / L)));
    const d = (q[1][1] - q[2][1]) * (q[0][0] - q[2][0]) + (q[2][0] - q[1][0]) * (q[0][1] - q[2][1]);
    if (Math.abs(d) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(q[0][0], q[1][0], q[2][0]))), x1 = Math.min(size - 1, Math.ceil(Math.max(q[0][0], q[1][0], q[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(q[0][1], q[1][1], q[2][1]))), y1 = Math.min(size - 1, Math.ceil(Math.max(q[0][1], q[1][1], q[2][1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = ((q[1][1] - q[2][1]) * (x + 0.5 - q[2][0]) + (q[2][0] - q[1][0]) * (y + 0.5 - q[2][1])) / d;
      const b = ((q[2][1] - q[0][1]) * (x + 0.5 - q[2][0]) + (q[0][0] - q[2][0]) * (y + 0.5 - q[2][1])) / d;
      const c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) continue;
      const z = a * q[0][2] + b * q[1][2] + c * q[2][2];
      const i = y * size + x;
      if (z <= zb[i]) continue;
      zb[i] = z;
      for (let k = 0; k < 3; k++) img[i * 4 + k] = Math.min(255, rgb[k] * sh);
      img[i * 4 + 3] = 255;
    }
  }
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) Buffer.from(img.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  return png(size, size, zlib.deflateSync(raw, { level: 9 }));
}

function png(w, h, idat) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Obraz albo tekst → maska binarna (przeglądarka, canvas). Geometria z maski: lib/mask.js.
import { removeSmallBlobs } from './mask.js';

const MAX_SRC = 1600; // najdłuższy bok obrazu źródłowego
export const MAX_MASK = 1400; // najdłuższy bok maski (ogranicza czas i pamięć)

/** Rozmiar po zmniejszeniu: najdłuższy bok ≤ MAX_SRC. */
function srcSize(w, h) {
  const s = Math.min(1, MAX_SRC / Math.max(w, h));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
}

/** Rysuje obraz na białym tle (przezroczystość → biel). */
function onWhite(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

/** Czy płótno jest całe białe — przeglądarka nie narysowała obrazu (np. zdjęcie 50 Mpx w Chrome na Androidzie). */
function isBlank(c) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < d.length; i += 4 * 5) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) return false;
  return true;
}

/**
 * Zdjęcie kartki: wyrównanie oświetlenia. Jasność papieru szacowana w kratkach (90. percentyl,
 * rozszerzony na sąsiednie kratki, żeby grube czarne pola nie robiły się puste), wygładzona
 * i interpolowana; piksel / papier → kartka równo biała, ciemny zostaje tylko rysunek.
 * Pomija czyste grafiki (> 30 % pikseli prawie białych). Zwraca nowe płótno albo null.
 */
function flattenLighting(c) {
  const { width: W, height: H } = c;
  const id = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H);
  const d = id.data, n = W * H, L = new Float32Array(n);
  let white = 0;
  for (let i = 0; i < n; i++) { L[i] = luminance(d, i * 4); if (L[i] > 0.97) white++; }
  if (white > 0.3 * n) return null;
  const B = Math.max(16, Math.round(Math.max(W, H) / 40));
  const gw = Math.ceil(W / B), gh = Math.ceil(H / B);
  const p90 = new Float32Array(gw * gh);
  const buf = new Float32Array(B * B);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let k = 0;
    for (let y = gy * B; y < Math.min(H, (gy + 1) * B); y++) for (let x = gx * B; x < Math.min(W, (gx + 1) * B); x++) buf[k++] = L[y * W + x];
    const a = buf.subarray(0, k).sort();
    p90[gy * gw + gx] = a[Math.floor(0.9 * (k - 1))];
  }
  const pass = (src, r, op) => {
    const out = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      let acc = op === 'max' ? 0 : 0, cnt = 0;
      for (let y = Math.max(0, gy - r); y <= Math.min(gh - 1, gy + r); y++) for (let x = Math.max(0, gx - r); x <= Math.min(gw - 1, gx + r); x++) {
        const v = src[y * gw + x];
        if (op === 'max') acc = Math.max(acc, v); else { acc += v; cnt++; }
      }
      out[gy * gw + gx] = op === 'max' ? acc : acc / cnt;
    }
    return out;
  };
  const bg = pass(pass(p90, 2, 'max'), 1, 'avg');
  for (let y = 0; y < H; y++) {
    const fy = Math.min(gh - 1, Math.max(0, (y + 0.5) / B - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(gw - 1, Math.max(0, (x + 0.5) / B - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
      const b = (bg[y0 * gw + x0] * (1 - tx) + bg[y0 * gw + x1] * tx) * (1 - ty) + (bg[y1 * gw + x0] * (1 - tx) + bg[y1 * gw + x1] * tx) * ty;
      const v = Math.round(255 * Math.min(1, L[y * W + x] / Math.max(0.05, b)));
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  out.getContext('2d', { willReadFrequently: true }).putImageData(id, 0, 0);
  return out;
}

/** Obraz na białym tle, najdłuższy bok ≤ MAX_SRC (z loadImageFile: już zmniejszony przy dekodowaniu). */
export function sourceFromImage(img) {
  return img.source ?? onWhite(img, ...srcSize(img.naturalWidth, img.naturalHeight));
}

/** Tekst (wiele linii, wyśrodkowany) czarny na białym. font: "Rodzina" albo "Rodzina:700". */
export async function sourceFromText(text, font) {
  const lines = text.replace(/\r/g, '').split('\n');
  if (!text.trim()) return null;
  const [family, weight = '400'] = font.split(':');
  const size = 220;
  const spec = `${weight} ${size}px "${family}"`;
  try { await document.fonts.load(spec, text); } catch { /* krój zastępczy */ }
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = spec;
  const widths = lines.map((l) => ctx.measureText(l || ' ').width);
  const lineH = size * 1.15, pad = size * 0.3;
  c.width = Math.ceil(Math.max(...widths) + 2 * pad);
  c.height = Math.ceil(lines.length * lineH + 2 * pad);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = spec;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, pad + (i + 0.5) * lineH));
  return c;
}

/**
 * Próg jasności (0–1) metodą Otsu: granica między jasnym tłem a ciemnym wzorem.
 * Zdjęcia z telefonu są naświetlone „na szarość”, więc stały próg 50 % łapie całą kartkę.
 * Zwraca { threshold, dark }: dark = udział pikseli ciemniejszych niż próg (diagnostyka).
 */
export function autoThreshold(src) {
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data;
  const hist = new Float64Array(256);
  for (let i = 0; i < d.length; i += 4) hist[Math.min(255, Math.floor(luminance(d, i) * 256))]++;
  const n = d.length / 4;
  let sumAll = 0;
  for (let k = 0; k < 256; k++) sumAll += k * hist[k];
  let wB = 0, sumB = 0, best = -1, bestK = 127;
  for (let k = 0; k < 256; k++) {
    wB += hist[k];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += k * hist[k];
    const between = wB * wF * (sumB / wB - (sumAll - sumB) / wF) ** 2;
    if (between > best) { best = between; bestK = k; }
  }
  let dark = 0;
  for (let k = 0; k <= bestK; k++) dark += hist[k];
  return { threshold: (bestK + 1) / 256, dark: n ? dark / n : 0 };
}

function luminance(d, i) {
  const a = d[i + 3] / 255;
  return ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255) * a + (1 - a);
}

/**
 * Maska w polu width × height mm: treść źródła (piksele ciemniejsze niż próg) przycięta do obrysu,
 * dopasowana do pola, przeskalowana (scale, 1 = dopasowana) i przesunięta (dx w prawo, dy w górę, mm).
 */
export function maskFromSource(src, { width, height, px, threshold = 0.5, scale = 1, dx = 0, dy = 0, minBlobMm2 = 0 }) {
  if (!src) return null;
  px = Math.max(px, Math.max(width, height) / MAX_MASK);
  const sctx = src.getContext('2d', { willReadFrequently: true });
  const sd = sctx.getImageData(0, 0, src.width, src.height).data;
  // obrys treści: wiersze i kolumny z co najmniej 3 ciemnymi pikselami (pojedyncze plamki szumu nie rozpychają obrysu)
  const rows = new Uint32Array(src.height), cols = new Uint32Array(src.width);
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (luminance(sd, (y * src.width + x) * 4) < threshold) { rows[y]++; cols[x]++; }
  }
  const MIN = 3;
  let x0 = cols.findIndex((v) => v >= MIN), y0 = rows.findIndex((v) => v >= MIN);
  let x1 = src.width - 1 - [...cols].reverse().findIndex((v) => v >= MIN), y1 = src.height - 1 - [...rows].reverse().findIndex((v) => v >= MIN);
  if (x0 < 0 || y0 < 0) {
    // bardzo mała treść (kilka pikseli): bez filtra
    x0 = cols.findIndex((v) => v > 0); y0 = rows.findIndex((v) => v > 0);
    if (x0 < 0) return null;
    x1 = src.width - 1 - [...cols].reverse().findIndex((v) => v > 0); y1 = src.height - 1 - [...rows].reverse().findIndex((v) => v > 0);
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const w = Math.max(1, Math.round(width / px)), h = Math.max(1, Math.round(height / px));
  const fit = Math.min(w / bw, h / bh) * scale;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, x0, y0, bw, bh, w / 2 - (bw * fit) / 2 + dx / px, h / 2 - (bh * fit) / 2 - dy / px, bw * fit, bh * fit);
  const md = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = luminance(md, i * 4) < threshold ? 1 : 0;
  const mask = { w, h, data, px };
  removeSmallBlobs(mask, Math.round(minBlobMm2 / (px * px)));
  return mask;
}

/**
 * Wczytanie obrazu z pliku / schowka / przeciągnięcia. Zwraca <img> (do miniatury) z polami:
 * source — płótno ≤ MAX_SRC na białym tle, blank — przeglądarka nie oddała pikseli.
 * Duże zdjęcia zmniejsza już dekoder (createImageBitmap): Chrome na Androidzie po cichu nie rysuje
 * obrazów większych niż limit tekstury karty graficznej (zdjęcia 50 Mpx i więcej), płótno zostaje białe.
 */
export async function loadImageFile(file) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Nie udało się wczytać obrazu.'));
    el.src = URL.createObjectURL(file);
  });
  const [w, h] = srcSize(img.naturalWidth, img.naturalHeight);
  let c = null;
  if ((w < img.naturalWidth || h < img.naturalHeight) && typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high', imageOrientation: 'from-image' });
      c = onWhite(bmp, w, h);
      bmp.close?.();
      if (isBlank(c)) c = null;
    } catch { c = null; }
  }
  if (!c) c = onWhite(img, w, h);
  img.blank = isBlank(c);
  const flat = img.blank ? null : flattenLighting(c);
  img.flattened = !!flat;
  img.source = flat ?? c;
  return img;
}

/**
 * Podpina pole „upuść / wybierz / wklej” do callbacku z obrazem.
 * extraInputs: dodatkowe <input type="file"> (np. aparat w telefonie: capture="environment").
 * onError(komunikat): plik nie jest obrazem albo przeglądarka nie umie go odczytać.
 */
export function bindImageInput(dropEl, onImage, extraInputs = [], onError = () => {}) {
  const input = dropEl.querySelector('input[type="file"]');
  const take = async (file) => {
    if (!file) return;
    if (!(file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name))) return onError(`To nie jest obraz: ${file.name}`);
    try { onImage(await loadImageFile(file), file.name); } catch (err) { onError(`${err.message} (${file.name || 'zdjęcie'}, ${file.type || 'nieznany typ'})`); }
  };
  dropEl.addEventListener('click', (e) => { if (e.target !== input) { e.preventDefault(); input.click(); } });
  for (const el of [input, ...extraInputs]) el.addEventListener('change', () => { take(el.files[0]); el.value = ''; });
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => { e.preventDefault(); dropEl.classList.remove('over'); take(e.dataTransfer.files[0]); });
  document.addEventListener('paste', (e) => {
    if (e.target.closest('textarea, input:not([type="file"])')) return;
    const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith('image/'));
    if (item) { e.preventDefault(); take(item.getAsFile()); }
  });
}

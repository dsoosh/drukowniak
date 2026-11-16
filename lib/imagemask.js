// Obraz albo tekst → maska binarna (przeglądarka, canvas). Geometria z maski: lib/mask.js.
import { removeSmallBlobs } from './mask.js';

const MAX_SRC = 1600; // najdłuższy bok obrazu źródłowego
export const MAX_MASK = 1400; // najdłuższy bok maski (ogranicza czas i pamięć)

/** Obraz na białym tle (przezroczystość → biel), najdłuższy bok ≤ MAX_SRC. */
export function sourceFromImage(img) {
  const s = Math.min(1, MAX_SRC / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * s));
  c.height = Math.max(1, Math.round(img.naturalHeight * s));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
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
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (luminance(sd, (y * src.width + x) * 4) < threshold) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
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

/** Wczytanie obrazu z pliku / schowka / przeciągnięcia. */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać obrazu.'));
    img.src = url;
  });
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

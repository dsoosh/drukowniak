// Geometria wałka do ceramiki: wzór 2D na rozwiniętej powierzchni (u = obwód, v = długość) jest
// powtarzalny w u z okresem obwód / n, więc na szwie nie ma przerwy. Relief wyciągnięty promieniowo
// i zawinięty na walec (warp). Druk na stojąco, oś wałka w z.
import { maskToCrossSection } from '../../lib/mask.js';

const TAU = Math.PI * 2;

/** Rozmiar kafla dopasowany do obwodu: całkowita liczba powtórzeń dookoła. */
export function tileGrid(p, circumference) {
  const n = Math.max(1, Math.round(circumference / p.kafel));
  const tw = circumference / n;
  return { n, tw, th: (tw * p.proporcja) / 100 };
}

/**
 * Wzór jako CrossSection w (u, v), u ∈ [−tw, C + tw], v ∈ [v0 − th, v1 + th] — przycięcie robi model.
 * tile (opcjonalnie): CrossSection jednego kafla obrazu, wyśrodkowany w (0, 0).
 */
export function patternSection(wasm, p, C, v0, v1, tile) {
  const { CrossSection: CS } = wasm;
  const { tw, th } = tileGrid(p, C);
  const lw = p.linia;
  const parts = [];
  const iMin = -1, iMax = Math.ceil(C / tw) + 1;
  const jMin = Math.floor(v0 / th) - 1, jMax = Math.ceil(v1 / th) + 1;
  const poly = (pts) => new CS([pts], 'NonZero');
  // wzory kafelkowe: tylko pełne rzędy, wyśrodkowane w pasie [v0, v1]
  const rows = Math.max(1, Math.floor((v1 - v0) / th + 1e-6));
  const vStart = v0 + (v1 - v0 - rows * th) / 2;

  switch (p.wzor) {
    case 'romby': {
      const a = tw / 2 - lw * 0.75, b = th / 2 - lw * 0.75;
      if (a > 0.2 && b > 0.2) for (let i = iMin; i <= iMax; i++) for (let j = 0; j < rows; j++) {
        const cu = (i + 0.5) * tw, cv = vStart + (j + 0.5) * th;
        parts.push(poly([[cu - a, cv], [cu, cv - b], [cu + a, cv], [cu, cv + b]]));
      }
      break;
    }
    case 'kropki': {
      const r = Math.max(0.3, Math.min(tw, th) / 2 - lw / 2);
      for (let i = iMin; i <= iMax; i++) for (let j = 0; j < rows; j++) {
        const cu = (i + 0.5 + (j % 2 ? 0.5 : 0)) * tw, cv = vStart + (j + 0.5) * th;
        parts.push(CS.circle(r, 32).translate([cu, cv]));
      }
      break;
    }
    case 'fale': {
      const A = th * 0.3, steps = 24;
      for (let j = jMin; j <= jMax; j++) {
        const cv = (j + 0.5) * th, top = [], bot = [];
        for (let k = iMin * steps; k <= iMax * steps; k++) {
          const u = (k / steps) * tw, phase = (TAU * u) / tw;
          const v = cv + A * Math.sin(phase);
          const slope = (A * TAU * Math.cos(phase)) / tw;
          const half = (lw / 2) * Math.sqrt(1 + slope * slope);
          top.push([u, v + half]); bot.push([u, v - half]);
        }
        parts.push(poly([...bot, ...top.reverse()]));
      }
      break;
    }
    case 'jodelka': {
      // kolumny o szerokości tw/2, w każdej skośne belki co th/2, kierunek naprzemienny
      const cw = tw / 2, step = th / 2;
      const s = Math.min(cw, step) * 0.95; // skos 45°
      for (let c = iMin * 2; c <= iMax * 2; c++) {
        const u0 = c * cw + lw * 0.3, u1 = (c + 1) * cw - lw * 0.3;
        const dir = c % 2 === 0 ? 1 : -1;
        for (let j = jMin * 2; j <= jMax * 2; j++) {
          const v = j * step, h = lw * Math.SQRT2;
          const d0 = dir > 0 ? 0 : s, d1 = dir > 0 ? s : 0;
          parts.push(poly([[u0, v + d0], [u1, v + d1], [u1, v + d1 + h], [u0, v + d0 + h]]));
        }
      }
      break;
    }
    case 'kratka': {
      for (let i = iMin; i <= iMax; i++) parts.push(CS.square([lw, (jMax - jMin + 2) * th]).translate([i * tw - lw / 2, (jMin - 1) * th]));
      for (let j = jMin; j <= jMax; j++) parts.push(CS.square([(iMax - iMin + 2) * tw, lw]).translate([(iMin - 1) * tw, j * th - lw / 2]));
      break;
    }
    case 'paski': {
      // pasy pod 45°: u − v = k·tw (okres tw w u → ciągłe na szwie)
      const h = lw * Math.SQRT2, va = (jMin - 1) * th, vb = (jMax + 1) * th;
      const kMin = Math.floor((-tw - vb) / tw) - 1, kMax = Math.ceil((C + tw - va) / tw) + 1;
      for (let k = kMin; k <= kMax; k++) {
        const u = k * tw;
        parts.push(poly([[u + va, va], [u + va + h, va], [u + vb + h, vb], [u + vb, vb]]));
      }
      break;
    }
    case 'luski': {
      // półkola nachodzące na siebie: każdy rząd przesunięty o pół kafla
      const R = tw / 2;
      for (let j = jMax; j >= jMin; j--) for (let i = iMin; i <= iMax; i++) {
        const cu = (i + 0.5 + (j % 2 ? 0.5 : 0)) * tw, cv = j * th;
        const outer = CS.circle(R, 48).intersect(CS.square([2 * R, R]).translate([-R, -R]));
        const inner = CS.circle(R - lw, 48).intersect(CS.square([2 * R, R]).translate([-R, -R]));
        const arc = outer.subtract(inner).scale([1, (th * 1.2) / R]);
        parts.push(arc.translate([cu, cv + th * 0.6]));
      }
      break;
    }
    case 'obraz': {
      if (tile) for (let i = iMin; i <= iMax; i++) for (let j = 0; j < rows; j++) parts.push(tile.translate([(i + 0.5) * tw, vStart + (j + 0.5) * th]));
      break;
    }
    default:
      break;
  }
  return parts.length ? CS.union(parts) : null;
}

/** Kafel obrazu z maski (w mm, wyśrodkowany). */
export function imageTile(wasm, p, mask) {
  if (!mask) return null;
  let cs = maskToCrossSection(wasm, mask, { mirror: p.lustro });
  if (cs && p.negatyw) {
    const { tw, th } = tileGrid(p, Math.PI * p.srednica);
    cs = wasm.CrossSection.square([tw, th], true).subtract(cs);
  }
  return cs;
}

/**
 * Pochylenie schodkami: n rozłącznych warstw od z0 do z1, warstwa przy z0 poszerzona o t, przy z1
 * nominalna; grow < 0 zwęża zamiast poszerzać (rowki węższe na dnie). Rozłączne warstwy
 * i jedna suma (batch) są wielokrotnie szybsze niż sumowanie nakładających się brył.
 */
export function steppedSlab(wasm, cs, z0, z1, t, clip, n = 2, grow = 1) {
  const { Manifold } = wasm;
  const layers = [];
  for (let k = 0; k < n; k++) {
    const frac = n === 1 ? 0 : (n - 1 - k) / (n - 1); // warstwa przy z0 (u podstawy / na dnie rowka) ma pełne przesunięcie
    const off = t * frac * grow;
    let s = Math.abs(off) > 0.01 ? cs.offset(off, 'Round', 2, 12) : cs;
    s = s.intersect(clip).simplify(0.01);
    if (s.isEmpty()) continue;
    const za = z0 + ((z1 - z0) * k) / n, zb = z0 + ((z1 - z0) * (k + 1)) / n;
    layers.push(s.extrude(zb - za).translate([0, 0, za]));
  }
  return layers.length ? Manifold.union(layers) : null;
}

/**
 * Zwraca: part (wałek, oś w z, z ∈ [0, L]), info, warnings.
 * mask — tylko dla wzoru „obraz” (kafel tw × th).
 */
export function buildRoller(wasm, p, mask) {
  const { CrossSection: CS, Manifold } = wasm;
  const warnings = [];
  const L = p.dlugosc, h = p.relief;
  const raised = p.tryb === 'wypukly';
  const Ro = p.srednica / 2; // średnica zewnętrzna (po reliefie)
  const Rc = Ro - h; // rdzeń / dno rowków
  if (Rc < 4) warnings.push('Relief za wysoki jak na tę średnicę.');
  const ring = raised && p.pierscienie ? p.pierscienSzer : 0;
  const v0 = ring + p.margines, v1 = L - ring - p.margines;
  if (v1 - v0 < 3) warnings.push('Za krótki wałek na wzór przy tych pierścieniach i marginesach.');
  const Rref = raised ? Rc : Ro; // promień, na którym wzór ma nominalną skalę
  const C = TAU * Rref;
  const segs = Math.max(96, Math.ceil(C / 0.7));

  const tile = p.wzor === 'obraz' ? imageTile(wasm, p, mask) : null;
  if (p.wzor === 'obraz' && !tile) warnings.push('Wczytaj obraz, z którego powstanie kafel wzoru.');
  const pattern = patternSection(wasm, p, C, v0, v1, tile);
  const band = CS.square([C, Math.max(0.1, v1 - v0)]).translate([0, v0]);

  let part;
  if (raised) {
    part = Manifold.cylinder(L, Rc + 0.01, Rc + 0.01, segs);
    if (pattern && v1 > v0) {
      const t = h * Math.tan((p.pochylenie * Math.PI) / 180);
      const slab = steppedSlab(wasm, pattern, -0.4, h, t, band, 2, 1);
      if (slab) part = Manifold.union([part, wrapUV(slab, Rref)]);
    }
    if (ring) {
      const Rr = Ro - p.glebokosc;
      if (p.glebokosc >= h) warnings.push('Głębokość odcisku nie może przekraczać wysokości reliefu.');
      const c = Math.min(0.8, Rr - Rc);
      const ringSolid = (z, flip) => {
        const prof = new CS([flip
          ? [[0, 0], [Rr, 0], [Rr, ring - c], [Rr - c, ring], [0, ring]]
          : [[0, 0], [Rr - c, 0], [Rr, c], [Rr, ring], [0, ring]]]);
        return prof.revolve(segs).translate([0, 0, z]);
      };
      part = part.add(ringSolid(0, true)).add(ringSolid(L - ring, false));
    }
  } else {
    part = Manifold.cylinder(L, Ro, Ro, segs);
    if (pattern && v1 > v0) {
      // rowki zwężają się w głąb; warstwa przy powierzchni ma szerokość nominalną i wystaje ponad nią
      const t = h * Math.tan((p.pochylenie * Math.PI) / 180);
      const grooves = steppedSlab(wasm, pattern, -h, 0, t, band, 2, -1);
      if (grooves) {
        const lid = pattern.intersect(band).extrude(0.6);
        part = part.subtract(wrapUV(Manifold.union([grooves, lid]), Rref));
      }
    }
  }

  if (p.os > 0) {
    if (p.os > 2 * Rc - 4) warnings.push('Otwór na oś za duży — ścianka wałka będzie za cienka.');
    part = part.subtract(Manifold.cylinder(L + 2, p.os / 2, p.os / 2, 64).translate([0, 0, -1]));
  }
  if (L > p.stol) warnings.push(`Wałek (${L} mm) wyższy niż obszar roboczy drukarki (${p.stol} mm).`);

  const { n, tw, th } = tileGrid(p, C);
  return {
    part,
    warnings,
    info: { n, tw, th, Ro, Rc, volume: part.volume(), size: [2 * Ro, 2 * Ro, L] },
  };
}

/** Zawinięcie: (u, v, w) → walec o promieniu R (w = odległość od powierzchni R, na zewnątrz). */
function wrapUV(m, R) {
  return m.refineToLength(Math.min(4, Math.max(0.8, Math.sqrt(8 * R * 0.02)))).warp((v) => {
    const a = v[0] / R, r = R + v[2], z = v[1];
    v[0] = r * Math.cos(a);
    v[1] = r * Math.sin(a);
    v[2] = z;
  });
}

// Geometria stempla: podstawa w kształcie (koło/kwadrat/prostokąt), relief z maski, ramka, gniazdo
// i rączka-grzybek na wcisk. Czysty moduł: wasm manifold-3d + parametry + maska (lib/mask.js).
//
// Układ: stempel leży licem do góry (z = 0 to spód podstawy), tak też się drukuje — relief wychodzi
// gładki od góry. Rączka drukuje się odwrócona (płaski czubek na stole), wszystkie nawisy ≤ 45°.
import { maskToCrossSection } from '../../lib/mask.js';

const SEG = 96;
const PEG = 8, PEG_H = 3, PEG_GAP = 0.2;

export function shapeSection(wasm, p) {
  const { CrossSection: CS } = wasm;
  const W = p.szer, H = p.ksztalt === 'prostokat' ? p.wys : p.szer;
  if (p.ksztalt === 'okragly') return CS.circle(W / 2, SEG * 2);
  const r = Math.min(2, W / 4, H / 4);
  return CS.square([W - 2 * r, H - 2 * r], true).offset(r, 'Round', 2, SEG);
}

/** Bryła z pochylonymi bokami: n rozłącznych warstw, dolna poszerzona o h·tan(kąt), górna nominalna. */
export function taperedExtrude(wasm, cs, h, angleDeg, clip, n = 3) {
  const { Manifold } = wasm;
  const t = h * Math.tan((angleDeg * Math.PI) / 180);
  if (t < 0.02) return cs.extrude(h);
  const layers = [];
  for (let k = 0; k < n; k++) {
    const off = (t * (n - 1 - k)) / (n - 1);
    let s = off > 0.01 ? cs.offset(off, 'Round', 2, 16) : cs;
    if (clip) s = s.intersect(clip);
    layers.push(s.simplify(0.01).extrude(h / n).translate([0, 0, (h * k) / n]));
  }
  return Manifold.union(layers);
}

/** Rączka w pozycji użytkowej: talerzyk z = 0..3 na stemplu, kołek kwadratowy w dół, grzybek u góry. */
export function buildHandle(wasm, p) {
  const { CrossSection: CS, Manifold } = wasm;
  const W = p.szer, H = p.ksztalt === 'prostokat' ? p.wys : p.szer;
  const minDim = Math.min(W, H);
  const Rd = Math.max(PEG * 0.75 + 1.5, Math.min(0.42 * minDim, 22));
  const rs = Math.min(6.5, Rd - 1);
  const Rk = Math.max(rs + 3, Math.min(14, Rd + 2));
  const Ht = p.raczkaWys;
  const z1 = 3, z2 = z1 + (Rd - rs), z4 = Ht - 3, z3 = z4 - (Rk - rs);
  if (z3 < z2 + 2) return { solid: null, Rd };
  const prof = new CS([[[0, 0], [Rd, 0], [Rd, z1], [rs, z2], [rs, z3], [Rk, z4], [Rk, Ht - 1], [Rk - 1, Ht], [0, Ht]]]);
  let solid = prof.revolve(SEG);
  const c = 0.6;
  const peg = Manifold.union([
    CS.square([PEG, PEG], true).extrude(PEG_H - c),
    CS.square([PEG, PEG], true).extrude(c, 0, 0, (PEG - 2 * c) / PEG).translate([0, 0, PEG_H - c]),
  ]).mirror([0, 0, 1]);
  solid = solid.add(peg.translate([0, 0, 0.01]));
  return { solid, Rd };
}

/**
 * mask: { w, h, data, px } — pole na wzór (contentSize) wyśrodkowane na stemplu.
 * Zwraca: part (stempel licem do góry), handle (pozycja użytkowa nad stemplem), print (układ do druku),
 * info, warnings.
 */
export function buildStamp(wasm, p, mask) {
  const { CrossSection: CS, Manifold } = wasm;
  const warnings = [];
  const shape = shapeSection(wasm, p);
  const inner = shape.offset(-p.margines * 0.5, 'Round', 2, SEG);
  const base = shape.extrude(p.podstawa);
  let reliefCs = mask ? maskToCrossSection(wasm, mask, { mirror: p.lustro }) : null;
  if (reliefCs && p.negatyw) reliefCs = shape.offset(-p.margines, 'Round', 2, SEG).subtract(reliefCs);
  if (reliefCs) reliefCs = reliefCs.intersect(inner);
  if (reliefCs && p.cienkie > 0) reliefCs = reliefCs.offset(-p.cienkie / 2, 'Round', 2, 16).offset(p.cienkie / 2, 'Round', 2, 16);
  if (p.ramka) {
    const ring = shape.subtract(shape.offset(-p.ramkaSzer, 'Round', 2, SEG));
    reliefCs = reliefCs ? reliefCs.add(ring) : ring;
  }
  let part = base;
  let thin = 0;
  if (reliefCs && !reliefCs.isEmpty()) {
    const relief = taperedExtrude(wasm, reliefCs, p.relief, p.pochylenie, shape).translate([0, 0, p.podstawa - 0.01]);
    part = part.add(relief);
    // udział linii cieńszych niż 0,5 mm (nie wydrukują się dyszą 0,4)
    const opened = reliefCs.offset(-0.25, 'Round', 2, 16).offset(0.25, 'Round', 2, 16);
    thin = 1 - opened.area() / reliefCs.area();
    if (thin > 0.03) warnings.push(`Część wzoru (${Math.round(thin * 100)} %) to linie cieńsze niż 0,5 mm — mogą się nie wydrukować. Powiększ wzór albo ustaw „Usuń linie cieńsze niż”.`);
  } else {
    warnings.push('Brak reliefu — wpisz tekst, wczytaj obraz albo zmień próg.');
  }

  let handle = null;
  if (p.raczka !== 'brak') {
    const h = buildHandle(wasm, p);
    if (!h.solid) warnings.push('Rączka za niska na ten rozmiar — zwiększ jej wysokość.');
    else {
      const depth = Math.min(PEG_H + 0.3, p.podstawa - 1.5);
      if (depth < PEG_H) warnings.push(`Podstawa za cienka na gniazdo rączki (min. ${PEG_H + 1.5} mm).`);
      const sock = PEG + 2 * PEG_GAP;
      part = part.subtract(Manifold.cube([sock, sock, depth + 0.01], true).translate([0, 0, (depth + 0.01) / 2 - 0.01]));
      handle = h.solid.mirror([0, 0, 1]).translate([0, 0, -0.01]); // pod spodem stempla, do podglądu odwrócony
    }
  }

  // druk: stempel licem do góry, rączka odwrócona (czubek na stole) obok
  const pieces = [part];
  const pb = part.boundingBox();
  let handlePrint = null;
  if (handle) {
    // `handle` jest już odwrócona (czubek na dole, kołek w górę) — to dokładnie pozycja do druku
    const hb = handle.boundingBox();
    handlePrint = handle.translate([pb.max[0] + 6 - hb.min[0], -(hb.min[1] + hb.max[1]) / 2, -hb.min[2]]);
    pieces.push(handlePrint);
  }
  const print = Manifold.compose(pieces);
  const lb = print.boundingBox();
  const size = [0, 1, 2].map((i) => lb.max[i] - lb.min[i]);
  if (size[0] > p.stol || size[1] > p.stol) warnings.push(`Całość (${size[0].toFixed(0)} × ${size[1].toFixed(0)} mm) nie mieści się na stole ${p.stol} mm.`);

  return {
    part,
    handle,
    print,
    reliefCs,
    warnings,
    info: {
      size: [pb.max[0] - pb.min[0], pb.max[1] - pb.min[1], pb.max[2] - pb.min[2]],
      printSize: size,
      reliefArea: reliefCs ? reliefCs.area() : 0,
      thin,
      volume: part.volume() + (handle ? handle.volume() : 0),
    },
  };
}

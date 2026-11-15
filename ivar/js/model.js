// Geometria mocowań do słupków IKEA IVAR. Czysty moduł: dostaje zainicjalizowany moduł manifold-3d
// (po setup()) i znormalizowane parametry, zwraca bryły. Działa tak samo w przeglądarce i w Node.
//
// Układ "na słupku" (mm): słupek x ∈ [0, B], y ∈ [0, A], z w górę. Ściana z otworami leży w x = 0,
// otwory biegną wzdłuż +x w y = otworY. Część użytkowa przy mocowaniu "w otwory" wystaje w −x,
// przy opasce — w +x za tylną ścianką.
//
// Druk: wszystko leży na boku (profil haka/obejmy płasko na stole), więc warstwy idą wzdłuż ramienia.
// Otwory poziome mają kształt kropli z ostrzem do góry — drukują się bez podpór.

const SEG = 64;

/** Macierz 4×4 (kolumnami) z macierzy obrotu podanej wierszami i przesunięcia. */
function m4(r, t = [0, 0, 0]) {
  return [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, t[0], t[1], t[2], 1];
}
// (a, b, w) → (x = w, y = a, z = b): bryła wyciągnięta wzdłuż z staje się bryłą wzdłuż x.
const ALONG_X = m4([[0, 0, 1], [1, 0, 0], [0, 1, 0]]);
// (u, v, w) → (x = u, y = −w, z = v): profil w płaszczyźnie XZ, wyciągnięty w −y.
const PROFILE_XZ = m4([[1, 0, 0], [0, 0, -1], [0, 1, 0]]);
// Obroty do pozycji druku: ściana o największym (DOWN_YMAX) albo najmniejszym y ląduje na stole.
const DOWN_YMAX = m4([[1, 0, 0], [0, 0, 1], [0, -1, 0]]); // z_druk = −y
const DOWN_YMIN = m4([[1, 0, 0], [0, 0, -1], [0, 1, 0]]); // z_druk = +y

function roundedRect(CS, w, h, r) {
  const rr = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
  return CS.square([w - 2 * rr, h - 2 * rr]).translate([rr, rr]).offset(rr, 'Round', 2, SEG);
}

/** Otwór wzdłuż +x od x = 0 do len, oś w y = z = 0; ostrze kropli w stronę y·up (góra przy druku). */
function teardropX(wasm, r, len, up) {
  const { CrossSection: CS } = wasm;
  const tip = CS.square([0.02, 0.02], true).translate([0, r * Math.SQRT2 - 0.01]);
  const cs = CS.hull([CS.circle(r, SEG), tip]);
  // (s, t, w) → (x = w, y = up·t, z = −up·s), wyznacznik +1
  return cs.extrude(len).transform(m4([[0, 0, 1], [0, up, 0], [-up, 0, 0]]));
}

/** Zaokrąglenie wklęsłego narożnika między ścianą montażową (u = 0) a górą ramienia (v = top). */
function rootFillet(CS, top, r) {
  if (r <= 0) return null;
  return CS.square([r, r]).translate([0, top]).subtract(CS.circle(r, SEG).translate([r, top + r]));
}

function closeAndRound(cs, fillet, round) {
  let out = cs;
  if (fillet > 0) out = out.offset(fillet, 'Round', 2, SEG).offset(-fillet, 'Round', 2, SEG);
  if (round > 0) out = out.offset(-round, 'Round', 2, SEG).offset(round, 'Round', 2, SEG);
  return out;
}

/**
 * Część użytkowa we własnym układzie: ściana montażowa w x = 0, część w +x, dół w z = 0,
 * szerokość y ∈ [−width, 0]. Zachodzi 1 mm w −x (w ściankę, do której się ją dokleja).
 * holeUp — kierunek (±1 w y) ostrza otworów kroplowych w tym układzie.
 */
function usefulPart(wasm, p, width, holeUp) {
  const { CrossSection: CS } = wasm;
  const solid = (cs) => cs.extrude(width).transform(PROFILE_XZ);

  if (p.element === 'hak') {
    const t = p.hakGrub, L = p.hakWysieg, h = p.hakWys;
    let cs = CS.square([L + t + 1, t]).translate([-1, 0]);
    if (h > 0) {
      const tipTop = t + h - t / 2;
      cs = cs.add(CS.square([t, tipTop]).translate([L, 0])).add(CS.circle(t / 2, SEG).translate([L + t / 2, tipTop]));
    }
    cs = closeAndRound(cs, Math.min(t, L / 3), Math.min(1.5, t / 3));
    const f = rootFillet(CS, t, Math.min(t * 0.6, L / 3));
    return { solid: solid(f ? cs.add(f) : cs), rootTop: t + Math.min(t * 0.6, L / 3) };
  }

  if (p.element === 'obejma') {
    const R = p.obejmaD / 2, w = p.obejmaScianka;
    const uc = p.obejmaOdstep + w + R, vc = w + R;
    const inner = CS.circle(R, SEG * 2).translate([uc, vc]);
    let ring = CS.circle(R + w, SEG * 2).translate([uc, vc]);
    const half = p.obejmaOtwarcie >= 100 ? 0 : Math.sqrt(R * R - (R * p.obejmaOtwarcie / 100) ** 2);
    const cut = CS.square([2 * (R + w) + 2, R + w + 2]).translate([uc - R - w - 1, vc + half]);
    let cs = ring.add(CS.square([uc + 1, w]).translate([-1, 0]));
    cs = closeAndRound(cs, Math.min(w * 1.5, 4), 0).subtract(inner).subtract(cut);
    cs = closeAndRound(cs, 0, Math.min(1, w / 3));
    const fr = Math.min(w, 3);
    const f = rootFillet(CS, w, fr);
    return { solid: solid(f ? cs.add(f) : cs), rootTop: w + fr };
  }

  // płytka do przykręcenia: otwory pilotowe od zewnątrz, nieprzelotowe (nie wchodzą w opaskę)
  const t = p.plGrub, H = p.plWys;
  let plate = solid(roundedRect(CS, t + 1, H, 1).translate([-1, 0]));
  const n = p.plOtwory;
  const r = p.plOtworD / 2;
  for (let k = 0; k < n; k++) {
    const z = (H * (k + 0.5)) / n;
    plate = plate.subtract(teardropX(wasm, r, t + 1, holeUp).translate([0.6, -width / 2, z]));
  }
  return { solid: plate, rootTop: H };
}

/** Kołek leżący wzdłuż +x: łeb x ∈ [−head, 0], trzon x ∈ [0, shaft]; oś w y = z = 0, ścięty góra/dół. */
function pegSolid(wasm, p, shaft) {
  const { CrossSection: CS, Manifold } = wasm;
  const rs = p.kolekD / 2, zc = rs - 0.35, R = rs + 2.2, head = 3, tip = Math.min(0.8, shaft / 4);
  const flat = (r) => CS.circle(r, SEG).intersect(CS.square([2 * r + 2, 2 * zc], true));
  const body = Manifold.union([
    flat(R).extrude(head),
    flat(rs).extrude(shaft - tip).translate([0, 0, head]),
    flat(rs).extrude(tip, 0, 0, 0.8).translate([0, 0, head + shaft - tip]),
  ]);
  return { solid: body.transform(ALONG_X).translate([-head, 0, 0]), halfHeight: zc, headR: R, head };
}

/**
 * Kołek wbudowany wzdłuż +x od x = 0 do len, oś w y = z = 0. Przekrój: górna połowa koła, dolna
 * w kształcie V pod 45° (dół przy druku = +y), więc wystający poziomo kołek drukuje się bez podpór.
 */
function vPin(wasm, r, len) {
  const { CrossSection: CS, Manifold } = wasm;
  const top = CS.circle(r, SEG).intersect(CS.square([2 * r + 2, r + 1]).translate([-r - 1, -r - 1]));
  const vee = CS.square([r * Math.SQRT2, r * Math.SQRT2], true).rotate(45).intersect(CS.square([2 * r + 2, r + 1]).translate([-r - 1, 0]));
  const cs = top.add(vee);
  const tip = Math.min(0.8, len / 4);
  const body = Manifold.union([cs.extrude(len - tip), cs.extrude(tip, 0, 0, 0.75).translate([0, 0, len - tip])]);
  return body.transform(m4([[0, 0, 1], [0, 1, 0], [-1, 0, 0]])); // (s, t, w) → (x = w, y = t, z = −s)
}

/** Odkształcenie języczka zatrzasku przy wysunięciu kołka: belka wspornikowa, ε = 3·t·δ / (2·L²). */
export function latchStrain(t, delta, lever) {
  return (3 * t * delta) / (2 * lever * lever);
}

function pegZs(n, step, z0) {
  return Array.from({ length: n }, (_, i) => z0 + i * step);
}

/**
 * Buduje mocowanie. Zwraca:
 *  part      — część w układzie "na słupku",
 *  pegs      — kołki osadzone w otworach (układ "na słupku"),
 *  print     — część + kołki ułożone do druku (z ≥ 0), jedna bryła złożona,
 *  pegPrint  — same kołki do druku,
 *  info      — wymiary i liczby do podsumowania, warnings — ostrzeżenia po polsku.
 */
export function buildIvar(wasm, p) {
  const { CrossSection: CS, Manifold } = wasm;
  const A = p.slupekSzer, B = p.slupekGrub;
  const warnings = [];
  const step = p.otworRozstaw * p.kolkiCo;
  const separate = p.kolki === 'osobne';
  let latch = null;
  const holeR = (p.kolekD + 0.4) / 2;
  const peg0 = pegSolid(wasm, p, 1);

  if (p.otworY < p.kolekD || p.otworY > A - p.kolekD) warnings.push('Oś otworów wypada poza ścianę słupka — sprawdź wymiary A i C.');
  if (p.kolekD > 6.2) warnings.push('Kołek grubszy niż typowy otwór IVAR (⌀6). Zmierz otwór.');

  let part, pegs = [], printDown, zs, shaft, frontX;
  if (p.mocowanie === 'otwory') {
    let element = p.element;
    if (element === 'plytka') {
      warnings.push('Płytka do przykręcenia jest tylko dla opaski — pokazuję hak.');
      element = 'hak';
    }
    const q = { ...p, element };
    const W = p.plytkaSzer, tp = p.plytkaGrub;
    const We = p.elemSzer > 0 ? p.elemSzer : W;
    const el = usefulPart(wasm, q, We, 1);
    const z0 = separate ? Math.max(p.margines, el.rootTop + peg0.headR + 0.5) : Math.max(p.margines, el.rootTop + p.kolekD / 2 + 1);
    zs = pegZs(p.kolkiIle, step, z0);
    const Hp = zs[zs.length - 1] + p.margines;
    const plate = roundedRect(CS, W, Hp, 2).extrude(tp).transform(ALONG_X).translate([-tp, p.otworY - W / 2, 0]);
    const elem = el.solid.rotate([0, 0, 180]).translate([-tp, p.otworY - We / 2, 0]);
    part = plate.add(elem);
    if (W < 2 * peg0.headR + 2 && separate) warnings.push('Płytka węższa niż łeb kołka.');
    if (W > A + 0.01) warnings.push('Płytka szersza niż ściana słupka.');
    if (separate) {
      for (const z of zs) part = part.subtract(teardropX(wasm, holeR, tp + 2, -1).translate([-tp - 1, p.otworY, z]));
    } else {
      const pin = vPin(wasm, p.kolekD / 2, p.kolekGleb + 0.5);
      for (const z of zs) part = part.add(pin.translate([-0.5, p.otworY, z]));
    }
    printDown = DOWN_YMAX;
    shaft = tp + p.kolekGleb;
    frontX = -tp;
  } else {
    const g = p.luz, tw = p.opaskaScianka, H = p.opaskaWys;
    const mirror = p.strona === 'prawa';
    const hy = mirror ? A - p.otworY : p.otworY;
    const x0 = -g - tw, x1 = B + g + tw, Ymax = A + g + tw;
    const outer = roundedRect(CS, x1 - x0, Ymax, 1.5).translate([x0, 0]);
    const inner = CS.square([B + 2 * g, A + g + 1]).translate([-g, -1]);
    part = outer.subtract(inner).extrude(H);
    zs = pegZs(p.kolkiIle, step, H / 2 - ((p.kolkiIle - 1) * step) / 2);
    if (separate) {
      if (zs[0] - peg0.headR < 0.5 || zs[zs.length - 1] + peg0.headR > H - 0.5) {
        warnings.push(`Opaska za niska na ${p.kolkiIle} kołki co ${step} mm — zwiększ wysokość albo zmniejsz liczbę kołków.`);
      }
      for (const z of zs) part = part.subtract(teardropX(wasm, holeR, tw + 2, -1).translate([x0 - 1, hy, z]));
    } else {
      // Zatrzask: każdy kołek na języczku wyciętym w przedniej ściance, zakorzenionym w ściance bocznej.
      // Nacięcia biegną od otwartej krawędzi do ścianki bocznej; języczek wystaje za krawędź jako uchwyt.
      // Przy druku (ścianka boczna na stole) języczek i nacięcia są pionowe — bez nawisów.
      const tt = Math.min(p.zatrzaskGrub, tw), slit = 0.7, wt = Math.max(p.kolekD + 3, 9), tab = 8;
      const yRoot = A + g;
      if (zs[0] - wt / 2 - slit < 1 || zs[zs.length - 1] + wt / 2 + slit > H - 1) {
        warnings.push(`Opaska za niska na ${p.kolkiIle} zatrzaski co ${step} mm — zwiększ wysokość albo zmniejsz liczbę kołków.`);
      }
      const pin = vPin(wasm, p.kolekD / 2, g + p.zatrzaskGleb + 0.5);
      for (const z of zs) {
        for (const zz of [z - wt / 2 - slit, z + wt / 2]) {
          part = part.subtract(Manifold.cube([tw + 2, yRoot + 1, slit]).translate([x0 - 1, -1, zz]));
        }
        if (tt < tw) part = part.subtract(Manifold.cube([tw - tt + 1, yRoot + 1, wt]).translate([x0 - 1, -1, z - wt / 2]));
        part = part.add(Manifold.cube([tt, tab + 0.5, wt]).translate([-g - tt, -tab, z - wt / 2]));
        part = part.add(pin.translate([-g - 0.5, hy, z]));
      }
      const lever = yRoot - hy, delta = g + p.zatrzaskGleb;
      latch = { strain: latchStrain(tt, delta, lever), lever, delta };
      if (latch.strain > 0.03) {
        warnings.push(`Języczek zatrzasku wygina się o ${(latch.strain * 100).toFixed(1)} % — może pęknąć. Zmniejsz wejście w otwór albo grubość języczka.`);
      }
    }
    const We = Math.min(p.elemSzer > 0 ? p.elemSzer : Ymax, Ymax);
    const el = usefulPart(wasm, p, We, -1);
    part = part.add(el.solid.translate([x1, Ymax, 0]));
    if (mirror) part = part.mirror([0, 1, 0]).translate([0, A, 0]);
    printDown = mirror ? DOWN_YMIN : DOWN_YMAX;
    shaft = tw + g + p.kolekGleb;
    frontX = x0;
  }

  // kołki: w otworach (podgląd) i ułożone do druku
  const pegPrintList = [];
  if (separate) {
    const pg = pegSolid(wasm, p, shaft);
    for (const z of zs) pegs.push(pg.solid.translate([frontX, p.otworY, z]));
    for (let i = 0; i < zs.length; i++) pegPrintList.push(pg.solid.translate([pg.head, 0, pg.halfHeight]));
  }

  // pozycja do druku: obrót, z ≥ 0, środek w x/y; kołki obok
  let print = part.transform(printDown);
  const bb = print.boundingBox();
  print = print.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]);
  const pbb = print.boundingBox();
  const pieces = [print];
  let pegPrint = null;
  if (pegPrintList.length) {
    const pegB = pegPrintList[0].boundingBox();
    const pitch = pegB.max[1] - pegB.min[1] + 4;
    const row = pegPrintList.map((pg, i) => pg.translate([-pegB.min[0], -pegB.min[1] + i * pitch, 0]));
    pegPrint = Manifold.compose(row);
    pieces.push(...row.map((m) => m.translate([pbb.min[0], pbb.max[1] + 6, 0])));
  }
  const layout = Manifold.compose(pieces);
  const lb = layout.boundingBox();
  const size = [0, 1, 2].map((i) => lb.max[i] - lb.min[i]);
  if (size[0] > p.stol || size[1] > p.stol) warnings.push(`Całość (${size[0].toFixed(0)} × ${size[1].toFixed(0)} mm) nie mieści się na stole ${p.stol} mm.`);

  const partBox = print.boundingBox();
  const info = {
    partSize: [0, 1, 2].map((i) => partBox.max[i] - partBox.min[i]),
    printSize: size,
    volume: part.volume() + pegs.reduce((s, m) => s + m.volume(), 0),
    pegCount: pegs.length,
    pegShaft: separate ? shaft : 0,
    pegZs: zs,
    latch,
  };
  return { part, pegs, print: layout, pegPrint, info, warnings };
}

/** Słupek do podglądu: prostopadłościan z otworami co rozstaw, jeden otwór w z = anchor. */
export function buildPost(wasm, p, zMin, zMax, anchor) {
  const { Manifold } = wasm;
  const step = p.otworRozstaw;
  const lo = zMin - 40, hi = zMax + 40;
  let post = Manifold.cube([p.slupekGrub, p.slupekSzer, hi - lo]).translate([0, 0, lo]);
  const hole = Manifold.cylinder(p.slupekGrub + 2, 3, 3, 24).transform(ALONG_X).translate([-1, p.otworY, 0]);
  const first = anchor - Math.floor((anchor - lo - 4) / step) * step;
  for (let z = first; z < hi - 4; z += step) post = post.subtract(hole.translate([0, 0, z]));
  return post;
}

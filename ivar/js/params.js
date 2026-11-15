// Parametry mocowań IVAR: definicje pól formularza, wartości domyślne i gotowe warianty.
// Wymiary w milimetrach. Strony "lewa/prawa" i "od prawej krawędzi" liczone patrząc na ścianę z otworami.

const isOtwory = (p) => p.mocowanie === 'otwory';
const isOpaska = (p) => p.mocowanie === 'opaska';
const isEl = (name) => (p) => p.element === name;
/** Opaska w jednej części: kołki na elastycznych języczkach wyciętych w przedniej ściance. */
export const isZatrzask = (p) => p.mocowanie === 'opaska' && p.kolki === 'jedna';

export const GROUPS = ['Mocowanie', 'Słupek IVAR', 'Kołki', 'Płytka na otwory', 'Opaska', 'Hak', 'Obejma', 'Płytka do przykręcenia', 'Druk'];

export const PARAMS = [
  { key: 'mocowanie', group: 'Mocowanie', label: 'Sposób mocowania', type: 'select', def: 'otwory',
    options: [['otwory', 'W otwory — część od strony otworów'], ['opaska', 'Opaska — część po przeciwnej stronie słupka']] },
  { key: 'element', group: 'Mocowanie', label: 'Część użytkowa', type: 'select', def: 'hak',
    options: [['hak', 'Hak'], ['obejma', 'Obejma / kołyska na trzonek'], ['plytka', 'Płytka do przykręcenia (tylko opaska)']] },
  { key: 'elemSzer', group: 'Mocowanie', label: 'Szerokość części użytkowej (0 = cała)', type: 'num', def: 0, min: 0, max: 120, step: 1 },

  { key: 'slupekSzer', group: 'Słupek IVAR', label: 'Szerokość ściany z otworami', type: 'num', def: 44, min: 20, max: 90, step: 0.5, measure: 'A' },
  { key: 'slupekGrub', group: 'Słupek IVAR', label: 'Grubość słupka (wzdłuż otworu)', type: 'num', def: 22, min: 12, max: 60, step: 0.5, measure: 'B' },
  { key: 'otworY', group: 'Słupek IVAR', label: 'Oś otworów od prawej krawędzi', type: 'num', def: 22, min: 3, max: 87, step: 0.5, measure: 'C' },
  { key: 'otworRozstaw', group: 'Słupek IVAR', label: 'Rozstaw otworów w pionie', type: 'num', def: 32, min: 10, max: 80, step: 0.5, measure: 'D' },

  { key: 'kolki', group: 'Kołki', label: 'Wykonanie', type: 'select', def: 'jedna',
    options: [['jedna', 'Jedna część, bez składania'], ['osobne', 'Osobne kołki do wbicia']] },
  { key: 'kolkiIle', group: 'Kołki', label: 'Liczba kołków', type: 'num', def: 2, min: 1, max: 4, step: 1 },
  { key: 'kolkiCo', group: 'Kołki', label: 'Kołek co ile otworów', type: 'num', def: 1, min: 1, max: 4, step: 1 },
  { key: 'kolekD', group: 'Kołki', label: 'Średnica kołka (otwór ⌀6)', type: 'num', def: 5.8, min: 3, max: 10, step: 0.1 },
  { key: 'kolekGleb', group: 'Kołki', label: 'Głębokość w otworze', type: 'num', def: 10, min: 4, max: 25, step: 0.5, show: (p) => !isZatrzask(p) },
  { key: 'zatrzaskGleb', group: 'Kołki', label: 'Wejście zatrzasku w otwór', type: 'num', def: 3, min: 1.5, max: 6, step: 0.5, show: (p) => isZatrzask(p) },
  { key: 'zatrzaskGrub', group: 'Kołki', label: 'Grubość języczka zatrzasku', type: 'num', def: 2, min: 1.2, max: 4, step: 0.1, show: (p) => isZatrzask(p) },

  { key: 'plytkaSzer', group: 'Płytka na otwory', label: 'Szerokość płytki', type: 'num', def: 20, min: 10, max: 80, step: 0.5, show: isOtwory },
  { key: 'plytkaGrub', group: 'Płytka na otwory', label: 'Grubość płytki', type: 'num', def: 5, min: 3, max: 12, step: 0.5, show: isOtwory },
  { key: 'margines', group: 'Płytka na otwory', label: 'Zapas nad górnym kołkiem', type: 'num', def: 8, min: 4, max: 30, step: 0.5, show: isOtwory },

  { key: 'opaskaWys', group: 'Opaska', label: 'Wysokość opaski', type: 'num', def: 50, min: 15, max: 160, step: 1, show: isOpaska },
  { key: 'opaskaScianka', group: 'Opaska', label: 'Grubość ścianek', type: 'num', def: 4, min: 2, max: 8, step: 0.5, show: isOpaska },
  { key: 'luz', group: 'Opaska', label: 'Luz na stronę', type: 'num', def: 0.5, min: 0, max: 2, step: 0.1, show: isOpaska },
  { key: 'strona', group: 'Opaska', label: 'Ścianka boczna opaski', type: 'select', def: 'lewa', show: isOpaska,
    options: [['lewa', 'Po lewej (patrząc na otwory)'], ['prawa', 'Po prawej (patrząc na otwory)']] },

  { key: 'hakWysieg', group: 'Hak', label: 'Prześwit (ściana → zagięcie)', type: 'num', def: 30, min: 5, max: 150, step: 1, show: isEl('hak') },
  { key: 'hakWys', group: 'Hak', label: 'Wysokość zagięcia', type: 'num', def: 20, min: 0, max: 100, step: 1, show: isEl('hak') },
  { key: 'hakGrub', group: 'Hak', label: 'Grubość ramienia', type: 'num', def: 6, min: 3, max: 16, step: 0.5, show: isEl('hak') },

  { key: 'obejmaD', group: 'Obejma', label: 'Średnica trzymanego przedmiotu', type: 'num', def: 25, min: 5, max: 120, step: 0.5, show: isEl('obejma') },
  { key: 'obejmaOtwarcie', group: 'Obejma', label: 'Otwarcie (% średnicy, 100 = kołyska)', type: 'num', def: 80, min: 50, max: 100, step: 1, show: isEl('obejma') },
  { key: 'obejmaScianka', group: 'Obejma', label: 'Grubość obejmy', type: 'num', def: 3.5, min: 1.5, max: 8, step: 0.5, show: isEl('obejma') },
  { key: 'obejmaOdstep', group: 'Obejma', label: 'Odstęp od ściany', type: 'num', def: 6, min: 0, max: 100, step: 1, show: isEl('obejma') },

  { key: 'plWys', group: 'Płytka do przykręcenia', label: 'Wysokość płytki', type: 'num', def: 60, min: 15, max: 200, step: 1, show: isEl('plytka') },
  { key: 'plGrub', group: 'Płytka do przykręcenia', label: 'Grubość płytki', type: 'num', def: 6, min: 3, max: 15, step: 0.5, show: isEl('plytka') },
  { key: 'plOtwory', group: 'Płytka do przykręcenia', label: 'Liczba otworów pod wkręty', type: 'num', def: 2, min: 0, max: 8, step: 1, show: isEl('plytka') },
  { key: 'plOtworD', group: 'Płytka do przykręcenia', label: 'Średnica otworu pilotowego', type: 'num', def: 3.2, min: 2, max: 6, step: 0.1, show: isEl('plytka') },

  { key: 'stol', group: 'Druk', label: 'Bok stołu drukarki', type: 'num', def: 220, min: 100, max: 500, step: 1 },
];

export const PRESETS = [
  { id: 'hak-otwory', title: 'Hak w otwory', spec: 'od strony otworów · 2 kołki',
    desc: 'Hak na dwa kołki wchodzące w otwory słupka. Na torby, przedłużacze, słuchawki.',
    values: { mocowanie: 'otwory', element: 'hak' } },
  { id: 'kolyska-otwory', title: 'Kołyska na drążek', spec: 'od strony otworów · ⌀30',
    desc: 'Otwarta kołyska. Dwie na sąsiednich słupkach trzymają drążek, kij albo rurkę.',
    values: { mocowanie: 'otwory', element: 'obejma', obejmaD: 30, obejmaOtwarcie: 100 } },
  { id: 'klips-otwory', title: 'Klips na trzonek', spec: 'od strony otworów · ⌀22 zatrzask',
    desc: 'Obejma na zatrzask dla trzonka, latarki, rurki albo kabla w osłonie.',
    values: { mocowanie: 'otwory', element: 'obejma', obejmaD: 22, obejmaOtwarcie: 80 } },
  { id: 'hak-opaska', title: 'Opaska z hakiem', spec: 'wokół słupka · hak na zewnątrz',
    desc: 'Opaska obejmuje słupek, kołki trzymają ją w otworach, a szeroki hak jest po przeciwnej stronie, na zewnętrznym boku regału.',
    values: { mocowanie: 'opaska', element: 'hak', hakWysieg: 25 } },
  { id: 'klips-opaska', title: 'Opaska z klipsem', spec: 'wokół słupka · ⌀25 zatrzask',
    desc: 'Klips na zatrzask po zewnętrznej stronie słupka. Na miotłę, poziomicę, rurkę.',
    values: { mocowanie: 'opaska', element: 'obejma', obejmaD: 25, obejmaOtwarcie: 80 } },
  { id: 'plytka-opaska', title: 'Opaska z płytką', spec: 'wokół słupka · 2 wkręty',
    desc: 'Płytka z otworami pilotowymi na zewnętrznej stronie słupka. Przykręcisz do niej listwę, panel albo cokolwiek z drewna.',
    values: { mocowanie: 'opaska', element: 'plytka' } },
];

export function defaults() {
  return Object.fromEntries(PARAMS.map((d) => [d.key, d.def]));
}

/** Uzupełnia brakujące wartości, przycina liczby do zakresów, odrzuca nieznane opcje. */
export function normalize(input = {}) {
  const p = defaults();
  for (const d of PARAMS) {
    const v = input[d.key];
    if (v === undefined || v === null || v === '') continue;
    if (d.type === 'select') {
      if (d.options.some(([k]) => k === v)) p[d.key] = v;
    } else {
      const n = Number(v);
      if (Number.isFinite(n)) p[d.key] = Math.min(d.max, Math.max(d.min, d.step >= 1 ? Math.round(n) : n));
    }
  }
  return p;
}

export function presetParams(id) {
  const pr = PRESETS.find((x) => x.id === id);
  return normalize(pr ? pr.values : {});
}

// Parametry stempli: źródło (obraz/tekst), kształt, relief, rączka. Wymiary w mm.
import { defaultsOf, normalizeWith } from '../../lib/form.js';

const isImg = (p) => p.zrodlo === 'obraz';
const isTxt = (p) => p.zrodlo === 'tekst';

export const FONTS = [
  ['Archivo Black', 'Archivo Black — gruby bezszeryfowy'],
  ['Roboto Slab:700', 'Roboto Slab — szeryfowy'],
  ['Lobster', 'Lobster — ozdobny'],
  ['Pacifico', 'Pacifico — pisany'],
  ['Caveat:700', 'Caveat — odręczny'],
  ['Source Sans 3:700', 'Source Sans — prosty'],
];

export const GROUPS = ['Wzór', 'Kształt', 'Relief', 'Rączka', 'Druk'];

export const PARAMS = [
  { key: 'zrodlo', group: 'Wzór', label: 'Źródło wzoru', type: 'select', def: 'tekst', options: [['tekst', 'Tekst'], ['obraz', 'Obraz (PNG, JPG)']] },
  { key: 'tekst', group: 'Wzór', label: 'Tekst (Enter = nowa linia)', type: 'text', def: 'Drukowniak', max: 120, show: isTxt },
  { key: 'font', group: 'Wzór', label: 'Krój pisma', type: 'select', def: 'Archivo Black', options: FONTS, show: isTxt },
  { key: 'krawedzie', group: 'Wzór', label: 'Kontur (wykrywanie krawędzi)', type: 'bool', def: false, show: isImg },
  { key: 'prog', group: 'Wzór', label: 'Próg jasności', type: 'num', def: 50, min: 1, max: 99, step: 1, unit: '%', show: (p) => isImg(p) && !p.krawedzie },
  { key: 'czulosc', group: 'Wzór', label: 'Czułość krawędzi', type: 'num', def: 30, min: 1, max: 99, step: 1, unit: '%', show: (p) => isImg(p) && p.krawedzie },
  { key: 'pogrub', group: 'Wzór', label: 'Pogrubienie linii (− ścienia)', type: 'num', def: 0, min: -1, max: 3, step: 0.1, unit: 'mm' },
  { key: 'negatyw', group: 'Wzór', label: 'Negatyw (wypukłe tło)', type: 'bool', def: false },
  { key: 'skala', group: 'Wzór', label: 'Skala wzoru', type: 'num', def: 100, min: 10, max: 300, step: 1, unit: '%' },
  { key: 'przesX', group: 'Wzór', label: 'Przesunięcie w poziomie', type: 'num', def: 0, min: -100, max: 100, step: 0.5 },
  { key: 'przesY', group: 'Wzór', label: 'Przesunięcie w pionie', type: 'num', def: 0, min: -100, max: 100, step: 0.5 },
  { key: 'plamki', group: 'Wzór', label: 'Usuń plamki mniejsze niż', type: 'num', def: 0.3, min: 0, max: 20, step: 0.1, unit: 'mm²' },

  { key: 'ksztalt', group: 'Kształt', label: 'Kształt', type: 'select', def: 'prostokat', options: [['okragly', 'Okrągły'], ['kwadrat', 'Kwadratowy'], ['prostokat', 'Prostokątny']] },
  { key: 'szer', group: 'Kształt', label: 'Szerokość / średnica', type: 'num', def: 60, min: 10, max: 200, step: 1 },
  { key: 'wys', group: 'Kształt', label: 'Wysokość', type: 'num', def: 25, min: 10, max: 200, step: 1, show: (p) => p.ksztalt === 'prostokat' },
  { key: 'margines', group: 'Kształt', label: 'Margines wokół wzoru', type: 'num', def: 2.5, min: 0.5, max: 20, step: 0.5 },
  { key: 'ramka', group: 'Kształt', label: 'Ramka', type: 'bool', def: false },
  { key: 'ramkaSzer', group: 'Kształt', label: 'Szerokość ramki', type: 'num', def: 1.2, min: 0.4, max: 6, step: 0.1, show: (p) => p.ramka },

  { key: 'relief', group: 'Relief', label: 'Wysokość reliefu', type: 'num', def: 1.5, min: 0.4, max: 6, step: 0.1 },
  { key: 'podstawa', group: 'Relief', label: 'Grubość podstawy', type: 'num', def: 5, min: 2, max: 15, step: 0.5 },
  { key: 'pochylenie', group: 'Relief', label: 'Pochylenie boków reliefu', type: 'num', def: 30, min: 0, max: 45, step: 1, unit: '°' },
  { key: 'lustro', group: 'Relief', label: 'Odbicie lustrzane (odcisk czytelny)', type: 'bool', def: true },
  { key: 'cienkie', group: 'Relief', label: 'Usuń linie cieńsze niż', type: 'num', def: 0, min: 0, max: 1.5, step: 0.05 },
  { key: 'rozdz', group: 'Relief', label: 'Rozdzielczość', type: 'num', def: 0.1, min: 0.04, max: 0.3, step: 0.01, unit: 'mm/px' },

  { key: 'raczka', group: 'Rączka', label: 'Rączka', type: 'select', def: 'grzybek', options: [['grzybek', 'Grzybek na wcisk (osobna część)'], ['brak', 'Bez rączki']] },
  { key: 'raczkaWys', group: 'Rączka', label: 'Wysokość rączki', type: 'num', def: 35, min: 15, max: 80, step: 1, show: (p) => p.raczka !== 'brak' },

  { key: 'stol', group: 'Druk', label: 'Bok stołu drukarki', type: 'num', def: 220, min: 100, max: 500, step: 1 },
];

export const PRESETS = [
  { id: 'pieczatka', title: 'Pieczątka z tekstem', desc: 'Prostokątna pieczątka do tuszu z napisem.', values: {} },
  { id: 'okragla', title: 'Okrągła z ramką', desc: 'Okrągły stempel z ramką, np. logo albo monogram.',
    values: { ksztalt: 'okragly', szer: 40, ramka: true, tekst: 'D·S', font: 'Lobster' } },
  { id: 'znak-ceramiki', title: 'Znak twórcy do ceramiki', desc: 'Mały, głęboki znak do odciskania w glinie na spodzie naczyń.',
    values: { ksztalt: 'okragly', szer: 18, relief: 1.6, pochylenie: 40, margines: 1.5, tekst: 'DS', font: 'Archivo Black', raczkaWys: 30 } },
  { id: 'glina', title: 'Stempel do gliny', desc: 'Głęboki relief z pochylonymi bokami, łatwo wychodzi z gliny.',
    values: { ksztalt: 'kwadrat', szer: 40, relief: 2.5, pochylenie: 40, tekst: 'ręcznie\nrobione', font: 'Caveat:700' } },
];

export const defaults = () => defaultsOf(PARAMS);
/** Walidacja; środek wzoru zawsze zostaje w polu wzoru (przesunięcie ≤ połowa pola). */
export function normalize(input) {
  const p = normalizeWith(PARAMS, input);
  const [cw, ch] = contentSize(p);
  const clamp = (v, m) => Math.min(m, Math.max(-m, v));
  p.przesX = +clamp(p.przesX, cw / 2).toFixed(1);
  p.przesY = +clamp(p.przesY, ch / 2).toFixed(1);
  return p;
}

/** Wymiary pola na wzór (mm) dla kształtu: [szerokość, wysokość]. */
export function contentSize(p) {
  const W = p.szer, H = p.ksztalt === 'prostokat' ? p.wys : p.szer;
  if (p.ksztalt === 'okragly') {
    const s = (W - 2 * p.margines) * 0.74; // kwadrat wpisany w koło z zapasem
    return [s, s];
  }
  return [W - 2 * p.margines, H - 2 * p.margines];
}

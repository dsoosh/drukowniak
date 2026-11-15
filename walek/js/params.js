// Parametry wałka do odciskania wzorów w glinie. Wymiary w mm.
import { defaultsOf, normalizeWith } from '../../lib/form.js';

const isImg = (p) => p.wzor === 'obraz';
const notImg = (p) => p.wzor !== 'obraz';

export const PATTERNS = [
  ['romby', 'Romby'],
  ['kropki', 'Kropki'],
  ['fale', 'Fale'],
  ['jodelka', 'Jodełka'],
  ['kratka', 'Kratka'],
  ['paski', 'Paski skośne'],
  ['luski', 'Łuski'],
  ['obraz', 'Własny obraz jako kafel'],
];

export const GROUPS = ['Wzór', 'Obraz', 'Wałek', 'Druk'];

export const PARAMS = [
  { key: 'wzor', group: 'Wzór', label: 'Wzór', type: 'select', def: 'romby', options: PATTERNS },
  { key: 'kafel', group: 'Wzór', label: 'Wielkość kafla wzoru', type: 'num', def: 10, min: 3, max: 60, step: 0.5 },
  { key: 'proporcja', group: 'Wzór', label: 'Wysokość kafla (% szerokości)', type: 'num', def: 100, min: 30, max: 300, step: 5, unit: '%' },
  { key: 'linia', group: 'Wzór', label: 'Grubość linii / odstęp', type: 'num', def: 1.6, min: 0.6, max: 10, step: 0.1, show: notImg },
  { key: 'tryb', group: 'Wzór', label: 'Relief', type: 'select', def: 'wypukly', options: [['wypukly', 'Wypukły (wzór wgłębia się w glinę)'], ['wklesly', 'Wklęsły (wzór wystaje z gliny)']] },
  { key: 'relief', group: 'Wzór', label: 'Wysokość reliefu', type: 'num', def: 1.5, min: 0.4, max: 5, step: 0.1 },
  { key: 'pochylenie', group: 'Wzór', label: 'Pochylenie boków', type: 'num', def: 35, min: 0, max: 45, step: 1, unit: '°' },

  { key: 'prog', group: 'Obraz', label: 'Próg jasności', type: 'num', def: 50, min: 1, max: 99, step: 1, unit: '%', show: isImg },
  { key: 'negatyw', group: 'Obraz', label: 'Negatyw', type: 'bool', def: false, show: isImg },
  { key: 'lustro', group: 'Obraz', label: 'Odbicie lustrzane (odcisk czytelny)', type: 'bool', def: true, show: isImg },
  { key: 'plamki', group: 'Obraz', label: 'Usuń plamki mniejsze niż', type: 'num', def: 0.3, min: 0, max: 20, step: 0.1, unit: 'mm²', show: isImg },
  { key: 'rozdz', group: 'Obraz', label: 'Rozdzielczość', type: 'num', def: 0.1, min: 0.05, max: 0.3, step: 0.01, unit: 'mm/px', show: isImg },

  { key: 'srednica', group: 'Wałek', label: 'Średnica wałka', type: 'num', def: 32, min: 12, max: 120, step: 0.5 },
  { key: 'dlugosc', group: 'Wałek', label: 'Długość', type: 'num', def: 70, min: 15, max: 250, step: 1 },
  { key: 'os', group: 'Wałek', label: 'Otwór na oś (0 = bez)', type: 'num', def: 8.4, min: 0, max: 30, step: 0.1 },
  { key: 'pierscienie', group: 'Wałek', label: 'Pierścienie dystansowe na końcach', type: 'bool', def: true, show: (p) => p.tryb === 'wypukly' },
  { key: 'pierscienSzer', group: 'Wałek', label: 'Szerokość pierścienia', type: 'num', def: 5, min: 2, max: 20, step: 0.5, show: (p) => p.tryb === 'wypukly' && p.pierscienie },
  { key: 'glebokosc', group: 'Wałek', label: 'Głębokość odcisku', type: 'num', def: 1, min: 0.2, max: 5, step: 0.1, show: (p) => p.tryb === 'wypukly' && p.pierscienie },
  { key: 'margines', group: 'Wałek', label: 'Gładki pas na końcach', type: 'num', def: 1, min: 0, max: 30, step: 0.5 },

  { key: 'stol', group: 'Druk', label: 'Wysokość robocza drukarki', type: 'num', def: 250, min: 100, max: 500, step: 1 },
];

export const PRESETS = [
  { id: 'romby', title: 'Romby', desc: 'Klasyczna siatka rombów.', values: { wzor: 'romby' } },
  { id: 'kropki', title: 'Kropki', desc: 'Kropki w układzie plastra miodu.', values: { wzor: 'kropki', kafel: 7 } },
  { id: 'fale', title: 'Fale', desc: 'Faliste pasy dookoła wałka.', values: { wzor: 'fale', kafel: 14, proporcja: 60, linia: 2 } },
  { id: 'jodelka', title: 'Jodełka', desc: 'Wzór jodełkowy, jak w parkiecie albo tkaninie.', values: { wzor: 'jodelka', kafel: 12, linia: 1.8 } },
  { id: 'luski', title: 'Łuski', desc: 'Nachodzące na siebie łuski, jak dachówka albo skóra ryby.', values: { wzor: 'luski', kafel: 10, proporcja: 60 } },
  { id: 'kratka', title: 'Kratka wklęsła', desc: 'Wypukła kratka na glinie: wałek ma wycięte rowki.', values: { wzor: 'kratka', tryb: 'wklesly', kafel: 8, linia: 1.4 } },
];

export const defaults = () => defaultsOf(PARAMS);
export const normalize = (input) => normalizeWith(PARAMS, input);

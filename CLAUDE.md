# CLAUDE.md — Drukowniak

Parametryczne wydruki 3D publikowane na GitHub Pages (https://dsoosh.github.io/drukowniak/).
Właściciel pisze po polsku; odpowiadaj po polsku. UI, opisy i komunikaty po polsku, kod i komentarze
po polsku albo angielsku (bez mieszania w jednym pliku).

## Najpierw przeczytaj
- `openspec/project.md`: stos, konwencje, zasady druku
- `openspec/specs/`: wymagania istniejących projektów

## Zasady
- Bez kroku budowania: HTML + ES modules, biblioteki z CDN w przypiętych wersjach
  (manifold-3d 3.5.4, three 0.160.0). Ta sama wersja manifold-3d w `package.json`.
- Moduł geometrii jest czysty (dostaje `wasm` i parametry) i działa w przeglądarce oraz w Node.
  Wspólne kawałki UI i geometrii w `lib/` — nowy projekt korzysta z nich zamiast kopiować.
- Sumy wielu brył: rozłączne kawałki + jedno `Manifold.union([...])` (batch), nie sumowanie po kolei
  nakładających się brył — różnica bywa 10×.
- Każda część drukuje się bez podpór w pozycji z pliku STL; jeśli opcja wymaga podpór, UI to mówi.
- Wymiary w mm. Parametry walidowane w `normalize()`, stan konfiguratora w adresie URL.
- Gotowe STL i miniatury w `stl/` generuje `node tools/build-stl.js`; po zmianie geometrii przelicz
  i commituj razem z kodem.
- Zmiana zakresu lub zachowania: najpierw propozycja OpenSpec (`openspec/changes/<id>/`), potem kod.

## Zanim zrobisz commit
`npm test` — wszystko zielone; `node tools/build-stl.js`
jeśli zmieniła się geometria.

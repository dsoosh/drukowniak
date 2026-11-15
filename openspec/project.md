# Drukowniak — kontekst projektu

## Cel
Kolekcja parametrycznych modeli do druku 3D z konfiguratorem w przeglądarce i gotowymi STL
dla wymiarów domyślnych. Pierwsza kolekcja: mocowania do słupków IKEA IVAR.

## Stos
- Statyczna strona na GitHub Pages, bez kroku budowania.
- Geometria: manifold-3d 3.5.4 (WASM, CSG): profile 2D (`CrossSection`) wyciągane i łączone.
- Podgląd: three.js 0.160.0 + OrbitControls.
- Eksport: własny zapis binarnego STL (`lib/stl.js`).
- Node ≥ 16: testy (`tests/*.test.js`, `node:assert`) i generator gotowych STL (`tools/build-stl.js`).

## Konwencje geometrii
- Każdy projekt ma układ „zamontowany” (do podglądu i testów kolizji) oraz układ „do druku” (z ≥ 0).
- Druk bez podpór: elementy nośne leżą profilem na stole; otwory poziome w kształcie kropli
  z ostrzem do góry; kołki jako osobne części leżące, ścięte płasko na dole i górze.
- Testy sprawdzają: poprawność bryły (`status() === 'NoError'`), jedną bryłę na część, brak kolizji
  z elementem montażowym, położenie kołków względem otworów, mieszczenie się na stole.

## Dane IVAR (do weryfikacji pomiarem)
- Otwory ⌀6 mm co 32 mm w pionie, jedna kolumna na ścianie słupka
  (źródła: ikeahacker.co.uk/ivar/ivar-pin-spacing, furnica.com — pomiary użytkowników).
- Przekrój słupka nieopublikowany; domyślnie 44 × 22 mm (szacunek z wymiarów paczki 89 × 44 mm).

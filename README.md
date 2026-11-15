# Drukowniak

Parametryczne wydruki 3D. Wpisujesz wymiary, oglądasz model w 3D, pobierasz STL gotowy do druku.
Strona: https://dsoosh.github.io/drukowniak/

- **[Mocowania IVAR](ivar/)**: haki, kołyski, klipsy i płytki do słupków regału IKEA IVAR.
  - *W otwory*: płytka z kołkami w otworach słupka, część użytkowa od strony otworów.
  - *Opaska*: obejma wokół słupka trzymana kołkami w otworach, część użytkowa po przeciwnej stronie
    (np. na zewnętrznym boku regału). Otwarta strona patrzy na szczeble drabinki.
  - Gotowe pliki w [stl/ivar/](stl/ivar/) mają domyślne wymiary: słupek 44 × 22 mm, otwory ⌀6 co 32 mm.
    **Przekrój słupka jest szacunkowy, zmierz swój przed drukiem opaski.**

## Jak to działa

Bez kroku budowania: HTML + ES modules. Geometria to [manifold-3d](https://github.com/elalish/manifold)
(CSG w WebAssembly), podgląd to three.js, obie biblioteki z CDN w przypiętych wersjach. Ten sam moduł
geometrii (`ivar/js/model.js`) działa w przeglądarce i w Node, więc testy i gotowe STL liczą dokładnie
to samo, co strona.

Każdy element drukuje się na boku: profil haka czy obejmy leży płasko na stole, warstwy idą wzdłuż
ramienia. Otwory poziome mają kształt kropli, a kołki są osobnymi częściami leżącymi obok, więc druk
nie wymaga podpór.

```sh
npm install                # manifold-3d dla testów i generatora (Node ≥ 16)
node tools/serve.js        # podgląd na http://127.0.0.1:5182/
node tests/ivar.test.js    # testy geometrii (szczelność, kolizje ze słupkiem, położenie kołków)
node tools/build-stl.js    # przelicza stl/ivar/*.stl i miniatury *.png
```

## Dodawanie nowego projektu

Katalog `nazwa/` z `index.html` i `js/` (parametry, model, aplikacja). Do tego karta w `index.html`,
gotowe STL w `stl/nazwa/` generowane skryptem w `tools/` i testy w `tests/`. Zmiany przechodzą przez
[OpenSpec](https://github.com/Fission-AI/OpenSpec), patrz [CLAUDE.md](CLAUDE.md).

IKEA i IVAR są znakami towarowymi Inter IKEA Systems B.V. Projekt nie jest z nimi związany.

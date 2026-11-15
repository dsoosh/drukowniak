# Drukowniak

Parametryczne wydruki 3D. Wpisujesz wymiary, oglądasz model w 3D, pobierasz STL gotowy do druku.
Strona: https://dsoosh.github.io/drukowniak/

- **[Mocowania IVAR](ivar/)**: haki, kołyski, klipsy i płytki do słupków regału IKEA IVAR.
  - *W otwory*: płytka z kołkami w otworach słupka, część użytkowa od strony otworów.
  - *Opaska*: obejma wokół słupka trzymana kołkami w otworach, część użytkowa po przeciwnej stronie
    (np. na zewnętrznym boku regału). Otwarta strona patrzy na szczeble drabinki.
  - Gotowe pliki w [stl/ivar/](stl/ivar/) mają domyślne wymiary: słupek 44 × 22 mm, otwory ⌀6 co 32 mm.
    **Przekrój słupka jest szacunkowy, zmierz swój przed drukiem opaski.**
- **[Stemple](stemple/)** — stempel z tekstu (kroje Google Fonts) albo obrazu: do tuszu, gliny i ceramiki.
  Podgląd odcisku z przeciąganiem, lustro, negatyw, pochylone boki reliefu, ramka, rączka na wcisk.
  Przeniesiony z [dsoosh/stamps](https://github.com/dsoosh/stamps) (Flask + React) w całości do przeglądarki:
  relief budowany z konturów maski, a nie z mapy wysokości, więc STL jest mały i czysty.
- **[Wałek do ceramiki](walek/)** — wałek z wzorem do faktury w glinie (romby, kropki, fale, jodełka, łuski,
  kratka, własny obraz jako kafel). Wzór ma całkowitą liczbę powtórzeń dookoła, więc szwu nie widać.
  Relief wypukły albo wklęsły, pierścienie dystansowe ustalające głębokość odcisku, otwór na oś.

## Jak to działa

Bez kroku budowania: HTML + ES modules. Geometria to [manifold-3d](https://github.com/elalish/manifold)
(CSG w WebAssembly), podgląd to three.js, obie biblioteki z CDN w przypiętych wersjach. Ten sam moduł
geometrii (np. `ivar/js/model.js`) działa w przeglądarce i w Node, więc testy i gotowe STL liczą dokładnie
to samo, co strona.

Każdy plik STL jest już ułożony do druku bez podpór: hak leży profilem na stole (warstwy wzdłuż
ramienia), stempel licem do góry z rączką odwróconą obok, wałek na stojąco. Otwory poziome mają
kształt kropli, wystające kołki spód w kształcie V, a boki reliefów są pochylone.

```sh
npm install                # manifold-3d dla testów i generatora (Node ≥ 16)
node tools/serve.js        # podgląd na http://127.0.0.1:5182/
npm test                   # testy geometrii wszystkich projektów
node tools/build-stl.js    # przelicza stl/ivar/*.stl, miniatury i img/*.png kafelków
```

## Dodawanie nowego projektu

Katalog `nazwa/` z `index.html` i `js/` (parametry, model, aplikacja), wspólne moduły w `lib/`
(`form.js` formularz i stan w URL, `viewer.js` podgląd 3D, `mask.js`/`imagemask.js` obraz → kontur,
`stl.js`, `style.css`). Do tego kafelek w `index.html`,
gotowe STL w `stl/nazwa/` generowane skryptem w `tools/` i testy w `tests/`. Zmiany przechodzą przez
[OpenSpec](https://github.com/Fission-AI/OpenSpec), patrz [CLAUDE.md](CLAUDE.md).

IKEA i IVAR są znakami towarowymi Inter IKEA Systems B.V. Projekt nie jest z nimi związany.

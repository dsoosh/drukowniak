# Stemple: kontur (wykrywanie krawędzi) i pogrubienie linii (dylatacja)

## Dlaczego
Ze zdjęcia przedmiotu (liść, klucz, dłoń) próg jasności daje pełną plamę, a na stempel lepiej
nadaje się obrys. Kontury i rysunki ze zdjęć wychodzą cienkie (< 0,5 mm), więc potrzebne jest
pogrubienie linii; ścienianie przydaje się przy zbyt grubych wzorach.

## Co się zmienia
- Parametr `krawedzie` (obraz): maska z mapy krawędzi — wygładzenie 3×3 i moduł gradientu Sobela,
  liczone w rozdzielczości maski (stała grubość konturu). Zamiast „Próg jasności” jest
  „Czułość krawędzi” (`czulosc`, 1–99 %, domyślnie 30 %).
- Parametr `pogrub` (−1…3 mm, tekst i obraz): `CrossSection.offset(pogrub / 2, Round)` na reliefie
  przed negatywem — dodatnie pogrubia (dylatacja), ujemne ścienia (erozja).
- Ostrzeżenie o cienkich liniach podpowiada „Pogrubienie linii”.

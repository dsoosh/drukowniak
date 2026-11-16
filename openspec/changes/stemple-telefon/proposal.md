# Stemple na telefonie

## Dlaczego
Stempel najczęściej robi się z rysunku na kartce albo znaku z przedmiotu. Na telefonie szybciej
zrobić zdjęcie, niż przenosić plik na komputer. Obecny układ i obsługa (kółko myszy, Ctrl+V,
przeciąganie pliku) są pod komputer.

## Co się zmienia
- Na urządzeniach dotykowych (`pointer: coarse`) zamiast pola „upuść” są dwa przyciski:
  „Zrób zdjęcie” (`<input capture="environment">`, otwiera tylny aparat) i „Wybierz z galerii”.
  Zdjęcie od razu przełącza źródło na „obraz”.
- Podgląd odcisku: dwa palce skalują i przesuwają wzór (pinch), jeden palec przesuwa.
- Układ do 860 px: źródło obrazu → podgląd i pobieranie → parametry. Większe pola dotyku,
  pola formularza ≥ 16 px (bez automatycznego zoomu iOS).
- Po wczytaniu obrazu próg jasności ustawia się sam (Otsu): zdjęcia z telefonu są naświetlone
  „na szarość”, a stały próg 50 % łapał całą kartkę i dawał pełny prostokąt. Miniatura wczytanego
  obrazu i ustawiony próg są widoczne pod przyciskami.
- `lib/imagemask.js`: `bindImageInput` przyjmuje dodatkowe pola plików (wspólne dla projektów).

## Bez zmian
Geometria, parametry, STL. Obraz nadal nie opuszcza urządzenia.

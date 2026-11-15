# stemple

## Purpose
Stemple z tekstu albo obrazu do tuszu, gliny i ceramiki, liczone w całości w przeglądarce
(następca projektu dsoosh/stamps: Flask + React + PostgreSQL).

## Requirements

### Requirement: Źródło wzoru
System SHALL budować relief z tekstu (wybrany krój Google Fonts, wiele linii) albo z obrazu
(plik, przeciągnięcie, wklejenie ze schowka). Obraz SHALL nie opuszczać przeglądarki.

#### Scenario: Obraz → maska
- **WHEN** użytkownik wczytuje obraz i ustawia próg jasności
- **THEN** piksele ciemniejsze niż próg tworzą relief, treść jest przycięta do obrysu i dopasowana
  do pola wzoru, plamki mniejsze niż zadana powierzchnia są usuwane

### Requirement: Odcisk czytelny
Relief SHALL być domyślnie lustrzanym odbiciem wzoru, a podgląd „Odcisk” SHALL pokazywać to, co
zostanie na papierze lub w glinie. Użytkownik SHALL móc przesuwać wzór przeciąganiem i skalować kółkiem.

### Requirement: Geometria do druku bez podpór
Stempel SHALL drukować się licem do góry; boki reliefu SHALL mieć zadane pochylenie (schodkowo);
rączka SHALL drukować się odwrócona (czubek na stole, nawisy ≤ 45°) z kwadratowym kołkiem 8 mm
na wcisk do gniazda w podstawie (luz 0,2 mm).

#### Scenario: Cienkie linie
- **WHEN** ponad 3 % powierzchni reliefu to linie cieńsze niż 0,5 mm
- **THEN** interfejs ostrzega i proponuje opcję usunięcia cienkich linii

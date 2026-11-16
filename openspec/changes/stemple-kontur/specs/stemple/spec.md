## ADDED Requirements

### Requirement: Kontur z obrazu
Dla źródła „obraz” użytkownik SHALL móc włączyć wykrywanie krawędzi: relief powstaje z obrysów
(gradient jasności powyżej progu czułości), a nie z ciemnych obszarów.

#### Scenario: Zdjęcie liścia
- **WHEN** użytkownik wczytuje zdjęcie ciemnego liścia na jasnym tle i włącza „Kontur”
- **THEN** relief jest obrysem liścia o stałej grubości linii

### Requirement: Pogrubienie linii
System SHALL pozwalać pogrubić (dylatacja) albo ścienić (erozja) linie wzoru o zadaną wartość w mm,
dla tekstu i obrazu.

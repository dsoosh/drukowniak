## ADDED Requirements

### Requirement: Zdjęcie z aparatu telefonu
Na urządzeniach dotykowych system SHALL pokazywać przycisk otwierający aparat (tylny) oraz przycisk
wyboru obrazu z galerii. Wczytane zdjęcie SHALL przełączać źródło wzoru na obraz i nie opuszczać urządzenia.

#### Scenario: Zdjęcie rysunku
- **WHEN** użytkownik na telefonie dotyka „Zrób zdjęcie” i robi zdjęcie
- **THEN** zdjęcie staje się źródłem wzoru, a strona przewija się do podglądu odcisku

### Requirement: Obsługa dotykiem
Podgląd „Odcisk” SHALL pozwalać przesuwać wzór jednym palcem oraz skalować go rozsuwaniem dwóch palców.
Na ekranach do 860 px układ SHALL prowadzić od źródła obrazu przez podgląd i pobieranie do parametrów.

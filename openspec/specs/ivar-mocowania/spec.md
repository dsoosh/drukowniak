# ivar-mocowania

## Purpose
Parametryczne mocowania do słupków IKEA IVAR: konfigurator w przeglądarce i gotowe STL.

## Requirements

### Requirement: Dwa sposoby mocowania
System SHALL generować mocowanie „w otwory” (płytka od strony otworów, kołki w otworach słupka)
oraz „opaskę” (obejma wokół słupka otwarta z jednej strony, kołki przez przednią ściankę w otwory,
część użytkowa za tylną ścianką).

#### Scenario: Opaska nie koliduje ze słupkiem
- **WHEN** użytkownik wybiera opaskę z luzem `luz`
- **THEN** bryła nie wchodzi w prostopadłościan słupka powiększony o `luz` z każdej strony zamkniętej

#### Scenario: Strona ścianki bocznej
- **WHEN** użytkownik wybiera ściankę boczną po lewej albo prawej (patrząc na otwory)
- **THEN** opaska jest lustrzanym odbiciem, a w pliku do druku ścianka boczna leży na stole

### Requirement: Części użytkowe
System SHALL oferować hak (prześwit, wysokość zagięcia, grubość), obejmę (średnica, otwarcie
50–100 % średnicy, gdzie 100 % to otwarta kołyska) oraz płytkę z otworami pilotowymi (tylko opaska).

### Requirement: Kołki zgodne z otworami
Kołki SHALL leżeć w osi otworów, w odstępach będących wielokrotnością rozstawu otworów,
i wchodzić w słupek na zadaną głębokość. Osobne kołki SHALL drukować się bez podpór.

#### Scenario: Kołki wbudowane
- **WHEN** użytkownik wybiera kołki wbudowane (tylko mocowanie w otwory)
- **THEN** kołki są częścią płytki, a interfejs informuje o potrzebie podpór

### Requirement: Plik do druku
Pobrany STL SHALL zawierać część w pozycji do druku (z ≥ 0, profil płasko na stole) i osobne kołki
obok. Jeśli całość przekracza bok stołu, interfejs SHALL ostrzec.

### Requirement: Stan w adresie
Konfigurator SHALL zapisywać wariant i zmienione parametry w adresie URL, tak aby link
odtwarzał ten sam model.

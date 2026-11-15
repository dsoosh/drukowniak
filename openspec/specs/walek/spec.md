# walek

## Purpose
Wałek do odciskania faktury w glinie z parametrycznym albo własnym wzorem.

## Requirements

### Requirement: Wzór ciągły dookoła
Wzór SHALL mieć całkowitą liczbę powtórzeń na obwodzie (kafel dopasowany do obwodu), tak aby
wałek obrócony o jeden kafel pokrywał się sam ze sobą (brak szwu). Wzory kafelkowe SHALL zawierać
tylko pełne rzędy, wyśrodkowane w pasie wzoru.

### Requirement: Relief wypukły i wklęsły
System SHALL budować relief wypukły (wzór na rdzeniu, średnica = zewnętrzna) albo wklęsły (rowki
w walcu), z pochyleniem boków: wypukły szerszy u podstawy, rowki węższe na dnie.

### Requirement: Pierścienie dystansowe
Dla reliefu wypukłego system SHALL móc dodać na końcach pierścienie o promieniu zewnętrznym
minus głębokość odcisku; głębokość większa niż relief SHALL wywołać ostrzeżenie.

### Requirement: Druk
Wałek SHALL drukować się na stojąco (oś w z) z opcjonalnym przelotowym otworem na oś.
Podgląd SHALL pokazywać model 3D i rozwinięcie odcisku z jednego obrotu.

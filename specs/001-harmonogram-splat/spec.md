# Specyfikacja funkcjonalności: Kalkulator harmonogramu spłat na POLSTR

**Katalog funkcjonalności**: `specs/001-harmonogram-splat`

**Utworzono**: 2026-09-23

**Status**: Draft

**Źródło**: [BRIEF.md](../../BRIEF.md) – zgłoszenie z biznesu „Kalkulator harmonogramu spłat na POLSTR”.
Rozszerzenia w [dodatkowe_wymagania.md](../../dodatkowe_wymagania.md): CR-A (tryb nadpłaty),
CR-B (rekompensata art. 40), CR-C (konwersja WIBOR → POLSTR ze spreadem).

## Kontekst biznesowy

Od września 2026 pierwsze banki w Polsce oferują kredyty hipoteczne ze zmiennym oprocentowaniem
opartym na POLSTR 1M zamiast WIBOR. Zgodnie z mapą drogową KNF w latach 2026–2027 POLSTR ma być
stosowany coraz szerzej, a w 2028 istniejące umowy na WIBOR przejdą jednorazową konwersję.
Doradca w oddziale potrzebuje jednego narzędzia, które pokaże harmonogram spłat dla obu
wskaźników, obu typów rat i uwzględni nadpłaty.

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Rata równa przy stałej stopie (Priority: P1)

Doradca wprowadza kwotę kredytu, liczbę rat, datę pierwszej raty, marżę banku oraz wybiera raty
równe i wskaźnik POLSTR 1M. System zwraca tabelę rat (numer, data, część kapitałowa, część
odsetkowa, rata, saldo po spłacie) oraz sumę odsetek za cały okres. Dla stałej wartości stopy
liczba kontrolna z [BRIEF.md](../../BRIEF.md) musi się zgadzać.

**Why this priority**: bez tej ścieżki nie ma MVP – to trzon kalkulatora i jedyne kryterium
akceptacji z liczbą kontrolną.

**Independent Test**: uruchomienie zapytania `GET /api/harmonogram` z parametrami z liczby
kontrolnej (400 000 zł, 300 rat równych, stopa 5,66 % rocznie, seria stała 0,0355) daje
pierwszą ratę 2 494,72 zł (tolerancja ±0,05 zł) i ostatnią ratę wyrównującą 2 492,53 zł.

**Acceptance Scenarios**:

1. **Given** kwota 400 000 zł, 300 rat równych, marża 2,11 pp, seria wskaźnika stała 0,0355,
   **When** doradca żąda harmonogramu, **Then** pierwsza rata wynosi 2 494,72 zł (±0,05 zł),
   a suma części kapitałowych równa jest kwocie kredytu (400 000 zł).
2. **Given** ta sama kalkulacja, **When** doradca żąda harmonogramu, **Then** ostatnia rata
   ma wartość wyrównującą, tak aby suma części kapitałowych była dokładnie równa kwocie kredytu.
3. **Given** parametry z punktu 1, **When** doradca odczytuje wynik, **Then** widzi
   dodatkowo sumę odsetek za cały okres kredytowania.

---

### User Story 2 – Rata malejąca (Priority: P2)

Ten sam formularz, ale z wyborem „raty malejące”. System zwraca harmonogram, w którym część
kapitałowa jest stała (poza ratą wyrównującą), a część odsetkowa maleje wraz z saldem.

**Why this priority**: drugi standardowy typ rat oferowany przez banki; bez niego kalkulator
nie pokrywa typowego wachlarza produktu.

**Independent Test**: dla stałej stopy suma części kapitałowych równa jest kwocie kredytu,
a różnica między kolejnymi ratami odpowiada spadkowi odsetek liczonemu od malejącego salda.

**Acceptance Scenarios**:

1. **Given** kwota 400 000 zł, 300 rat malejących, seria stała 0,0355 + marża 2,11 pp,
   **When** doradca żąda harmonogramu, **Then** części kapitałowe są sobie równe (z dokładnością
   do raty wyrównującej), a rata pierwsza jest wyższa od raty ostatniej.
2. **Given** te same dane, **When** doradca odczytuje wynik, **Then** suma części kapitałowych
   po zaokrągleniach jest równa kwocie kredytu.

---

### User Story 3 – Zmiana wskaźnika w trakcie spłaty (Priority: P2)

Doradca wybiera POLSTR 1M albo WIBOR 3M z serią wartości pochodzącą z pliku danych. System
w każdym okresie odsetkowym używa wartości wskaźnika obowiązującej na dzień raty
(POLSTR 1M zmienia się co miesiąc w dniu raty, WIBOR 3M – co kwartał). Po ostatnim wpisie
serii obowiązuje ostatnia znana wartość.

**Why this priority**: to sedno nowości „POLSTR zamiast WIBOR” i różnicowanie względem
prostych kalkulatorów offline.

**Independent Test**: podanie serii ze zmianą wartości w trakcie okresu kredytowania daje
harmonogram, w którym odsetki w miesiącach przed i po zmianie są liczone od różnych stóp.

**Acceptance Scenarios**:

1. **Given** seria POLSTR 1M zawierająca różne wartości w kolejnych miesiącach, **When**
   doradca żąda harmonogramu, **Then** rata w miesiącu po zmianie wartości wskaźnika
   uwzględnia nową stopę okresową.
2. **Given** seria WIBOR 3M z jedną zmianą wartości między kwartałami, **When** doradca
   żąda harmonogramu, **Then** stopa jest stała w obrębie kwartału i zmienia się dopiero
   na pierwszej racie kolejnego kwartału.
3. **Given** seria kończąca się przed ostatnią ratą, **When** doradca żąda harmonogramu,
   **Then** kolejne okresy używają ostatniej znanej wartości wskaźnika.

---

### User Story 4 – Nadpłaty w trybie „obniż ratę” i „skróć okres” (Priority: P3)

Doradca dodaje listę nadpłat: dla każdej podaje miesiąc, kwotę i tryb. Tryb „obniż ratę”
utrzymuje pierwotną liczbę rat i przelicza wysokość kolejnych rat od salda po nadpłacie.
Tryb „skróć okres” utrzymuje wysokość raty i skraca harmonogram, kończąc ratą wyrównującą.
Brak wskazanego trybu oznacza „skróć okres” (domyślna wartość zgodna z dotychczasowym
zachowaniem kalkulatora). Konwencja: nadpłata następuje po zaksięgowaniu raty danego
miesiąca, odsetki tego miesiąca liczone są od salda sprzed nadpłaty.

**Why this priority**: art. 39 ustawy o kredycie hipotecznym daje klientowi prawo do
wcześniejszej spłaty, a umowa banku pozwala mu wybrać sposób jej rozliczenia; doradca musi
pokazać oba warianty obok siebie w rozmowie handlowej.

**Independent Test**: kredyt 300 000 zł, 240 rat równych, stopa 6,66 % (WIBOR 3M 4,55 %
+ marża 2,11 pp), nadpłata 30 000 zł po zaksięgowaniu 1. raty. Rata przed nadpłatą
2 265,07 zł, saldo po 1. racie i nadpłacie 269 399,93 zł. Tryb „obniż ratę”: nowa rata
od 2. miesiąca 2 038,11 zł, liczba rat 240. Tryb „skróć okres”: rata 2 265,07 zł, łącznie
196 rat (195 po nadpłacie), ostatnia rata wyrównująca 2 200,53 zł. Tolerancja ±0,05 zł.

**Acceptance Scenarios**:

1. **Given** nadpłata bez wskazanego trybu, **When** system oblicza harmonogram,
   **Then** stosuje tryb „skróć okres” jako wartość domyślną.
2. **Given** nadpłata 30 000 zł po 1. racie w trybie „obniż ratę” dla parametrów
   kontrolnych CR-A, **When** doradca żąda harmonogramu, **Then** liczba rat pozostaje 240,
   a rata od 2. miesiąca wynosi 2 038,11 zł (±0,05 zł).
3. **Given** ten sam scenariusz w trybie „skróć okres”, **When** doradca żąda harmonogramu,
   **Then** liczba rat wynosi 196, rata miesięczna pozostaje 2 265,07 zł, ostatnia rata
   wyrównująca wynosi 2 200,53 zł (±0,05 zł).
4. **Given** dowolny scenariusz z nadpłatami, **When** system oblicza wynik, **Then** suma
   części kapitałowych plus suma nadpłat jest równa kwocie kredytu w obu trybach.

---

### User Story 5 – Ekran doradcy w oddziale (Priority: P3)

Doradca korzysta z jednej strony www: wypełnia formularz (kwota, liczba rat, data pierwszej
raty, marża, wskaźnik, typ rat, lista nadpłat), klika „Policz” i widzi ratę pierwszą i ostatnią,
sumę odsetek, tabelę rat oraz przycisk „Eksport CSV”. CSV jest budowany po stronie przeglądarki
z danych zwróconych przez API.

**Why this priority**: ostatni krok składający funkcjonalność w produkt dla użytkownika końcowego.
Wygląd ekranu jest projektowany równolegle w narzędziu do designu i wklejany jako gotowy komponent
– dlatego jest to osobna, końcowa historia.

**Independent Test**: wypełnienie formularza wartościami z liczby kontrolnej i kliknięcie
„Policz” pokazuje ratę 2 494,72 zł i tabelę 300 rat; kliknięcie „Eksport CSV” pobiera plik
z tymi samymi danymi.

**Acceptance Scenarios**:

1. **Given** doradca otwiera stronę główną, **When** wpisuje parametry liczby kontrolnej
   i klika „Policz”, **Then** widzi ratę pierwszą 2 494,72 zł, ratę ostatnią 2 492,53 zł
   i sumę odsetek.
2. **Given** widoczny wynik, **When** doradca klika „Eksport CSV”, **Then** przeglądarka
   pobiera plik CSV zawierający wszystkie wiersze tabeli rat.
3. **Given** formularz z listą nadpłat, **When** doradca klika „Policz”, **Then** tabela rat
   i suma odsetek uwzględniają wprowadzone nadpłaty.

---

### User Story 6 – Rekompensata za wcześniejszą spłatę wg art. 40 (Priority: P2)

Przy każdej nadpłacie kalkulator pokazuje rekompensatę należną bankowi za wcześniejszą
spłatę kredytu o zmiennej stopie, zgodnie z art. 40 ustawy o kredycie hipotecznym.
Rekompensata jest odrębną opłatą – nie pomniejsza salda ani kwoty nadpłaty – i musi być
widoczna zarówno w wierszu harmonogramu, w którym padła nadpłata, jak i w podsumowaniu
(suma rekompensat za cały okres kredytowania).

**Why this priority**: klient musi zobaczyć pełny koszt decyzji o nadpłacie w oddziale;
bez tego doradca nie może rzetelnie porównać wariantu „nadpłacam” z wariantem „nie
nadpłacam”. Wymóg regulacyjny (art. 40) i Biuro Zgodności.

**Independent Test**: dla trzech niezależnych nadpłat rekompensata jest liczona jako
`min(3 % nadpłaty, nadpłata × stopa okresu, w którym padła nadpłata × 12 miesięcy)`
i wynosi 0 dla nadpłat po 36. miesiącu umowy. Kontrola:

| Nadpłata | Miesiąc | Stopa | 3 % | Odsetki 12 mies. | Rekompensata |
|---|---|---|---|---|---|
| 50 000 zł | 13 | 6,00 % | 1 500,00 zł | 3 000,00 zł | 1 500,00 zł |
| 20 000 zł | 40 | 6,00 % | 600,00 zł | 1 200,00 zł | 0,00 zł |
| 10 000 zł | 5 | 2,00 % | 300,00 zł | 200,00 zł | 200,00 zł |

**Acceptance Scenarios**:

1. **Given** nadpłata w 1.–36. miesiącu umowy, **When** system oblicza harmonogram,
   **Then** wiersz nadpłaty zawiera osobną pozycję „rekompensata” równą
   `min(3 % nadpłaty, nadpłata × stopa okresu × 12 miesięcy)`.
2. **Given** nadpłata w 37. miesiącu umowy lub później, **When** system oblicza
   harmonogram, **Then** rekompensata wynosi 0,00 zł.
3. **Given** harmonogram kontrolny CR-A z dodatkową nadpłatą 50 000 zł w 13. miesiącu,
   **When** doradca żąda harmonogramu, **Then** wiersz 13 pokazuje rekompensatę 1 500,00 zł,
   suma rekompensat wynosi 1 500,00 zł, a saldo po wierszu 13 jest identyczne jak w wersji
   bez naliczania rekompensaty (rekompensata nie pomniejsza salda).
4. **Given** kredyt o okresowo stałej stopie, **When** doradca żąda harmonogramu, **Then**
   system traktuje ten wariant jako poza zakresem tej zmiany (odrębne ograniczenia
   art. 40 ust. 5) i odnotowuje to w dokumentacji.

---

### User Story 7 – Konwersja WIBOR → POLSTR ze spreadem korygującym (Priority: P2)

Doradca konfiguruje jednorazową konwersję istniejącej umowy WIBOR-owej na POLSTR
z konfigurowalnym spreadem korygującym, od zadanej daty lub numeru raty. Konwersja nie
zmienia salda ani liczby rat; zmienia się wyłącznie stopa okresowa od pierwszego okresu
odsetkowego zaczynającego się w dniu konwersji lub później. Wartość spreadu jest parametrem
wejściowym (nie stałą w kodzie), bo docelową wartość ustali rozporządzenie Ministra
Finansów; do testów przyjmujemy ilustracyjnie 0,20 pp.

**Why this priority**: mapa drogowa Narodowej Grupy Roboczej przewiduje ustawową
konwersję WIBOR → POLSTR w 2028 r.; klienci z aktywnymi umowami muszą w oddziale
zobaczyć, jak zmieni się ich rata po konwersji.

**Independent Test**: kredyt 300 000 zł, 240 rat równych, WIBOR 3M 4,55 % + marża 2,11 pp
(stopa 6,66 %), konwersja od 25. raty na POLSTR 3,55 % + spread 0,20 pp + marża 2,11 pp
(stopa 5,86 %). Wynik: raty 1–24 = 2 265,07 zł, saldo po 24. racie = 284 640,60 zł
(bez skoku w dniu konwersji), raty 25–239 = 2 135,68 zł, rata 240 wyrównująca 2 137,47 zł,
łącznie 240 rat. Suma odsetek bez konwersji 243 615,72 zł, z konwersją 215 670,35 zł.
Tolerancja ±0,05 zł.

**Acceptance Scenarios**:

1. **Given** harmonogram z konfiguracją konwersji (data lub numer raty, nowy wskaźnik
   z własną serią wartości, spread), **When** doradca żąda harmonogramu, **Then** od
   pierwszego okresu odsetkowego zaczynającego się w dniu konwersji lub później stopa
   okresu = wartość nowego wskaźnika + spread + marża.
2. **Given** raty równe i konwersja w trakcie spłaty, **When** system przelicza raty
   po konwersji, **Then** nowa rata liczona jest od salda w dniu konwersji na pozostałą
   liczbę rat; liczba rat i saldo w dniu konwersji nie zmieniają się.
3. **Given** raty malejące i konwersja w trakcie spłaty, **When** system przelicza raty
   po konwersji, **Then** część kapitałowa pozostaje niezmieniona, zmieniają się wyłącznie
   odsetki.
4. **Given** harmonogram z konwersją, **When** doradca odczytuje wynik, **Then** widzi
   w tabeli, od którego wiersza obowiązuje nowy wskaźnik (kolumna albo znacznik).
5. **Given** parametry kontrolne CR-C, **When** doradca żąda harmonogramu, **Then**
   rata 24 = 2 265,07 zł, saldo po racie 24 = 284 640,60 zł, rata 25 = 2 135,68 zł
   (tolerancja ±0,05 zł), bez skoku salda między wierszami 24 i 25.

---

### Edge Cases

- Seria wartości wskaźnika kończy się przed ostatnią ratą – używamy ostatniej znanej wartości.
- Nadpłata wskazana na miesiąc spoza zakresu harmonogramu – nadpłata musi być odrzucona
  jako nieprawidłowa (błąd walidacji), bo zaburza sumę kapitału.
- Nadpłata równa lub większa niż saldo w danym miesiącu – harmonogram kończy się w miesiącu
  nadpłaty, saldo końcowe wynosi 0.
- Zaokrąglenia groszowe kumulują się w trakcie spłaty – ostatnia rata musi być wyrównująca,
  tak aby suma części kapitałowych była dokładnie równa kwocie kredytu.
- Kwota kredytu, liczba rat lub marża spoza sensownego zakresu (ujemna, zero) – żądanie
  odrzucone z komunikatem walidacyjnym.
- Data pierwszej raty w niewłaściwym formacie – żądanie odrzucone z komunikatem walidacyjnym.
- Nadpłata bez wskazanego trybu – system stosuje tryb domyślny „skróć okres”, zgodny
  z dotychczasowym zachowaniem kalkulatora.
- Rekompensata za wcześniejszą spłatę: dla nadpłat od 37. miesiąca umowy równa 0; dla
  kredytu o okresowo stałej stopie – poza zakresem tej zmiany (odnotować w README).
- Konwersja WIBOR → POLSTR skonfigurowana na datę spoza zakresu harmonogramu – konwersja
  nie ma efektu (harmonogram w całości na dotychczasowym wskaźniku), bez błędu.
- Konwersja wypadająca w środku kwartału WIBOR 3M – nowa stopa obowiązuje dopiero od
  pierwszego okresu odsetkowego zaczynającego się w dniu konwersji lub później; okres
  bieżący dokańczany jest na starej stopie.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUSI przyjmować parametry: kwota kredytu, liczba rat, data pierwszej raty
  (YYYY-MM-DD), marża banku w punktach procentowych, typ rat (równe albo malejące),
  wskaźnik (POLSTR 1M albo WIBOR 3M), lista nadpłat.
- **FR-002**: System MUSI udostępniać wynik przez `GET /api/harmonogram` z parametrami w query
  string i zwracać JSON zawierający tabelę rat (numer, data, część kapitałowa, część odsetkowa,
  rata, saldo po spłacie) oraz sumę odsetek za cały okres.
- **FR-003**: System MUSI liczyć oprocentowanie okresu jako sumę wartości wskaźnika i marży
  banku wyrażonej w tej samej jednostce (punkty procentowe).
- **FR-004**: System MUSI stosować wartość wskaźnika obowiązującą na dzień raty: POLSTR 1M
  zmienia się co miesiąc w dniu raty, WIBOR 3M – co kwartał.
- **FR-005**: System MUSI używać ostatniej znanej wartości wskaźnika, gdy dana rata wypada
  po końcu serii.
- **FR-006**: System MUSI liczyć odsetki proste w okresie (bez kapitalizacji w ramach miesiąca):
  odsetki za okres = saldo × stopa roczna / 12.
- **FR-007**: System MUSI zaokrąglać kwoty do grosza oraz stosować ratę wyrównującą na końcu,
  tak aby suma części kapitałowych była równa kwocie kredytu.
- **FR-008**: System MUSI obsługiwać nadpłatę w trybie „obniż ratę” (utrzymanie liczby rat,
  przeliczenie wysokości kolejnych rat od salda po nadpłacie) i „skróć okres” (utrzymanie
  wysokości raty, skrócenie harmonogramu, ostatnia rata wyrównująca). Brak wskazanego
  trybu MUSI być interpretowany jako „skróć okres”.
- **FR-008a**: System MUSI przyjmować konwencję, że nadpłata następuje po zaksięgowaniu
  raty danego miesiąca, a odsetki tego miesiąca są liczone od salda sprzed nadpłaty.
- **FR-009**: System MUSI odrzucać żądania z nieprawidłowymi parametrami (ujemne kwoty, zerowa
  liczba rat, nieprawidłowa data, nadpłata poza zakresem) i zwracać komunikat błędu.
- **FR-010**: System MUSI dostarczyć ekran www dostępny pod adresem głównym aplikacji,
  z formularzem, przyciskiem „Policz”, prezentacją raty pierwszej i ostatniej, sumy odsetek,
  tabeli rat oraz przyciskiem „Eksport CSV” budującym plik w przeglądarce z danych z API.
- **FR-011**: System MUSI działać na produkcyjnym adresie na Vercelu; każdy PR musi mieć
  własny adres podglądu.
- **FR-012**: System MUSI świadomie pomijać składanie dziennych stawek POLSTR wstecz –
  wartość wskaźnika na okres bierzemy wprost z danych wejściowych (uproszczenie MVP).
- **FR-013**: System MUSI liczyć rekompensatę za wcześniejszą spłatę kredytu o zmiennej
  stopie jako `min(3 % kwoty nadpłaty, kwota nadpłaty × stopa okresu, w którym padła
  nadpłata × 12 miesięcy)` i wykazywać ją jako odrębną pozycję w wierszu harmonogramu
  oraz w podsumowaniu (suma rekompensat).
- **FR-014**: System MUSI naliczać rekompensatę tylko dla nadpłat w miesiącach 1–36 od
  daty zawarcia umowy; dla nadpłat od 37. miesiąca rekompensata MUSI wynosić 0.
- **FR-015**: System NIE MOŻE pomniejszać salda ani kwoty nadpłaty o rekompensatę –
  saldo po nadpłacie i suma kapitału muszą być identyczne jak w wersji bez rekompensaty.
- **FR-016**: System MUSI wyłączać naliczanie rekompensaty dla kredytu o okresowo stałej
  stopie (art. 40 ust. 5 – poza zakresem tej zmiany) i odnotować to ograniczenie
  w dokumentacji.
- **FR-017**: System MUSI umożliwiać konfigurację jednorazowej konwersji wskaźnika
  w trakcie spłaty, na którą składają się: data lub numer raty, nowy wskaźnik z własną
  serią wartości oraz spread korygujący w punktach procentowych.
- **FR-018**: System MUSI stosować nową stopę okresową (`wartość nowego wskaźnika + spread
  + marża`) od pierwszego okresu odsetkowego zaczynającego się w dniu konwersji lub
  później; marża, saldo w dniu konwersji i liczba rat MUSZĄ pozostać niezmienione.
- **FR-019**: Dla rat równych z konwersją system MUSI przeliczyć wysokość raty od salda
  w dniu konwersji na pozostałą liczbę rat; dla rat malejących MUSI zachować część
  kapitałową i zmienić wyłącznie odsetki.
- **FR-020**: Harmonogram MUSI wskazywać (kolumną albo znacznikiem), od którego wiersza
  obowiązuje nowy wskaźnik po konwersji.
- **FR-021**: Spread korygujący MUSI być parametrem wejściowym; system NIE MOŻE zawierać
  spreadu jako stałej w kodzie (docelową wartość ustali rozporządzenie).

### Key Entities *(include if feature involves data)*

- **Parametry kredytu**: kwota (PLN), liczba rat, data pierwszej raty, marża (pp), typ rat,
  wskaźnik, lista nadpłat.
- **Seria wskaźnika**: uporządkowany zbiór par (data, wartość) dla POLSTR 1M lub WIBOR 3M,
  wczytywany z pliku danych.
- **Nadpłata**: numer miesiąca, kwota, tryb („obniż ratę” / „skróć okres”, domyślnie
  „skróć okres”). Do nadpłaty może zostać przypisana rekompensata (odrębna pozycja).
- **Rekompensata art. 40**: kwota naliczona przy nadpłacie w miesiącach 1–36 umowy,
  równa `min(3 % nadpłaty, nadpłata × stopa okresu × 12 miesięcy)`; nie zmienia salda
  ani kwoty nadpłaty; sumowana w podsumowaniu harmonogramu.
- **Konfiguracja konwersji wskaźnika**: data lub numer raty, nowy wskaźnik z własną
  serią wartości, spread korygujący w punktach procentowych. Nie zmienia salda ani liczby
  rat; wpływa wyłącznie na stopę okresową od dnia konwersji.
- **Pozycja harmonogramu**: numer raty, data raty, część kapitałowa, część odsetkowa,
  łączna rata, saldo po spłacie, rekompensata (jeśli dotyczy), znacznik wskaźnika
  obowiązującego w danym okresie (przed / po konwersji).
- **Harmonogram**: lista pozycji + suma odsetek + suma rekompensat za cały okres.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dla parametrów z liczby kontrolnej ([BRIEF.md](../../BRIEF.md): 400 000 zł,
  300 rat równych, stała stopa 5,66 % rocznie) system zwraca pierwszą ratę 2 494,72 zł
  (tolerancja ±0,05 zł) i ostatnią ratę wyrównującą 2 492,53 zł.
- **SC-002**: We wszystkich scenariuszach (raty równe, raty malejące, zmienny wskaźnik,
  nadpłata w obu trybach) suma części kapitałowych plus suma nadpłat jest dokładnie równa
  kwocie kredytu.
- **SC-003**: Doradca wykonuje pełny scenariusz „wpisz parametry → policz → wyeksportuj CSV”
  w mniej niż 60 sekund, bez czytania dodatkowej instrukcji.
- **SC-004**: Pojedyncze żądanie do endpointu harmonogramu dla 300 rat zwraca wynik odczuwalnie
  natychmiast (poniżej 1 sekundy zauważalnej przez użytkownika).
- **SC-005**: 100 % scenariuszy akceptacyjnych ze wszystkich siedmiu historii użytkownika
  daje wynik zgodny z opisem „Then”.
- **SC-006**: Dla parametrów kontrolnych CR-A (300 000 zł, 240 rat równych, stopa 6,66 %,
  nadpłata 30 000 zł po 1. racie) tryb „obniż ratę” daje ratę 2 038,11 zł od 2. miesiąca
  przy 240 ratach, a tryb „skróć okres” daje 196 rat z ostatnią wyrównującą 2 200,53 zł
  (tolerancja ±0,05 zł); wybór trybu zmienia wynik zgodnie z przewidywaniem.
- **SC-007**: Dla nadpłaty 50 000 zł w 13. miesiącu przy stopie 6,00 % rekompensata
  wynosi 1 500,00 zł; dla nadpłaty w 40. miesiącu – 0,00 zł; dla nadpłaty 10 000 zł
  w 5. miesiącu przy stopie 2,00 % – 200,00 zł (tolerancja ±0,01 zł); saldo po nadpłacie
  jest identyczne jak w wariancie bez rekompensaty.
- **SC-008**: Dla parametrów kontrolnych CR-C (300 000 zł, 240 rat równych, WIBOR 3M
  4,55 % + marża 2,11 pp, konwersja od 25. raty na POLSTR 3,55 % + spread 0,20 pp +
  marża 2,11 pp) rata 24 wynosi 2 265,07 zł, saldo po racie 24 = 284 640,60 zł, rata 25
  = 2 135,68 zł, ostatnia rata wyrównująca 2 137,47 zł, suma odsetek 215 670,35 zł
  (tolerancja ±0,05 zł).

## Assumptions

- Doradca korzysta z aplikacji na komputerze służbowym z nowoczesną przeglądarką i stabilnym
  łączem – responsywność mobilna nie jest wymagana w MVP.
- Dane serii wskaźników pochodzą wyłącznie z plików `dane/polstr-1m.json` i `dane/wibor-3m.json`
  dostarczonych z repozytorium; nie ma integracji z zewnętrznym API.
- Kalkulator nie wymaga uwierzytelniania – jest to wewnętrzne narzędzie doradcy, publikowane
  jako pojedynczy adres na Vercelu.
- Kwoty są prezentowane w złotych, z separatorem tysięcy i dwoma miejscami po przecinku;
  wewnętrznie reprezentacja pilnuje jednego jawnego miejsca zaokrąglania.
- Świadome uproszczenie MVP: wartość wskaźnika na okres bierzemy wprost z danych, bez składania
  dziennych stawek POLSTR wstecz. To temat oznaczony jako „gwiazdka” w [BRIEF.md](../../BRIEF.md),
  nie należy do MVP.
- Wygląd ekranu jest dostarczany jako gotowy komponent React (osobny tor pracy w Claude Design),
  a niniejsza historia użytkownika opisuje wyłącznie jego zachowanie i zestaw danych.
- Liczba kontrolna jest kryterium akceptacji MVP i musi być pokryta automatycznym testem
  domenowym.
- Rekompensata art. 40 dotyczy wyłącznie kredytów o zmiennej stopie; wariant okresowo
  stałej stopy (art. 40 ust. 5) jest świadomie poza zakresem tej wersji i będzie
  odnotowany w README.
- Wartość spreadu korygującego użyta w teście kontrolnym CR-C (0,20 pp) jest wartością
  ilustracyjną; docelowa wartość zostanie określona rozporządzeniem Ministra Finansów
  i pozostaje parametrem wejściowym, nie stałą w kodzie.
- Konwencja rozliczania nadpłaty: nadpłata zaksięgowana po racie miesiąca, odsetki tego
  miesiąca liczone od salda sprzed nadpłaty. Zapisana w README.

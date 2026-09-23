# Specyfikacja funkcjonalności: Kalkulator harmonogramu spłat na POLSTR

**Katalog funkcjonalności**: `specs/001-harmonogram-splat`

**Utworzono**: 2026-09-23

**Status**: Draft

**Źródło**: [BRIEF.md](../../BRIEF.md) – zgłoszenie z biznesu „Kalkulator harmonogramu spłat na POLSTR”.

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
utrzymuje pierwotną liczbę rat i przelicza wysokość kolejnych rat. Tryb „skróć okres”
utrzymuje wysokość raty i skraca harmonogram.

**Why this priority**: wyraźna wartość dla doradcy prowadzącego rozmowę handlową, ale
niekonieczna dla najprostszej demonstracji liczby kontrolnej – dlatego P3.

**Independent Test**: nadpłata 50 000 zł w 12. miesiącu przy racie równej daje inny
wynik dla trybu „obniż ratę” (ta sama liczba rat, niższe raty od 13. miesiąca) i „skróć
okres” (ta sama rata, mniej rat), w obu przypadkach suma części kapitałowych plus suma
nadpłat = kwota kredytu.

**Acceptance Scenarios**:

1. **Given** harmonogram z jedną nadpłatą 50 000 zł w 12. miesiącu w trybie „obniż ratę”,
   **When** doradca żąda harmonogramu, **Then** liczba rat pozostaje niezmieniona, a rata
   miesięczna od 13. miesiąca jest niższa niż przed nadpłatą.
2. **Given** ten sam scenariusz w trybie „skróć okres”, **When** doradca żąda harmonogramu,
   **Then** harmonogram kończy się wcześniej, a wysokość raty od 13. miesiąca pozostaje
   zbliżona do pierwotnej.
3. **Given** dowolny scenariusz z nadpłatami, **When** system oblicza wynik, **Then** suma
   części kapitałowych plus suma nadpłat jest równa kwocie kredytu.

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
  przeliczenie wysokości kolejnych rat) i „skróć okres” (utrzymanie wysokości raty, skrócenie
  harmonogramu).
- **FR-009**: System MUSI odrzucać żądania z nieprawidłowymi parametrami (ujemne kwoty, zerowa
  liczba rat, nieprawidłowa data, nadpłata poza zakresem) i zwracać komunikat błędu.
- **FR-010**: System MUSI dostarczyć ekran www dostępny pod adresem głównym aplikacji,
  z formularzem, przyciskiem „Policz”, prezentacją raty pierwszej i ostatniej, sumy odsetek,
  tabeli rat oraz przyciskiem „Eksport CSV” budującym plik w przeglądarce z danych z API.
- **FR-011**: System MUSI działać na produkcyjnym adresie na Vercelu; każdy PR musi mieć
  własny adres podglądu.
- **FR-012**: System MUSI świadomie pomijać składanie dziennych stawek POLSTR wstecz –
  wartość wskaźnika na okres bierzemy wprost z danych wejściowych (uproszczenie MVP).

### Key Entities *(include if feature involves data)*

- **Parametry kredytu**: kwota (PLN), liczba rat, data pierwszej raty, marża (pp), typ rat,
  wskaźnik, lista nadpłat.
- **Seria wskaźnika**: uporządkowany zbiór par (data, wartość) dla POLSTR 1M lub WIBOR 3M,
  wczytywany z pliku danych.
- **Nadpłata**: numer miesiąca, kwota, tryb („obniż ratę” / „skróć okres”).
- **Pozycja harmonogramu**: numer raty, data raty, część kapitałowa, część odsetkowa,
  łączna rata, saldo po spłacie.
- **Harmonogram**: lista pozycji + suma odsetek za cały okres.

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
- **SC-005**: 100 % scenariuszy akceptacyjnych ze wszystkich pięciu historii użytkownika daje
  wynik zgodny z opisem „Then”.

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

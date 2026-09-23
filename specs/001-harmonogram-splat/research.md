# Faza 0 – Research

Cel: rozstrzygnąć wszystkie niejasności techniczne, żeby Faza 1 mogła powstać bez
znaczników „NEEDS CLARIFICATION”. Zakres jest wąski – większość decyzji wynika wprost
z [BRIEF.md](../../BRIEF.md), [KARTA.md](../../KARTA.md) i
[Konstytucji](../../.specify/memory/constitution.md).

## D1 – Reprezentacja kwot i miejsce zaokrąglania

- **Decision**: kwoty w domenie trzymamy jako liczby całkowite w groszach (`number`,
  typ nazwany `Grosze`). Zaokrąglenie następuje wyłącznie w jednym miejscu:
  w momencie obliczania części odsetkowej okresu (`Math.round(saldoGr * stopaOkresowa)`),
  oraz w części kapitałowej wyliczanej z zaokrąglonych odsetek. Rata wyrównująca
  na końcu koryguje sumę kapitału do wartości kredytu.
- **Rationale**: unika kumulacji błędu float, spełnia wymóg SC-002 (suma kapitałów =
  kwota kredytu) i art. § V Konstytucji („jedno miejsce zaokrąglania”).
- **Alternatives considered**:
  - reprezentacja w PLN jako `number` z zaokrągleniem do 2 miejsc – ryzyko błędu
    kumulacji przy 300 iteracjach;
  - `bigint` – zbędny narzut typów w API zewnętrznym; wartości poniżej 2^53 gr.

## D2 – Wybór wartości wskaźnika na okres

- **Decision**: dla POLSTR 1M pobieramy wpis z serii, którego data ≤ data raty i który
  jest najpóźniejszy przed nią (miesięczna resetacja w dniu raty). Dla WIBOR 3M ten sam
  algorytm, ale seria zawiera wpisy kwartalne, więc naturalnie utrzymuje się przez trzy
  raty. Jeśli wszystkie wpisy są późniejsze niż pierwsza rata → używamy pierwszego wpisu
  (bezpieczny fallback). Jeśli data raty jest po ostatnim wpisie → używamy ostatniego
  wpisu (FR-005).
- **Rationale**: prostota, zgodność z FR-004/FR-005 i „świadomym uproszczeniem MVP”
  z BRIEF.md (nie składamy dziennych stawek).
- **Alternatives considered**:
  - interpolacja liniowa – nadmiar dla MVP i sprzeczne z regułą „wartość z pliku wprost”;
  - twardy błąd, gdy seria kończy się przed harmonogramem – niezgodne z FR-005.

## D3 – Konwencja odsetek okresowych

- **Decision**: `odsetkiOkres = saldoGr * (wskaznik + marza) / 12`, gdzie stopa jest
  ułamkiem rocznym (0,0355 dla 3,55 %). Punkty procentowe marży zamieniamy na ułamek
  (`marzaPp / 100`). Kolejność działań: najpierw suma (wskaźnik + marża), potem
  dzielenie przez 12, potem mnożenie przez saldo, potem `Math.round`.
- **Rationale**: dokładnie ta konwencja daje liczbę kontrolną 2 494,72 zł z BRIEF.md.
- **Alternatives considered**:
  - kapitalizacja dzienna – wykluczona przez BRIEF („odsetki proste w okresie”);
  - zamiana procentu na ułamek na ostatnim etapie – ryzyko błędu przy testach parametrów.

## D4 – Wzór raty równej

- **Decision**: rata równa liczona wzorem annuitetowym dla bieżącej stopy okresowej
  `q = stopaRoczna / 12`: `rata = kapitalPozostaly * q / (1 - (1+q)^(-liczbaPozostalychRat))`.
  Przy zmianie stopy w kolejnym okresie – przeliczamy ratę na nowo dla pozostałych rat
  i aktualnego salda. W trybie „obniż ratę” po nadpłacie – ten sam mechanizm.
- **Rationale**: standardowa formuła bankowa, obsługuje zarówno stałą, jak i zmienną
  stopę w naturalny sposób.
- **Alternatives considered**:
  - iteracyjne doszukiwanie raty – zbędna złożoność, ta sama wartość co ze wzoru;
  - stała rata z całego okresu bez przeliczeń przy zmianach stopy – niezgodne
    z FR-004 (US3 wymaga zmiany raty po zmianie wskaźnika).

## D5 – Wzór raty malejącej

- **Decision**: część kapitałowa = `kapitalPozostaly / liczbaPozostalychRat`
  (zaokrąglona do grosza), część odsetkowa = zaokrąglone `saldo * stopaOkresowa`,
  rata = suma. Po nadpłacie w trybie „obniż ratę” – ten sam mechanizm z nowym
  `kapitalPozostaly` i tą samą liczbą rat. W trybie „skróć okres” – dołączamy nadpłatę
  do części kapitałowej i przerywamy pętlę, gdy saldo osiągnie 0.
- **Rationale**: prostota, spójność z wymaganiem stałej części kapitałowej.

## D6 – Rata wyrównująca

- **Decision**: przed ostatnią iteracją porównujemy sumę dotychczasowych części
  kapitałowych z kwotą kredytu (minus suma nadpłat). Różnicę przypisujemy jako część
  kapitałową ostatniej raty. Odsetki ostatniej raty liczymy standardowo od salda przed
  spłatą.
- **Rationale**: bezpośrednia realizacja FR-007 i SC-002, zgodne z liczbą kontrolną
  (2 492,53 zł jako ostatnia rata).

## D7 – Obsługa nadpłat

- **Decision**: nadpłata to zdarzenie w konkretnym miesiącu (numer raty). W pętli
  harmonogramu, po zaksięgowaniu regularnej części kapitałowej i przed przejściem do
  kolejnej raty:
  1. odejmujemy nadpłatę od salda,
  2. dla trybu „skróć okres” – wysokość raty bazowej zostaje, więc kolejne iteracje
     naturalnie skończą się wcześniej;
  3. dla trybu „obniż ratę” – przeliczamy ratę wzorem annuitetowym dla nowej pozostałej
     liczby rat i nowego salda.
  Nadpłata > saldo → saldo = 0, harmonogram kończy się natychmiast (edge case ze spec.md).
  Nadpłata poza zakresem harmonogramu → błąd walidacji (FR-009).
- **Rationale**: minimalna zmiana logiki, symetryczna między typami rat.

## D8 – Walidacja wejścia i format błędów API

- **Decision**: route handler `GET /api/harmonogram` waliduje query string ręcznie
  (bez nowej zależności). Wymagane parametry: `kwota` (grosze albo złote z „.” –
  ustalamy grosze jako liczbę całkowitą w API), `liczbaRat` (int > 0), `pierwszaRata`
  (`YYYY-MM-DD`), `marza` (liczba, pp), `typRat` (`rowne` | `malejace`),
  `wskaznik` (`polstr-1m` | `wibor-3m`). Nadpłaty jako powtarzalny parametr
  `nadplata=<miesiac>:<kwotaGr>:<tryb>` (0..N wystąpień). Błąd walidacji: HTTP 400
  z JSON `{ "blad": "<opis>", "pole": "<nazwa parametru>" }`.
- **Rationale**: prostota, brak nowych zależności, jasna diagnostyka dla frontu.

## D9 – Struktura odpowiedzi API

- **Decision**: `200 OK` → JSON `{ pozycje: PozycjaHarmonogramu[], sumaOdsetekGr: number }`,
  gdzie `PozycjaHarmonogramu = { numer, data, kapitalGr, odsetkiGr, rataGr, saldoPoGr }`.
  Klient formatuje kwoty do PLN z separatorem tysięcy przed wyświetleniem.
- **Rationale**: jeden nazwany typ w domenie, ten sam kształt na wejściu do widoku i
  do eksportu CSV.

## D10 – Eksport CSV po stronie przeglądarki

- **Decision**: przycisk „Eksport CSV” buduje `Blob` z `text/csv;charset=utf-8`,
  używa `URL.createObjectURL` i tymczasowego `<a download>`. Separator `;`, cyfry
  w polskim formacie z przecinkiem, żeby otwierało się w Excelu bez importera.
  Nagłówek: `nr;data;kapital;odsetki;rata;saldo`.
- **Rationale**: żadnych zależności, natywne API przeglądarki.

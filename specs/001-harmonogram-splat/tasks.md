---

description: "Lista zadań implementacyjnych"
---

# Tasks: Kalkulator harmonogramu spłat na POLSTR

**Wejście**: dokumenty projektowe z [specs/001-harmonogram-splat/](./)

**Prerekwizyty**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api-harmonogram.md](./contracts/api-harmonogram.md),
[quickstart.md](./quickstart.md), [Konstytucja](../../.specify/memory/constitution.md).

**Testy**: OBOWIĄZKOWE dla domeny i danych – wynika to z Zasady III Konstytucji
(„Test przed kodem – NIENEGOCJOWALNE”). Ekran www i route handler nie mają testów
jednostkowych (Konstytucja § III, Plan – „Testing”).

**Organizacja**: zadania pogrupowane po historiach użytkownika, dokładnie w kolejności
priorytetów ze [spec.md](./spec.md). Każda historia = jedna gałąź `faza-<n>-<nazwa>` =
jeden PR ([KARTA.md](../../KARTA.md)).

## Format: `[ID] [P?] [Story] Opis`

- **[P]**: może iść równolegle (inne pliki, brak zależności od niedokończonych zadań).
- **[Story]**: przypisanie do historii (US1..US5). Setup / Foundational / Polish – bez etykiety.
- W opisach są konkretne ścieżki plików.

## Konwencje ścieżek

- Domena: `src/domena/`
- Dane: `src/dane/`
- API: `app/api/harmonogram/route.ts`
- Ekran: `app/page.tsx`
- Testy: `tests/domena/`, `tests/dane/`

---

## Phase 1: Setup (współdzielona infrastruktura)

**Cel**: potwierdzić stan startowy repo. Szkielet istnieje (Konstytucja § V, KARTA –
Bramka 0), więc faza jest pusta z definicji.

*Brak zadań – projekt Next.js, TypeScript strict, vitest, Tailwind i katalogi
`src/domena/`, `src/dane/`, `app/`, `tests/` są już skonfigurowane.*

---

## Phase 2: Foundational (blokujące prerekwizyty)

**Cel**: przygotować typy publiczne domeny i statyczny dostęp do serii wskaźników,
tak żeby każda historia mogła korzystać z tego samego kontraktu wewnętrznego.

**⚠️ KRYTYCZNE**: żadna historia użytkownika nie zaczyna się przed zakończeniem tej fazy.

- [X] T001 Zdefiniować typy publiczne domeny (`TypRat`, `KodWskaznika`, `WpisWskaznika`, `SeriaWskaznika`, `TrybNadplaty`, `Nadplata`, `ParametryKredytu`, `PozycjaHarmonogramu`, `Harmonogram`) w `src/domena/harmonogram.ts` zgodnie z [data-model.md](./data-model.md); wszystkie pola kwotowe w groszach jako `number` (int), stopa jako `number` (ułamek roczny > 0 i < 1); brak importów Reacta i I/O.
- [X] T002 [P] Napisać test `tests/dane/wskazniki.test.ts` sprawdzający: (a) `pobierzSerie('polstr-1m')` zwraca `SeriaWskaznika` z niepustymi `wpisy` posortowanymi rosnąco po `data`; (b) `pobierzSerie('wibor-3m')` – jak wyżej; (c) niespójna seria (duplikat daty) rzuca `Error`. Test najpierw czerwony.
- [X] T003 Zaimplementować `src/dane/wskazniki.ts`: statyczny import `dane/polstr-1m.json` i `dane/wibor-3m.json`, funkcja `pobierzSerie(kod: KodWskaznika): SeriaWskaznika`, walidacja kształtu (kolejność, brak duplikatów, wartości > 0 i < 1). Nie edytujemy plików w `dane/` (Konstytucja § „Ograniczenia techniczne i stos”). T002 musi być zielony po T003.
- [X] T004 [P] Napisać test `tests/domena/stopaNaOkres.test.ts` sprawdzający `stopaNaOkres`: (a) dla daty raty przed pierwszym wpisem zwraca wartość pierwszego wpisu; (b) dla daty raty po ostatnim wpisie zwraca wartość ostatniego wpisu (FR-005); (c) dla daty raty między wpisami zwraca wartość najpóźniejszego wpisu ≤ data raty (FR-004); (d) do zwróconej stopy dodawana jest marża (`marzaPp / 100`).
- [X] T005 Zaimplementować pomocnicze funkcje domeny w `src/domena/harmonogram.ts`: `stopaNaOkres(seria, dataRaty, marzaPp)` (zgodna z D2/D3 z [research.md](./research.md)) oraz `nastepnaDataRaty(dataPierwszejRaty, numer)` dodająca `numer` miesięcy kalendarzowo bez `Date.now()`. T004 zielony po T005.

**Checkpoint**: fundamenty gotowe – historie użytkownika mogą ruszać.

---

## Phase 3: User Story 1 – Rata równa i liczba kontrolna (P1) 🎯 MVP

**Cel**: dostarczyć algorytm rat równych zgodny z liczbą kontrolną z
[BRIEF.md](../../BRIEF.md) (SC-001).

**Independent Test**: wywołanie `policzHarmonogram` dla 400 000 zł, 300 rat, stała seria
0,0355 + marża 2,11 pp daje pierwszą ratę 2 494,72 zł (±0,05 zł), ostatnią 2 492,53 zł,
sumę części kapitałowych = 400 000 zł.

### Testy US1 (obowiązkowe, TDD)

- [X] T006 [P] [US1] Napisać test `tests/domena/rowneRaty.test.ts`: dla `ParametryKredytu` = { kwotaGr: 40_000_000, liczbaRat: 300, pierwszaRata: '2026-10-15', marzaPp: 2.11, typRat: 'rowne', wskaznik: 'polstr-1m', nadplaty: [] } i serii sztucznej `[{ data: '2026-01-01', wartosc: 0.0355 }]` (stała) – asercje: `pozycje[0].rataGr` ∈ [249467, 249477] (2 494,72 zł ±0,05 zł), `pozycje[299].rataGr === 249253` (2 492,53 zł), `sum(pozycje.kapitalGr) === 40_000_000`, `pozycje[299].saldoPoGr === 0`, `sumaOdsetekGr === sum(pozycje.odsetkiGr)`. Test najpierw czerwony.

### Implementacja US1

- [X] T007 [US1] Zaimplementować `policzHarmonogram` w `src/domena/harmonogram.ts` dla `typRat === 'rowne'`: wzór annuitetowy przeliczany przy każdej zmianie stopy (D4), zaokrąglanie odsetek `Math.round(saldoGr * stopaOkresowa)`, kapitał = rata − odsetki, rata wyrównująca na końcu (D6). Odsetki liczone `saldoGr * (wskaznik + marza/100) / 12` (D3). Zwraca pełen `Harmonogram`. T006 musi być zielony.
- [X] T008 [US1] Napisać cienki route handler `app/api/harmonogram/route.ts`: parsowanie query string zgodne z [contracts/api-harmonogram.md](./contracts/api-harmonogram.md) (na razie wystarczy `kwota`, `liczbaRat`, `pierwszaRata`, `marza`, `typRat=rowne`, `wskaznik`), walidacja (HTTP 400 z `{ blad, pole }` przy błędzie), wywołanie `policzHarmonogram` z `pobierzSerie(wskaznik)`, zwrot `Harmonogram` jako JSON. Bez logiki obliczeń (Konstytucja § IV).
- [X] T009 [US1] Ręcznie zweryfikować `GET /api/harmonogram?kwota=40000000&liczbaRat=300&pierwszaRata=2026-10-15&marza=2.11&typRat=rowne&wskaznik=polstr-1m` – pierwsza rata z odpowiedzi zbliżona do 2 495,85 zł (wartość z pliku 3,55472 %, zgodnie z BRIEF). Zapisać wynik w opisie PR.

**Checkpoint**: MVP – historia P1 działa i daje liczbę kontrolną w teście.

---

## Phase 4: User Story 2 – Rata malejąca (P2)

**Cel**: dodać drugi typ rat, zachowując wszystkie niezmienniki (suma kapitału =
kwota kredytu, ostatnia rata wyrównująca).

**Independent Test**: dla stałej stopy i `typRat: 'malejace'` części kapitałowe są sobie
równe z dokładnością do raty wyrównującej, rata pierwsza > rata ostatnia, suma
części kapitałowych = kwota kredytu.

### Testy US2

- [X] T010 [P] [US2] Napisać test `tests/domena/malejaceRaty.test.ts`: dla tych samych parametrów co T006, ale `typRat: 'malejace'` – asercje: `pozycje[0].kapitalGr === pozycje[1].kapitalGr` (poza ratą wyrównującą), `pozycje[0].rataGr > pozycje[299].rataGr`, `sum(pozycje.kapitalGr) === 40_000_000`, `pozycje[299].saldoPoGr === 0`. Test najpierw czerwony.

### Implementacja US2

- [X] T011 [US2] Rozszerzyć `policzHarmonogram` w `src/domena/harmonogram.ts` o gałąź `typRat === 'malejace'` (D5): część kapitałowa `Math.round(kapitalPozostalyGr / liczbaPozostalychRat)`, odsetki jak w US1, rata wyrównująca na końcu (D6). T010 zielony.
- [X] T012 [US2] Zaktualizować walidację `app/api/harmonogram/route.ts` tak, aby `typRat=malejace` był akceptowanym parametrem enuma zgodnie z [contracts/api-harmonogram.md](./contracts/api-harmonogram.md).

**Checkpoint**: US1 i US2 działają niezależnie.

---

## Phase 5: User Story 3 – Zmiana wskaźnika w trakcie spłaty (P2)

**Cel**: zapewnić, że stopa okresowa wynika z wartości wskaźnika obowiązującej na dzień
raty (FR-004) i że po końcu serii używamy ostatniej znanej wartości (FR-005).

**Independent Test**: seria ze zmianą wartości w miesiącu N daje inną ratę (dla rat
równych) albo inną część odsetkową (dla rat malejących) w racie N i N+1.

### Testy US3

- [X] T013 [P] [US3] Napisać test `tests/domena/zmianaWskaznika.test.ts`: dwa scenariusze – (a) POLSTR 1M, seria dwuwpisowa: `{ '2026-01-01': 0.030 }` i `{ '2027-01-01': 0.050 }`, kredyt 300 rat od 2026-10-15, `typRat: 'rowne'` – asercja: pozycja z datą `< 2027-01-01` używa `stopaRoczna === 0.030 + 0.0211`, pozycja z datą `≥ 2027-01-01` używa `stopaRoczna === 0.050 + 0.0211`; rata przy drugiej stopie jest różna od raty przy pierwszej. (b) WIBOR 3M, seria z jedną zmianą między kwartałami – asercja: w obrębie kwartału stopa stała, zmienia się dopiero na pierwszej racie kolejnego kwartału.

### Implementacja US3

- [X] T014 [US3] Upewnić się, że pętla w `policzHarmonogram` (`src/domena/harmonogram.ts`) dla każdej raty wywołuje `stopaNaOkres(seria, dataRaty, marzaPp)` z bieżącą datą raty i – dla rat równych – przelicza ratę wzorem annuitetowym przy zmianie stopy (D4). Uzupełnić pole `stopaRoczna` w każdej `PozycjaHarmonogramu`. T013 zielony.

**Checkpoint**: US1–US3 działają niezależnie, zmiana wskaźnika jest widoczna w wyniku.

---

## Phase 6: User Story 4 – Nadpłaty (P3)

**Cel**: obsłużyć nadpłaty w obu trybach z zachowaniem inwariantu SC-002.

**Independent Test**: nadpłata 50 000 zł w 12. miesiącu przy racie równej daje różne
harmonogramy dla trybu „obniż ratę” i „skróć okres”, a suma kapitału + suma nadpłat =
kwota kredytu w obu wariantach.

### Testy US4

- [X] T015 [P] [US4] Napisać test `tests/domena/nadplaty.test.ts` z trzema przypadkami: (a) tryb `obniz-rate` – liczba pozycji = `liczbaRat`, rata w 13. miesiącu < rata w 12. miesiącu, `sum(pozycje.kapitalGr) + sum(pozycje.nadplataGr) === kwotaGr`; (b) tryb `skroc-okres` – liczba pozycji < `liczbaRat`, wysokość raty w 13. miesiącu ≈ rata w 12. miesiącu, ta sama suma; (c) nadpłata > salda w danym miesiącu – ostatnia pozycja ma `saldoPoGr === 0` i suma się zgadza.

### Implementacja US4

- [X] T016 [US4] Rozszerzyć `policzHarmonogram` (`src/domena/harmonogram.ts`) o obsługę `parametry.nadplaty` (D7): w danym miesiącu odejmujemy `nadplataGr` od salda, dla `obniz-rate` przy racie równej – przeliczamy ratę wzorem annuitetowym na nowo dla pozostałych rat; dla `skroc-okres` – kończymy pętlę, gdy saldo osiągnie 0. Ustawiamy `PozycjaHarmonogramu.nadplataGr`. T015 zielony.
- [X] T017 [US4] Dodać walidację nadpłat w `src/domena/harmonogram.ts` i w `app/api/harmonogram/route.ts`: `miesiac ∈ [1, liczbaRat]`, `kwotaGr > 0`, `tryb ∈ {obniz-rate, skroc-okres}`, `sum(nadplaty.kwotaGr) ≤ kwotaGr`; złamanie reguły → `Error` w domenie i HTTP 400 z `{ blad, pole: 'nadplata' }` na warstwie API zgodnie z [contracts/api-harmonogram.md](./contracts/api-harmonogram.md).
- [X] T018 [US4] Zaktualizować parser query string w `app/api/harmonogram/route.ts` o powtarzalny parametr `nadplata=<miesiac>:<kwotaGr>:<tryb>` (0..N, kolejność zachowana), z osobnym błędem walidacji dla niepoprawnego formatu.

**Checkpoint**: cała matematyka domenowa (US1–US4) i cały kontrakt API są kompletne.

---

## Phase 7: User Story 5 – Ekran doradcy w oddziale (P3)

**Cel**: dostarczyć ekran doradcy podpięty do `/api/harmonogram`, z eksportem CSV
i formatowaniem kwot.

**Independent Test**: wpisanie parametrów liczby kontrolnej w formularzu i kliknięcie
„Policz” pokazuje ratę pierwszą 2 494,72 zł (dla serii stałej z pliku – 2 495,85 zł),
tabelę 300 rat i sumę odsetek; kliknięcie „Eksport CSV” pobiera plik.

### Implementacja US5

- [X] T019 [US5] Wkleić gotowy komponent React z Claude Design jako `app/page.tsx` z dyrektywą `'use client'` w pierwszej linii ([KARTA.md](../../KARTA.md) – tor równoległy). Bez bibliotek UI, Tailwind, jeden plik.
- [X] T020 [US5] Podpiąć formularz do endpointu: `fetch('/api/harmonogram?...')` z parametrami z formularza w query string (`kwota`, `liczbaRat`, `pierwszaRata`, `marza`, `typRat`, `wskaznik`, powtarzalne `nadplata`) – bez duplikowania obliczeń (Konstytucja § IV). Obsługa błędu HTTP 400: pokazać `blad` i `pole` z odpowiedzi.
- [X] T021 [US5] Zaimplementować widok wyniku w `app/page.tsx`: rata pierwsza, rata ostatnia, suma odsetek, tabela rat (nr, data, kapitał, odsetki, rata, saldo). Formatowanie kwot: separator tysięcy `\u00A0`, przecinek dziesiętny, dwa miejsca po przecinku; konwersja `groszeInt → PLN` dokładnie w tym miejscu.
- [X] T022 [US5] Zaimplementować „Eksport CSV” w `app/page.tsx` (D10): `Blob` z `text/csv;charset=utf-8`, nagłówek `nr;data;kapital;odsetki;rata;saldo`, wartości w formacie polskim (przecinek), pobranie przez `URL.createObjectURL` i tymczasowe `<a download>`.

**Checkpoint**: pełny MVP – US1–US5 działają niezależnie, ekran gotowy do demonstracji.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Cel**: końcowe uszczelnienie i walidacja end-to-end.

- [X] T023 [P] Przejrzeć wszystkie testy vitest pod kątem jawnej liczby kontrolnej w treści (Konstytucja § III); dopisać brakujące asercje `SC-002` (`sum(kapitalGr) + sum(nadplataGr) === kwotaGr`) w testach, w których jeszcze ich nie ma.
- [X] T024 Uruchomić bramki jakości: `npm test`, `npm run typecheck`, `npm run build` – wszystkie zielone lokalnie ([KARTA.md](../../KARTA.md) – Bramka 2). Wynik dołączyć do opisu ostatniego PR.
- [ ] T025 Wykonać walidację ręczną z [quickstart.md](./quickstart.md) na produkcyjnym adresie Vercela: sprawdzić US1 (liczba kontrolna z pliku), US4 (nadpłata w obu trybach), US5 (eksport CSV). Wynik dopisać do opisu PR / maila zaliczeniowego.
- [X] T026 [P] Zaktualizować [README.md](../../README.md): krótki opis funkcjonalności, adres produkcyjny Vercela, komenda uruchomienia lokalnego, wskazanie że dane w [dane/](../../dane) są niezmienne. Bez dodawania zależności.

---

## Dependencies & Execution Order

### Zależności faz

- **Setup (Phase 1)**: pusta.
- **Foundational (Phase 2)**: blokuje wszystkie historie użytkownika. T001 przed T003/T005. T002 przed T003. T004 przed T005.
- **US1 (Phase 3)**: wymaga T001, T003, T005. T006 przed T007. T007 przed T008 (route używa domeny). T009 po T008.
- **US2 (Phase 4)**: wymaga T007 (rozszerza tę samą funkcję). T010 przed T011. T012 po T011.
- **US3 (Phase 5)**: wymaga T005 i T007. T013 przed T014.
- **US4 (Phase 6)**: wymaga T007 i (dla trybu „obniż ratę”) T014. T015 przed T016. T017 i T018 po T016.
- **US5 (Phase 7)**: wymaga zielonego endpointu z Faz 3–6. T019 przed T020, T020 przed T021, T021 przed T022.
- **Polish (Phase 8)**: po Fazach 3–7.

### Zależności wewnątrz historii

- Test → implementacja (Konstytucja § III).
- Typy → funkcje pomocnicze → `policzHarmonogram` → route handler → ekran.

### Możliwości równoległe

- T002 i T004 mogą powstawać równolegle (różne pliki testów) – oznaczone [P].
- Testy T006, T010, T013, T015 to różne pliki i mogą być pisane równolegle w ramach swoich faz (oznaczone [P]), o ile odpowiadająca implementacja jeszcze nie ruszyła.
- T023 i T026 to różne pliki (testy vs README) – można robić równolegle.

---

## Parallel Example – Phase 2 (Foundational)

Można otworzyć dwa równoległe wątki pracy:

- Wątek A: T002 (test danych) → T003 (implementacja `src/dane/wskazniki.ts`).
- Wątek B: T004 (test `stopaNaOkres`) → T005 (implementacja pomocników domeny).

Oba wątki spinają się na T001 (typy publiczne domeny) jako punkcie synchronizacji.

## Parallel Example – Phase 7 (US5)

Podczas gdy agent implementuje T019–T022, tor równoległy z [KARTA.md](../../KARTA.md)
przygotował już komponent w Claude Design. Wklejenie i podpięcie idzie sekwencyjnie
(ten sam plik `app/page.tsx`), więc [P] nie występuje – ale eksport CSV (T022) można
projektować równolegle z testowaniem T021 przez doradcę.

---

## Strategia wdrożenia (MVP first)

1. **MVP**: Fazy 1–3 (T001–T009). Po zakończeniu Fazy 3 aplikacja policzy harmonogram
   rat równych z liczbą kontrolną i odpowie na `GET /api/harmonogram` – to jest kryterium
   Bramki 2 z [KARTA.md](../../KARTA.md).
2. **Rozszerzenia domeny**: Fazy 4–6 (T010–T018) w kolejności priorytetów: raty malejące,
   zmienny wskaźnik, nadpłaty.
3. **Prezentacja**: Faza 7 (T019–T022) – ekran doradcy.
4. **Zamknięcie**: Faza 8 (T023–T026) – testy sumaryczne, bramki jakości, walidacja
   na produkcji, README.

Każda faza kończy się PR-em z gałęzi `faza-<n>-<nazwa>`, review Copilota
i scaleniem `gh pr merge --squash --delete-branch`.

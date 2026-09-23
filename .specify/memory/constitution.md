<!--
Sync Impact Report
- Wersja: (brak) → 1.0.0
- Typ zmiany: MAJOR (pierwsza ratyfikacja)
- Zmodyfikowane zasady: brak (nowy dokument)
- Dodane sekcje:
  - Core Principles: I–V
  - Ograniczenia techniczne i stos
  - Proces pracy i bramki jakości
  - Governance
- Usunięte sekcje: brak
- Szablony i pliki wymagające sprawdzenia:
  - .specify/memory/constitution.md ✅ (utworzony)
  - .github/instructions/review.instructions.md ✅ (spójny)
  - AGENTS.md ✅ (spójny)
- Deferred TODO: brak
-->

# Konstytucja projektu „Harmonogram na POLSTR”

## Core Principles

### I. Domena czysta i deterministyczna

Cała logika obliczeń harmonogramu żyje w `src/domena/` jako czyste funkcje TypeScript.
Funkcje domeny MUSZĄ być deterministyczne: bez importów Reacta, bez I/O, bez `fetch`,
bez `Date.now()`, bez odczytu zmiennych środowiskowych. Dane wejściowe przychodzą
w argumentach, wyniki wracają w wartości zwracanej. Dane wskaźników żyją w `src/dane/`
i są wczytywane z `dane/*.json` przez import JSON – nigdy z sieci ani z systemu plików
w czasie żądania.

Uzasadnienie: kalkulator hipoteczny musi być powtarzalny i testowalny na liczbie
kontrolnej z [BRIEF.md](../../BRIEF.md); mieszanie warstw psuje jedno i drugie.

### II. TypeScript strict, bez furtek

`tsconfig.json` pracuje w trybie `strict`. Zakazane są `any`, `@ts-ignore`, `@ts-expect-error`
bez uzasadnienia w komentarzu przypisanym do konkretnego błędu narzędzia. Typy publiczne
domeny (wejścia, wyjścia, pozycje harmonogramu) są nazwane i eksportowane z modułu domeny.

Uzasadnienie: strict TypeScript wyłapuje w czasie kompilacji te błędy, które w kalkulatorze
finansowym kończą się złą ratą.

### III. Test przed kodem (NIENEGOCJOWALNE)

Zmiana logiki obliczeń MUSI być poprzedzona testem w `tests/` (vitest). Kolejność:
czerwony test → implementacja → zielony test → refaktor. Każda zmiana wyniku liczbowego
wymaga testu z jawną liczbą kontrolną w treści testu. Testy jednostkowe pisze się tylko
dla domeny i danych; ekran www i route handler nie mają testów jednostkowych.
Minimalny zestaw testów z [BRIEF.md](../../BRIEF.md) MUSI pozostać zielony:
raty równe, raty malejące, zmiana wskaźnika w trakcie spłaty, nadpłata w obu trybach,
suma części kapitałowych równa kwocie kredytu.

Uzasadnienie: liczba kontrolna 2 494,72 zł (±0,05 zł) jest kryterium akceptacji MVP;
regresja bez testu jest niezauważalna do momentu demonstracji.

### IV. Cienkie warstwy prezentacji i transportu

Route handler `app/api/harmonogram/route.ts` MUSI ograniczać się do: walidacji parametrów
z query string, wywołania funkcji domeny, zwrócenia JSON. Nie wolno w nim liczyć rat,
odsetek ani agregatów. Ekran `app/page.tsx` jest komponentem `'use client'` z Tailwind,
pobiera dane wyłącznie przez `fetch('/api/harmonogram?...')`, nie duplikuje obliczeń
i nie korzysta z bibliotek UI.

Uzasadnienie: cienkie warstwy pozwalają zmieniać wygląd i transport bez ryzyka dla wyniku
liczbowego, a domena zostaje jedynym źródłem prawdy o kalkulacji.

### V. Prostota i brak nowych zależności bez zgody

Domyślnie nie dodajemy nowych pakietów npm. Każde `dependencies` lub `devDependencies`
poza stanem początkowym repo wymaga jednego zdania uzasadnienia w opisie PR i wyraźnej
zgody – jeśli agent uzna zależność za potrzebną, MUSI zapytać przed instalacją.
Nie budujemy abstrakcji „na zapas”: struktura folderów, warstwy i format API są takie,
jakich wymaga MVP z [BRIEF.md](../../BRIEF.md).

Uzasadnienie: MVP musi być gotowe do 15:00 na Vercelu; każda dodatkowa zależność to
dodatkowy wektor błędu builda i deployu.

## Ograniczenia techniczne i stos

- Framework: Next.js App Router; produkcja na Vercel z GitHuba, każdy push do `main`
  to nowy deploy produkcyjny, każdy PR ma podgląd z komentarza bota Vercel.
- Języki i narzędzia: TypeScript strict, Tailwind do stylów, vitest do testów.
  Bez bibliotek UI, bez runtime CSS-in-JS, bez ORM.
- Układ katalogów: `src/domena/` (czysta domena), `src/dane/` (dostęp do serii wskaźników
  z `dane/*.json`), `app/api/harmonogram/route.ts` (route handler), `app/page.tsx`
  (ekran), `tests/` (testy domeny i danych).
- Reguły domenowe (z [BRIEF.md](../../BRIEF.md)): oprocentowanie okresu = wskaźnik + marża;
  POLSTR 1M zmienia się co miesiąc w dniu raty, WIBOR 3M co kwartał; po ostatnim wpisie
  serii obowiązuje ostatnia znana wartość; odsetki proste w okresie, bez kapitalizacji.
- Kwoty: reprezentacja w groszach jako liczby całkowite ALBO jedna, jawnie udokumentowana
  decyzja o miejscu zaokrąglania w domenie. Zaokrąglenie następuje w jednym miejscu.
  Rata wyrównująca na końcu tak, aby suma części kapitałowych równała się kwocie kredytu.
- Dane: pliki w `dane/` są traktowane jako wejście testów i produkcji – nie edytujemy ich
  bez wyraźnego polecenia. `dane/polstr-1m.json` i `dane/wibor-3m.json` są obowiązkowymi
  źródłami serii wskaźników.
- Katalogi zarządzane przez skille Spec Kit (`.specify/`, `.github/skills/`) modyfikuje
  wyłącznie odpowiedni skill; ręczne edycje są niedozwolone.

## Proces pracy i bramki jakości

- Metodyka: Spec Kit. Artefakty żyją w `.specify/memory/` oraz `specs/001-*/`
  (`spec.md`, `plan.md`, `tasks.md`). Fazy implementacji z `tasks.md` wykonywane są
  po jednej; po każdej fazie zatrzymujemy się i pokazujemy diff.
- Gałęzie i PR: jedna faza = jedna gałąź `faza-<n>-<nazwa>` = jeden PR. Recenzentem
  jest Copilot (`@copilot`); scalanie tylko po review (`gh pr merge --squash --delete-branch`).
- Commity: jednolinijkowe, opisowe, po polsku (np. „faza 3: raty równe przy stałej stopie
  z testem”). Bez skrótów w nazwach domenowych (`rataKapitalowa`, nie `rk`).
- Język: dokumenty, komentarze w kodzie, nazwy domenowe i komunikaty commitów po polsku.
- Bramki jakości przed zgłoszeniem gotowości fazy: `npm test`, `npm run typecheck`,
  `npm run build` – wszystkie MUSZĄ być zielone lokalnie. Ten sam `next build` uruchamia
  Vercel, więc czerwony build lokalnie = czerwony deploy.
- Kryterium akceptacji MVP: liczba kontrolna z [BRIEF.md](../../BRIEF.md) (rata 2 494,72 zł,
  tolerancja ±0,05 zł) potwierdzona testem oraz sprawdzona na produkcyjnym adresie Vercela.
- Zakres agenta: agent nie zaczyna kolejnej fazy bez polecenia, nie dodaje zależności bez
  zapytania, nie edytuje plików w `dane/`, `.specify/` ani `.github/skills/` poza tym,
  co robią odpowiednie skille.

## Governance

Konstytucja ma pierwszeństwo przed innymi praktykami i przyzwyczajeniami. W razie konfliktu
między [AGENTS.md](../../AGENTS.md), [.github/instructions/review.instructions.md](../../.github/instructions/review.instructions.md)
a tym dokumentem – wygrywa konstytucja, a pozostałe pliki należy dostosować w tym samym PR.

Zmiana konstytucji wymaga PR-a zmieniającego wyłącznie ten plik (oraz, jeśli trzeba,
plików zależnych wskazanych w Sync Impact Report). W opisie PR MUSI znaleźć się:
uzasadnienie, typ zmiany (MAJOR/MINOR/PATCH) i lista miejsc do zaktualizowania. Wersję
podbijamy semantycznie:

- MAJOR: usunięcie lub niekompatybilna zmiana zasady albo reguły governance.
- MINOR: dodanie zasady lub materialne rozszerzenie istniejącej.
- PATCH: doprecyzowanie, poprawki językowe, zmiany bez wpływu na znaczenie.

Compliance: każde review PR (Copilot lub człowiek) MUSI zweryfikować zgodność z zasadami
I–V oraz z bramkami jakości. Naruszenie zasady „NIENEGOCJOWALNE” (III) blokuje scalenie.
Odstępstwa od pozostałych zasad wymagają jawnego uzasadnienia w opisie PR i wpisu w sekcji
„Ograniczenia techniczne i stos” w kolejnej zmianie konstytucji.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23

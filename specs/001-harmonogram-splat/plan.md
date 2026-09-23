# Plan implementacyjny: Kalkulator harmonogramu spłat na POLSTR

**Gałąź**: `001-harmonogram-splat` | **Data**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Wejście**: Specyfikacja funkcjonalności z `specs/001-harmonogram-splat/spec.md`.

## Summary

Zbudować kalkulator harmonogramu spłat kredytu hipotecznego obsługujący dwa wskaźniki
(POLSTR 1M, WIBOR 3M), dwa typy rat (równe, malejące) i nadpłaty w dwóch trybach.
Kryterium akceptacji: liczba kontrolna z [BRIEF.md](../../BRIEF.md) (400 000 zł, 300 rat równych,
stała stopa 5,66 % rocznie → rata 2 494,72 zł ±0,05 zł, ostatnia rata wyrównująca 2 492,53 zł).

Podejście techniczne: cała matematyka w czystym module domenowym `src/domena/`
(bez React, bez I/O), dane wskaźników czytane raz przez `src/dane/` z plików
`dane/polstr-1m.json` i `dane/wibor-3m.json`. Route handler `app/api/harmonogram/route.ts`
waliduje query string i deleguje do domeny. Ekran `app/page.tsx` (komponent
`'use client'`, Tailwind) pobiera wynik z `/api/harmonogram` i buduje CSV w przeglądarce.
Testy vitest tylko dla domeny i danych, z jawną liczbą kontrolną w treści testów.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node.js ≥ 22.

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind 4, vitest 4.
Bez nowych zależności.

**Storage**: Statyczne pliki JSON w [dane/](../../dane) (POLSTR 1M, WIBOR 3M), importowane
w czasie budowania przez [src/dane/wskazniki.ts](../../src/dane/wskazniki.ts). Brak bazy danych.

**Testing**: vitest, katalog [tests/](../../tests), pokrycie ograniczone do domeny i danych.

**Target Platform**: aplikacja webowa serwowana przez Vercel (Next.js SSR/serwerless);
przeglądarki desktopowe doradcy.

**Project Type**: web (jedna aplikacja Next.js: route handler + strona kliencka).

**Performance Goals**: pojedyncze żądanie `GET /api/harmonogram` dla 300 rat < 1 s
(w praktyce dziesiątki ms – proste iteracje w pamięci).

**Constraints**:
- domena bez `Date.now()`, bez importów Reacta, bez I/O;
- jedno miejsce zaokrąglania (grosze jako liczby całkowite w wynikach domeny);
- brak nowych zależności npm bez pytania (Konstytucja § V);
- pliki w `dane/` nie są edytowane przez implementację.

**Scale/Scope**: pojedynczy kredyt na żądanie, do ~600 rat (50 lat) w praktyce z zapasem;
brak współbieżnych stanów po stronie serwera.

## Constitution Check

Bramy z [Konstytucji v1.0.0](../../.specify/memory/constitution.md):

- **I. Domena czysta i deterministyczna** → PASS. Cała logika w `src/domena/harmonogram.ts`
  jako czyste funkcje; wejście przez argumenty, wyjście przez wartość zwracaną.
  Wczytywanie danych JSON dzieje się w `src/dane/`, nie w domenie.
- **II. TypeScript strict, bez furtek** → PASS. Projekt już ma strict; typy publiczne
  (`ParametryKredytu`, `PozycjaHarmonogramu`, `Harmonogram`, `SeriaWskaznika`, `Nadplata`)
  eksportowane z modułu domeny.
- **III. Test przed kodem (NIENEGOCJOWALNE)** → PASS. Każda faza z `tasks.md` zaczyna
  się od testu z liczbą kontrolną lub jawną wartością oczekiwaną; testy w
  [tests/](../../tests) piszemy przed implementacją.
- **IV. Cienkie warstwy prezentacji i transportu** → PASS. `app/api/harmonogram/route.ts`
  tylko parsuje query string i woła domenę; `app/page.tsx` tylko renderuje i eksportuje CSV,
  bez duplikowania obliczeń.
- **V. Prostota i brak nowych zależności bez zgody** → PASS. Plan nie wprowadza żadnej
  nowej zależności; parsowanie query string ręczne + walidacja w typowanym helperze.

Wszystkie bramy PASS – sekcja **Complexity Tracking** pozostaje pusta.

## Project Structure

### Documentation (this feature)

```text
specs/001-harmonogram-splat/
├── plan.md              # ten plik
├── spec.md              # specyfikacja
├── research.md          # Faza 0
├── data-model.md        # Faza 1
├── quickstart.md        # Faza 1
├── contracts/
│   └── api-harmonogram.md   # kontrakt GET /api/harmonogram
├── checklists/
│   └── requirements.md
└── tasks.md             # Faza 2 (tworzone przez /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── domena/
│   └── harmonogram.ts        # czyste funkcje: policzHarmonogram, funkcje pomocnicze
└── dane/
    └── wskazniki.ts          # import JSON, mapowanie na typy domeny

app/
├── api/
│   └── harmonogram/
│       └── route.ts          # GET: walidacja query string → domena → JSON
├── layout.tsx
└── page.tsx                  # 'use client' – formularz, wynik, eksport CSV

tests/
├── domena/
│   ├── rowneRaty.test.ts     # liczba kontrolna
│   ├── malejaceRaty.test.ts
│   ├── zmianaWskaznika.test.ts
│   └── nadplaty.test.ts
└── dane/
    └── wskazniki.test.ts     # wybór wartości okresu i fallback na ostatnią znaną

dane/
├── polstr-1m.json            # NIE EDYTUJEMY
└── wibor-3m.json             # NIE EDYTUJEMY
```

**Structure Decision**: wykorzystujemy istniejący szkielet repo (`src/domena/`,
`src/dane/`, `app/api/harmonogram/`, `app/page.tsx`, `tests/`). Bez nowych katalogów
najwyższego poziomu, bez nowych paczek npm. Ekran www to jeden plik `app/page.tsx`
z dyrektywą `'use client'`, dostarczany jako gotowy komponent z Claude Design
i podłączany do route handlera w fazie 4 (patrz [KARTA.md](../../KARTA.md)).

## Complexity Tracking

*Nie dotyczy – Constitution Check nie wykazał naruszeń.*

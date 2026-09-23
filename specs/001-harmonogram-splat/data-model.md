# Faza 1 – Model danych

Wszystkie typy są typami TypeScript w module domeny (`src/domena/harmonogram.ts`)
i re-eksportowane, gdzie trzeba. Kwoty w domenie są przechowywane jako liczby całkowite
w groszach; jednostki są kodowane w nazwach pól (`*Gr`), żeby uniknąć pomyłek.

## Typy publiczne domeny

### `TypRat`

```
type TypRat = 'rowne' | 'malejace';
```

Wybór strategii kalkulacji raty.

### `KodWskaznika`

```
type KodWskaznika = 'polstr-1m' | 'wibor-3m';
```

Identyfikator serii wskaźnika. Mapuje się na plik w [dane/](../../dane).

### `WpisWskaznika`

Pole | Typ | Zakres / walidacja
---- | --- | ------------------
`data` | `string` (`YYYY-MM-DD`) | prawidłowa data w kalendarzu
`wartosc` | `number` | ułamek roczny (np. `0.0355`), > 0 i < 1

Kolejność wpisów: rosnąco po `data`.

### `SeriaWskaznika`

```
type SeriaWskaznika = { kod: KodWskaznika; wpisy: WpisWskaznika[] };
```

Warunki:

- `wpisy` niepuste,
- `wpisy` posortowane rosnąco po `data`,
- brak duplikatów daty.

### `TrybNadplaty`

```
type TrybNadplaty = 'obniz-rate' | 'skroc-okres';
```

### `Nadplata`

Pole | Typ | Walidacja
---- | --- | ---------
`miesiac` | `number` (int) | 1 ≤ `miesiac` ≤ `liczbaRat`
`kwotaGr` | `number` (int) | > 0
`tryb` | `TrybNadplaty` | jedna z dwóch wartości

Dodatkowa reguła spójności: `sum(nadplaty.kwotaGr) ≤ kwotaKredytuGr`.

### `ParametryKredytu`

Pole | Typ | Walidacja
---- | --- | ---------
`kwotaGr` | `number` (int) | > 0
`liczbaRat` | `number` (int) | > 0
`pierwszaRata` | `string` (`YYYY-MM-DD`) | prawidłowa data
`marzaPp` | `number` | ≥ 0, ≤ 100
`typRat` | `TypRat` | wymagane
`wskaznik` | `KodWskaznika` | wymagane
`nadplaty` | `Nadplata[]` | opcjonalne (domyślnie `[]`), unikalne `miesiac`

### `PozycjaHarmonogramu`

Pole | Typ | Opis
---- | --- | ----
`numer` | `number` (int, 1-based) | numer raty
`data` | `string` (`YYYY-MM-DD`) | data raty (POLSTR: co miesiąc w dniu z `pierwszaRata`)
`kapitalGr` | `number` (int) | część kapitałowa (bez nadpłaty)
`odsetkiGr` | `number` (int) | część odsetkowa (zaokrąglona do grosza)
`rataGr` | `number` (int) | `kapitalGr + odsetkiGr`
`nadplataGr` | `number` (int, ≥ 0) | 0 jeśli w danej racie brak nadpłaty
`saldoPoGr` | `number` (int, ≥ 0) | saldo po zaksięgowaniu kapitału i nadpłaty
`stopaRoczna` | `number` | zastosowana stopa okresu (wskaźnik + marża, ułamek roczny)

### `Harmonogram`

```
type Harmonogram = {
  pozycje: PozycjaHarmonogramu[];
  sumaOdsetekGr: number;
};
```

Niezmienniki:

- `sum(pozycje.kapitalGr) + sum(pozycje.nadplataGr) === parametry.kwotaGr`,
- `sumaOdsetekGr === sum(pozycje.odsetkiGr)`,
- ostatnia pozycja ma `saldoPoGr === 0`.

## Funkcje domeny

- `policzHarmonogram(parametry: ParametryKredytu, seria: SeriaWskaznika): Harmonogram`
  – główny punkt wejścia; deterministyczna funkcja bez efektów ubocznych.
- `stopaNaOkres(seria: SeriaWskaznika, dataRaty: string, marzaPp: number): number`
  – zwraca stopę roczną (ułamek) dla danej daty raty, stosując reguły D2/D3 z
  [research.md](./research.md).
- `nastepnaDataRaty(data: string, numer: number): string` – dodaje `numer` miesięcy
  do daty pierwszej raty (kalendarzowo, z korektą końca miesiąca), bez `Date.now()`.

## Model danych wejściowych (pliki JSON)

`dane/polstr-1m.json` i `dane/wibor-3m.json` mają kształt:

```
{
  "kod": "polstr-1m",
  "wpisy": [
    { "data": "2026-01-15", "wartosc": 0.0355472 },
    ...
  ]
}
```

Moduł `src/dane/wskazniki.ts`:

- importuje statycznie oba pliki JSON,
- eksportuje `pobierzSerie(kod: KodWskaznika): SeriaWskaznika`,
- waliduje kształt danych przy pierwszym użyciu (rzuca `Error` z opisem, gdy plik
  jest niespójny – łapane w route handlerze i zwracane jako HTTP 500).

## Model danych warstwy API

Kontrakt endpointu opisany w [contracts/api-harmonogram.md](./contracts/api-harmonogram.md).
Format wewnętrzny w response mapuje 1:1 na `Harmonogram` z domeny; nie ma osobnych DTO.

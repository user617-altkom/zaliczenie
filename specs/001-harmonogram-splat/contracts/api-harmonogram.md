# Kontrakt API: `GET /api/harmonogram`

Endpoint pochodzi z [BRIEF.md](../../../BRIEF.md) i realizuje FR-002. Jest to jedyny
punkt wejścia dla ekranu doradcy.

## Wywołanie

```
GET /api/harmonogram?kwota=<groszeInt>
                    &liczbaRat=<int>
                    &pierwszaRata=<YYYY-MM-DD>
                    &marza=<liczba>
                    &typRat=<rowne|malejace>
                    &wskaznik=<polstr-1m|wibor-3m>
                    &nadplata=<miesiac>:<kwotaGr>:<obniz-rate|skroc-okres>   # 0..N
```

### Parametry query string

Parametr | Typ | Wymagany | Opis
-------- | --- | -------- | ----
`kwota` | int (grosze) | tak | kwota kredytu; > 0
`liczbaRat` | int | tak | liczba rat; > 0
`pierwszaRata` | `YYYY-MM-DD` | tak | data pierwszej raty
`marza` | liczba (pp) | tak | marża banku w punktach procentowych; ≥ 0
`typRat` | enum | tak | `rowne` albo `malejace`
`wskaznik` | enum | tak | `polstr-1m` albo `wibor-3m`
`nadplata` | `<miesiac>:<kwotaGr>:<tryb>` | nie | 0..N wystąpień; `1 ≤ miesiac ≤ liczbaRat`, `kwotaGr > 0`, `tryb ∈ {obniz-rate, skroc-okres}`

Wielokrotny parametr `nadplata` jest kolejno łączony w `Nadplata[]` (kolejność
w query string = kolejność w tablicy).

## Odpowiedź `200 OK`

`Content-Type: application/json`

```
{
  "pozycje": [
    {
      "numer": 1,
      "data": "2026-10-15",
      "kapitalGr": 108072,
      "odsetkiGr": 188400,
      "rataGr": 296472,
      "nadplataGr": 0,
      "saldoPoGr": 39891928,
      "stopaRoczna": 0.0566
    }
  ],
  "sumaOdsetekGr": 348416000
}
```

Kształt zgodny z typem `Harmonogram` z [data-model.md](../data-model.md).

## Błędy walidacji `400 Bad Request`

`Content-Type: application/json`

```
{ "blad": "<opis czytelny dla klienta>", "pole": "<nazwa parametru>" }
```

Przypadki:

- brak wymaganego parametru,
- niepoprawny typ / format (`liczbaRat=abc`, `pierwszaRata=2026-13-01`),
- wartość spoza zakresu (`kwota=-100`, `marza=-1`),
- nieznana wartość enuma (`typRat=roleta`),
- `nadplata` w niepoprawnym formacie,
- `nadplata.miesiac` poza `[1, liczbaRat]`,
- suma nadpłat > kwota kredytu.

## Błędy serwera `500 Internal Server Error`

Zarezerwowane dla niespójności plików danych (`dane/*.json`). Odpowiedź:

```
{ "blad": "<opis techniczny>", "zrodlo": "dane" }
```

## Zasady

- Endpoint jest bezstanowy, wynik jest funkcją parametrów i statycznych danych
  z [dane/](../../../dane).
- Route handler NIE liczy odsetek ani rat – deleguje do `policzHarmonogram` z domeny.
- Nagłówki cache pominięte w MVP (Vercel domyślnie serwuje dynamicznie).

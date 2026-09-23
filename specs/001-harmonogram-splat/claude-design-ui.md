# Prompt dla Claude Design: ekran kalkulatora

Źródła: [spec.md](./spec.md) (US5, FR-010), [plan.md](./plan.md), [contracts/api-harmonogram.md](./contracts/api-harmonogram.md), [data-model.md](./data-model.md).
Całość poniżej linii wklej do Claude Design (claude.ai/design).

---

Zaprojektuj jeden plik z komponentem React + TypeScript (strict, bez `any`), stylowany wyłącznie Tailwind CSS 4, bez bibliotek UI, bez ikon z zewnętrznych paczek, bez żadnych dodatkowych zależności npm. Plik zostanie wklejony jako `app/page.tsx` w Next.js 16 (App Router, React 19), więc:
- pierwsza linia: `'use client';`
- domyślny eksport: `export default function Strona() { ... }`
- tylko React (useState, useMemo itd.) i fetch z przeglądarki.

## Kontekst
Ekran kalkulatora harmonogramu spłat kredytu hipotecznego dla doradcy w oddziale banku. Kredyt oprocentowany zmiennie: wskaźnik POLSTR 1M albo WIBOR 3M plus marża banku. Użytkownik pracuje na komputerze służbowym (desktop, szerokość od ok. 1280 px). Wersja mobilna nie jest wymagana, ale układ nie może się rozsypać na węższym oknie. Styl ma być prosty, czytelny i „bankowy”: jasne tło, stonowane kolory, jeden kolor akcentu, bez logotypów i bez nazw banków. Wszystkie teksty w interfejsie po polsku.

## Układ
Nagłówek: „Harmonogram spłat na POLSTR” i jedno zdanie opisu.
Po lewej (albo u góry) karta z formularzem, po prawej (albo niżej) wynik.

## Formularz (wartości domyślne = liczba kontrolna, żeby dało się od razu kliknąć „Policz”)
1. Kwota kredytu (PLN): pole liczbowe, domyślnie 400 000, dopuszcza grosze (przecinek albo kropka).
2. Liczba rat: liczba całkowita, domyślnie 300. Obok podpowiedź „= 25 lat” (liczba rat / 12).
3. Data pierwszej raty: `input type="date"`, domyślnie 2026-10-15.
4. Marża banku (pp): liczba dziesiętna, domyślnie 2,11.
5. Wskaźnik: przełącznik dwóch opcji: „POLSTR 1M” (domyślnie) albo „WIBOR 3M”. Pod spodem mała podpowiedź: POLSTR zmienia się co miesiąc, WIBOR co kwartał.
6. Typ rat: przełącznik dwóch opcji: „Raty równe” (domyślnie) albo „Raty malejące”.
7. Nadpłaty: dynamiczna lista, na starcie pusta, przycisk „+ Dodaj nadpłatę”. Każdy wiersz ma: miesiąc (numer raty, liczba całkowita od 1 do liczby rat), kwotę (PLN), tryb („Obniż ratę” / „Skróć okres”) i przycisk usuń. Przykład do podpowiedzi: 50 000 zł w 12. miesiącu.
8. Główny przycisk „Policz”. Formularz wysyła się też klawiszem Enter.

Walidacja w przeglądarce ogranicza się do tego, co oczywiste: wymagane pola, kwota > 0, liczba rat > 0, marża ≥ 0, miesiąc nadpłaty w zakresie 1..liczba rat, różne miesiące nadpłat. Błąd pokaż pod polem na czerwono, bez alertów.

## Wywołanie API (kontrakt jest wiążący)
`GET /api/harmonogram` z parametrami w query string (zbuduj go przez `URLSearchParams`):
- `kwota`: liczba całkowita w GROSZACH (400 000,00 zł → 40000000); zamiana zł→grosze to `Math.round(zł * 100)`;
- `liczbaRat`: int;
- `pierwszaRata`: YYYY-MM-DD;
- `marza`: liczba w pp z kropką dziesiętną (np. 2.11);
- `typRat`: `"rowne"` | `"malejace"`;
- `wskaznik`: `"polstr-1m"` | `"wibor-3m"`;
- `nadplata`: parametr POWTARZALNY, jeden na każdą nadpłatę, w formacie `<miesiac>:<kwotaGr>:<tryb>`, gdzie tryb to `"obniz-rate"` | `"skroc-okres"`, np. `nadplata=12:5000000:obniz-rate`.

Odpowiedź 200 (wszystkie kwoty w groszach, jako liczby całkowite):

```ts
type PozycjaHarmonogramu = {
  numer: number;
  data: string;
  kapitalGr: number;
  odsetkiGr: number;
  rataGr: number;
  nadplataGr: number;
  saldoPoGr: number;
  stopaRoczna: number; // ułamek, np. 0.0566
};
type Harmonogram = { pozycje: PozycjaHarmonogramu[]; sumaOdsetekGr: number };
```

Odpowiedź 400: `{ blad: string; pole: string }`. Pokaż komunikat `blad` w czerwonym bloku nad wynikiem i podświetl pole formularza odpowiadające `pole` (nazwy: kwota, liczbaRat, pierwszaRata, marza, typRat, wskaznik, nadplata).
Odpowiedź 500: `{ blad: string; zrodlo: "dane" }`. Pokaż ogólny komunikat „Błąd danych wskaźników” i treść `blad`.
Błąd sieci: komunikat „Nie udało się połączyć z serwerem”.

Komponent NIE liczy rat ani odsetek. Wszystkie liczby pochodzą z API. W UI wolno tylko formatować i sumować do podsumowania (suma nadpłat, suma wpłat = suma rat + suma nadpłat).

## Stany ekranu
- Przed pierwszym obliczeniem: pusty stan z krótką instrukcją „Uzupełnij parametry i kliknij Policz”.
- Ładowanie: przycisk „Policz” nieaktywny ze spinnerem z CSS (Tailwind `animate-spin`), wynik wyszarzony.
- Wynik gotowy: sekcje poniżej.
- Po zmianie formularza dotychczasowy wynik zostaje, a obok pojawia się dyskretna informacja „Parametry zmienione – kliknij Policz”.

## Wynik
1. Rząd kart z kluczowymi liczbami (duża cyfra i mały podpis):
   - Rata pierwsza (`pozycje[0].rataGr`),
   - Rata ostatnia (ostatnia pozycja, z dopiskiem „rata wyrównująca”),
   - Suma odsetek (`sumaOdsetekGr`),
   - Liczba rat (`pozycje.length`; jeśli jest mniejsza niż wpisana liczba rat, dopisek „skrócono o N rat”),
   - Suma nadpłat, tylko gdy są nadpłaty.

   Dla liczby kontrolnej ekran ma pokazać: rata pierwsza 2 494,72 zł, rata ostatnia 2 492,53 zł.
2. Pasek akcji: przycisk „Eksport CSV” (drugorzędny styl) i licznik „300 pozycji”.
3. Tabela rat, kolumny: Nr | Data | Kapitał | Odsetki | Rata | Nadpłata | Saldo po spłacie | Stopa.
   - Liczby wyrównane do prawej, cyfry o stałej szerokości (`tabular-nums`), zebra na wierszach.
   - Nagłówek przyklejony (sticky), tabela w kontenerze z własnym przewijaniem (max. ok. 70vh), bo wierszy może być 300–600.
   - Wiersz z nadpłatą wyróżniony lekkim tłem akcentu, a kwota nadpłaty pogrubiona. Puste nadpłaty pokazuj jako „–”.
   - Wiersz, w którym zmienia się `stopaRoczna` względem poprzedniego, dostaje mały znacznik przy stopie (np. strzałka ↑/↓ jako tekst), żeby było widać zmianę wskaźnika.
   - Stopa formatowana jako procent z dwoma miejscami: 0.0566 → „5,66 %”.
   - Data w formacie DD.MM.RRRR.
   - Stopka tabeli z sumami kolumn: kapitał, odsetki, rata, nadpłata.

## Formatowanie kwot
Jedna funkcja pomocnicza `formatujZl(grosze: number): string` oparta na `Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` plus sufiks „ zł”. Separator tysięcy to spacja, dwa miejsca po przecinku, np. 2 494,72 zł. Dzielenie przez 100 tylko w tej funkcji.

## Eksport CSV (budowany w przeglądarce, bez bibliotek)
- Tylko z danych `pozycje` zwróconych przez API, wszystkie wiersze.
- Separator pól: średnik; separator dziesiętny: przecinek, bez separatora tysięcy (żeby polski Excel dobrze otworzył plik); na początku BOM `﻿`; kodowanie UTF-8; końce linii `\r\n`.
- Nagłówek: `Nr;Data;Kapitał;Odsetki;Rata;Nadpłata;Saldo po spłacie;Stopa roczna`.
- Kwoty w złotych z dwoma miejscami (np. 2494,72), data YYYY-MM-DD, stopa w procentach (5,66).
- Pobieranie przez `Blob` + `URL.createObjectURL` + tymczasowy `<a download>`, nazwa pliku: `harmonogram-<wskaznik>-<typRat>-<pierwszaRata>.csv`.
- Przycisk nieaktywny, dopóki nie ma wyniku.

## Dostępność i jakość
- Każde pole ma `<label>`, przełączniki są prawdziwymi radio buttonami ostylowanymi jako segmenty, focus jest widoczny.
- Komunikaty błędów powiązane z polami przez `aria-describedby`; region wyniku ma `aria-live="polite"`.
- Kod czytelny: typy zadeklarowane na górze pliku, funkcje pomocnicze (`formatujZl`, `formatujDate`, `zbudujQuery`, `zbudujCsv`) poza komponentem, nazwy zmiennych po polsku bez skrótów (`rataPierwsza`, `sumaOdsetek`, `listaNadplat`).
- Bez localStorage, bez zewnętrznych fontów, bez obrazków.

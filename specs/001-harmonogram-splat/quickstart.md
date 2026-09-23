# Quickstart – walidacja funkcjonalności

Ten dokument opisuje, jak potwierdzić, że cała funkcjonalność z [spec.md](./spec.md)
działa end-to-end. Jest przewodnikiem do uruchamiania, nie zawiera kodu implementacji.

## Warunki wstępne

- Node.js ≥ 22 zainstalowany.
- Repozytorium sklonowane, `npm install` wykonany (zgodnie z [KARTA.md](../../KARTA.md),
  Bramka 0).
- Pliki `dane/polstr-1m.json` i `dane/wibor-3m.json` obecne (nie edytowane).

## Kroki walidacji

### 1. Testy jednostkowe domeny i danych

```
npm test
```

Oczekiwany rezultat:

- Zielony test raty równej na liczbie kontrolnej z [BRIEF.md](../../BRIEF.md):
  400 000 zł, 300 rat, stała stopa 0,0355 + marża 2,11 pp → pierwsza rata
  2 494,72 zł (±0,05 zł), ostatnia rata wyrównująca 2 492,53 zł, suma części
  kapitałowych = 400 000 zł. (US1, SC-001, SC-002).
- Zielony test raty malejącej: stała część kapitałowa, malejące odsetki,
  suma kapitału = kwota kredytu. (US2).
- Zielony test zmiany wskaźnika: seria z jedną zmianą wartości daje inną ratę
  w miesiącu po zmianie. (US3).
- Zielony test nadpłat: w trybie „obniż ratę” ta sama liczba rat i niższa rata
  od miesiąca po nadpłacie; w trybie „skróć okres” krótszy harmonogram, ta sama
  wysokość raty. (US4).
- Zielony test danych: dla daty raty po ostatnim wpisie serii wybieramy ostatnią
  znaną wartość (FR-005).

### 2. Statyczna kontrola typów

```
npm run typecheck
```

Oczekiwany rezultat: `tsc --noEmit` bez błędów, bez ostrzeżeń o `any` czy
`@ts-ignore`.

### 3. Build produkcyjny

```
npm run build
```

Oczekiwany rezultat: `next build` przechodzi. Ten sam build uruchamia Vercel,
więc lokalny sukces = deploy powinien się udać.

### 4. Ręczna walidacja API

Uruchom serwer dev:

```
npm run dev
```

W drugim oknie:

```
curl "http://localhost:3000/api/harmonogram?kwota=40000000&liczbaRat=300&pierwszaRata=2026-10-15&marza=2.11&typRat=rowne&wskaznik=polstr-1m"
```

Oczekiwany rezultat: HTTP 200, JSON zgodny z
[contracts/api-harmonogram.md](./contracts/api-harmonogram.md), pierwsza pozycja
z ratą w okolicy liczby kontrolnej dla danych z pliku (nie stałej – wartość
w pliku to 3,55472 %, więc rata 2 495,85 zł, patrz BRIEF.md).

Sprawdź walidację:

```
curl -i "http://localhost:3000/api/harmonogram?kwota=-1&liczbaRat=300&pierwszaRata=2026-10-15&marza=2.11&typRat=rowne&wskaznik=polstr-1m"
```

Oczekiwany rezultat: HTTP 400 z JSON `{ "blad": "...", "pole": "kwota" }`.

### 5. Ręczna walidacja ekranu

W `http://localhost:3000/`:

1. Wpisz parametry liczby kontrolnej.
2. Kliknij „Policz” – widoczna rata pierwsza, ostatnia, suma odsetek, tabela 300 rat.
3. Kliknij „Eksport CSV” – pobiera się plik CSV zgodny z tabelą.
4. Dodaj nadpłatę 50 000 zł w 12. miesiącu w trybie „obniż ratę”, kliknij „Policz” –
   suma kapitału + nadpłata = kwota kredytu, liczba rat bez zmian.
5. Zmień tryb na „skróć okres”, kliknij „Policz” – harmonogram jest krótszy.

### 6. Środowisko produkcyjne

Po scaleniu ostatniego PR do `main` Vercel automatycznie zbuduje i wystawi wersję
produkcyjną. Powtórz kroki 4 i 5 na adresie produkcyjnym z bota Vercel.

## Powiązanie z historiami użytkownika

Historia | Kroki quickstartu
-------- | ------------------
US1 – rata równa | 1, 4, 5 (rata na liczbie kontrolnej)
US2 – rata malejąca | 1, 5 (przełącznik typRat)
US3 – zmiana wskaźnika | 1 (test dedykowany), 4 (wynik z danych z pliku)
US4 – nadpłaty | 1, 5 (kroki 4–5)
US5 – ekran | 5, 6

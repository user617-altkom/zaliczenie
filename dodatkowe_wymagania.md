## CR-A: Wybór skutku nadpłaty: skrócenie okresu albo obniżenie raty

| Numer | Poziom | Zgłaszający | Data |
|---|---|---|---|
| CR-A | A (łatwa) | Departament Produktów Hipotecznych | 2026-09-23 |

**Treść zgłoszenia.** Kalkulator po nadpłacie zawsze skraca okres kredytowania.
Art. 39 ust. 1 ustawy z 23 marca 2017 r. o kredycie hipotecznym daje konsumentowi prawo
do spłaty całości lub części kredytu przed terminem w każdym czasie, a nasza umowa
pozwala klientowi wybrać sposób rozliczenia nadpłaty: skrócenie okresu przy
niezmienionej racie albo obniżenie raty przy niezmienionym okresie. Doradcy w oddziałach
potrzebują pokazać klientowi oba warianty obok siebie. Prosimy o parametr trybu przy
każdej nadpłacie; domyślny tryb pozostaje bez zmian (skrócenie okresu).

**Kryteria akceptacji.**
1. Każda nadpłata ma tryb: „skróć okres" albo „obniż ratę". Brak trybu oznacza „skróć okres".
2. „Obniż ratę": liczba rat bez zmian, rata przeliczona na pozostałe raty od salda po nadpłacie.
3. „Skróć okres": rata bez zmian, harmonogram kończy się wcześniej, ostatnia rata wyrównująca.
4. W obu trybach suma spłaconego kapitału (raty plus nadpłaty) równa się kwocie kredytu.

**Przypadek testowy.** Kredyt 300 000 zł, 240 rat równych, oprocentowanie 6,66 %
(WIBOR 3M 4,55 % + marża 2,11 pp). Nadpłata 30 000 zł po zaksięgowaniu 1. raty.

| Wielkość | Wartość |
|---|---|
| Rata przed nadpłatą | 2 265,07 zł |
| Saldo po 1. racie i nadpłacie | 269 399,93 zł |
| „Obniż ratę": nowa rata od 2. raty, 240 rat razem | 2 038,11 zł |
| „Skróć okres": rata bez zmian, liczba rat razem | 2 265,07 zł, 196 rat (195 po nadpłacie) |
| „Skróć okres": ostatnia rata wyrównująca | 2 200,53 zł |

**Jak to zrobić procesem.**
1. Czerwony test: dopisz test `nadplata.tryb` z liczbami z karty, `npm test` ma go oblać.
2. Poprawka: najmniejsza zmiana, która zieleni test; reszta testów zielona; konwencję
   „nadpłata po racie miesiąca, odsetki od salda sprzed nadpłaty" wpisz do README.
3. PR: gałąź `cr-a-tryb-nadplaty`, opis PR z odhaczonymi kryteriami 1–4, `gh pr create`.
4. Review Copilota: dodaj Copilota jako reviewera, każdą uwagę zamknij poprawką albo
   krótkim uzasadnieniem odmowy w komentarzu.
5. Merge i tag: `gh pr merge --squash`, `git tag v0.2.0`, `git push --tags`; Vercel wdraża
   main automatycznie, sprawdź adres produkcyjny i wyślij go prowadzącemu mailem.

Źródło: https://lexlege.pl/kredyt-hipot-i-nadzor/art-39/

---

## CR-B: Rekompensata za wcześniejszą spłatę (art. 40)

| Numer | Poziom | Zgłaszający | Data |
|---|---|---|---|
| CR-B | B (średnia) | Departament Produktów Hipotecznych, w uzgodnieniu z Biurem Zgodności | 2026-09-23 |

**Treść zgłoszenia.** Umowy o zmiennej stopie przewidują rekompensatę za spłatę przed
terminem, którą art. 40 ustawy o kredycie hipotecznym ogranicza dwojako: bank może ją
pobrać tylko, gdy spłata nastąpiła w pierwszych 36 miesiącach od zawarcia umowy, a jej
wysokość nie może przekroczyć ani 3 % spłacanej kwoty, ani odsetek, które byłyby
naliczone od tej kwoty w okresie roku od spłaty. Kalkulator ma pokazywać rekompensatę
przy każdej nadpłacie, żeby klient widział pełny koszt decyzji. Rekompensata jest
odrębną opłatą: nie pomniejsza salda ani kwoty nadpłaty.

**Kryteria akceptacji.**
1. Rekompensata = min(3 % nadpłaty, nadpłata × stopa okresu, w którym nastąpiła nadpłata).
2. Naliczana tylko dla nadpłat w miesiącach 1–36 umowy; od 37. miesiąca równa 0.
3. Widoczna jako osobna pozycja w wierszu harmonogramu i w podsumowaniu; saldo i suma
   kapitału bez zmian względem wersji bez rekompensaty.
4. Kredyt o okresowo stałej stopie (inne ograniczenia w art. 40 ust. 5) poza zakresem
   tej zmiany, odnotować w README.

**Przypadek testowy.** Trzy nadpłaty liczone niezależnie (kwota, miesiąc umowy,
oprocentowanie w tym miesiącu):

| Nadpłata | Miesiąc | Stopa | 3 % | Odsetki 12 mies. | Rekompensata |
|---|---|---|---|---|---|
| 50 000 zł | 13 | 6,00 % | 1 500,00 zł | 3 000,00 zł | 1 500,00 zł |
| 20 000 zł | 40 | 6,00 % | 600,00 zł | 1 200,00 zł | 0,00 zł |
| 10 000 zł | 5 | 2,00 % | 300,00 zł | 200,00 zł | 200,00 zł |

Kontrola w harmonogramie: kredyt z CR-A (300 000 zł, 240 rat, 6,66 %), nadpłata
50 000 zł w 13. miesiącu: wiersz 13 pokazuje rekompensatę 1 500,00 zł, suma rekompensat
1 500,00 zł, saldo po wierszu 13 takie samo jak bez rekompensaty.

**Jak to zrobić procesem.**
1. Czerwony test: trzy przypadki z tabeli jako `test.each` plus granica 36/37 miesiąc;
   `npm test` ma je oblać.
2. Poprawka: czysta funkcja `rekompensataArt40(kwota, miesiac, stopa)` i kolumna
   w harmonogramie; zaokrąglenie do grosza raz, na końcu.
3. PR: gałąź `cr-b-rekompensata-art40`, w opisie link do art. 40 i tabela z karty.
4. Review Copilota: czy recenzent wyłapał granicę 36. miesiąca i brak wpływu na saldo;
   jeśli nie, dopisz to komentarzem do PR.
5. Merge i tag: `gh pr merge --squash`, `git tag v0.2.0`, `git push --tags`; Vercel wdraża
   main automatycznie, sprawdź adres produkcyjny i wyślij go prowadzącemu mailem.

Źródło: https://sip.lex.pl/akty-prawne/dzu-dziennik-ustaw/kredyt-hipoteczny-oraz-nadzor-nad-posrednikami-kredytu-18594631/art-40

---

## CR-C: Konwersja WIBOR na POLSTR ze spreadem korygującym

| Numer | Poziom | Zgłaszający | Data |
|---|---|---|---|
| CR-C | C (trudna) | Biuro Reformy Wskaźników Referencyjnych | 2026-09-23 |

**Treść zgłoszenia.** Zgodnie z mapą drogową Narodowej Grupy Roboczej przyjętą przez
KNF, po zaprzestaniu opracowywania WIBOR umowy oparte na tym wskaźniku zostaną w 2028 r.
z mocy prawa przeliczone na POLSTR powiększony o spread korygujący, którego wartość
określi rozporządzenie Ministra Finansów. Bank musi pokazać klientom, jak zmieni się
rata istniejącego kredytu w dniu konwersji. Prosimy o możliwość podmiany wskaźnika od
zadanej daty (lub numeru raty) na inny wskaźnik z własną serią wartości i
konfigurowalnym spreadem, bez zmiany salda i liczby rat. Wartość spreadu nie została
opublikowana; do testów przyjęto ilustracyjnie 0,20 pp.

**Kryteria akceptacji.**
1. Konfiguracja konwersji: data lub numer raty, nowy wskaźnik z serią wartości, spread.
2. Od pierwszego okresu odsetkowego zaczynającego się w dniu konwersji lub później stopa
   = nowy wskaźnik + spread + marża; marża i saldo bez zmian, liczba rat bez zmian.
3. Rata równa przeliczona na pozostałe raty od salda w dniu konwersji; rata malejąca
   zachowuje część kapitałową, zmieniają się tylko odsetki.
4. Harmonogram pokazuje, od którego wiersza obowiązuje nowy wskaźnik (kolumna lub znacznik).

**Przypadek testowy.** Kredyt 300 000 zł, 240 rat równych, WIBOR 3M 4,55 % + marża
2,11 pp. Konwersja od 25. raty (okres od 1.10.2028) na POLSTR 3,55 % + spread 0,20 pp
(przyjęty ilustracyjnie) + marża 2,11 pp = 5,86 %.

| Wielkość | Wartość |
|---|---|
| Stopa przed / po konwersji | 6,66 % / 5,86 % |
| Rata przed konwersją (raty 1–24) | 2 265,07 zł |
| Saldo po 24. racie (bez zmian w dniu konwersji) | 284 640,60 zł |
| Rata po konwersji (raty 25–239) | 2 135,68 zł |
| Liczba rat razem / ostatnia wyrównująca | 240 / 2 137,47 zł |
| Suma odsetek bez / z konwersją | 243 615,72 zł / 215 670,35 zł |

**Jak to zrobić procesem.**
1. Czerwony test: tabela powyżej plus test, że saldo w wierszach 24 i 25 łączy się bez
   skoku; `npm test` ma je oblać.
2. Poprawka: wybór wskaźnika i spreadu w jednej funkcji „stopa okresu", bez kopiowania
   pętli harmonogramu; spread jako parametr, nie stała w kodzie.
3. PR: gałąź `cr-c-konwersja-polstr`, w opisie zaznacz, że 0,20 pp to wartość przyjęta.
4. Review Copilota: miesiąc graniczny (rata 24 stara stopa, 25 nowa) i zgodność z testem
   zmiany WIBOR 3M co kwartał.
5. Merge i tag: `gh pr merge --squash`, `git tag v0.2.0`, `git push --tags`; Vercel wdraża
   main automatycznie, sprawdź adres produkcyjny i wyślij go prowadzącemu mailem.

Źródła: https://www.knf.gov.pl/dla_rynku/Wskazniki_referencyjne/aktualnosci?articleId=98941&p_id=18 ,

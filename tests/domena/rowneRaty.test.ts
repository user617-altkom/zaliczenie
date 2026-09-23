import { describe, expect, it } from 'vitest';
import { policzHarmonogram, type ParametryKredytu } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

// Liczba kontrolna z BRIEF.md:
// kwota 400 000 zł, 300 rat równych, POLSTR 1M 3,55 % (seria stała) + marża 2,11 pp
// → oprocentowanie 5,66 % rocznie, rata równa 2 494,72 zł (±0,05 zł),
// ostatnia rata wyrównująca 2 492,53 zł.
describe('rata równa – liczba kontrolna z BRIEF.md', () => {
  const parametry: ParametryKredytu = {
    kwotaGr: 40_000_000,
    liczbaRat: 300,
    marza: 0.0211,
    typRat: 'rowne',
    wskaznik: 'POLSTR_1M',
    pierwszaRata: '2026-10-15',
  };
  const seriaStala: WpisSerii[] = [{ od: '2026-01-01', stopa: 0.0355 }];

  const harmonogram = policzHarmonogram(parametry, seriaStala);

  it('zwraca dokładnie tyle pozycji, ile jest rat', () => {
    expect(harmonogram.pozycje.length).toBe(300);
  });

  it('pierwsza rata mieści się w tolerancji 2 494,72 zł ±0,05 zł', () => {
    const pierwsza = harmonogram.pozycje[0]!;
    expect(pierwsza.rataGr).toBeGreaterThanOrEqual(249467);
    expect(pierwsza.rataGr).toBeLessThanOrEqual(249477);
  });

  it('ostatnia rata to rata wyrównująca 2 492,53 zł (tolerancja ±0,05 zł)', () => {
    const ostatnia = harmonogram.pozycje[299]!;
    expect(ostatnia.rataGr).toBeGreaterThanOrEqual(249248);
    expect(ostatnia.rataGr).toBeLessThanOrEqual(249258);
  });

  it('suma części kapitałowych równa kwocie kredytu (SC-002)', () => {
    const sumaKapitalu = harmonogram.pozycje.reduce((acc, p) => acc + p.kapitalGr, 0);
    expect(sumaKapitalu).toBe(40_000_000);
  });

  it('saldo po ostatniej racie wynosi 0', () => {
    expect(harmonogram.pozycje[299]!.saldoPoGr).toBe(0);
  });

  it('sumaOdsetekGr jest sumą pól odsetkiGr wszystkich pozycji', () => {
    const suma = harmonogram.pozycje.reduce((acc, p) => acc + p.odsetkiGr, 0);
    expect(harmonogram.sumaOdsetekGr).toBe(suma);
  });

  it('każda pozycja ma zapisaną zastosowaną stopę roczną', () => {
    for (const pozycja of harmonogram.pozycje) {
      expect(pozycja.stopaRoczna).toBeCloseTo(0.0566, 10);
    }
  });

  it('data pierwszej raty jest równa parametrowi pierwszaRata', () => {
    expect(harmonogram.pozycje[0]!.data).toBe('2026-10-15');
  });
});

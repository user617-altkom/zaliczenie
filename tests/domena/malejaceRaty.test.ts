import { describe, expect, it } from 'vitest';
import { policzHarmonogram, type ParametryKredytu } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

// US2: rata malejąca dla stałej stopy 3,55 % + marża 2,11 pp (POLSTR 1M),
// kwota 400 000 zł, 300 rat. Sprawdzamy niezmienniki:
// – stała część kapitałowa (poza ratą wyrównującą),
// – malejąca wysokość raty,
// – suma części kapitałowych = kwota kredytu (SC-002),
// – saldo końcowe = 0.
describe('rata malejąca – niezmienniki', () => {
  const parametry: ParametryKredytu = {
    kwotaGr: 40_000_000,
    liczbaRat: 300,
    marza: 0.0211,
    typRat: 'malejace',
    wskaznik: 'POLSTR_1M',
    pierwszaRata: '2026-10-15',
  };
  const seriaStala: WpisSerii[] = [{ od: '2026-01-01', stopa: 0.0355 }];

  const harmonogram = policzHarmonogram(parametry, seriaStala);

  it('zwraca dokładnie tyle pozycji, ile jest rat', () => {
    expect(harmonogram.pozycje.length).toBe(300);
  });

  it('kapitał raty 1 równy kapitałowi raty 2 (T010)', () => {
    expect(harmonogram.pozycje[1]!.kapitalGr).toBe(harmonogram.pozycje[0]!.kapitalGr);
  });

  it('części kapitałowe rat regularnych różnią się co najwyżej o 1 gr (efekt zaokrągleń, D5)', () => {
    const kapital0 = harmonogram.pozycje[0]!.kapitalGr;
    for (let i = 1; i < 299; i += 1) {
      const roznica = Math.abs(harmonogram.pozycje[i]!.kapitalGr - kapital0);
      expect(roznica).toBeLessThanOrEqual(1);
    }
  });

  it('pierwsza rata jest większa od ostatniej (malejąca)', () => {
    const pierwsza = harmonogram.pozycje[0]!.rataGr;
    const ostatnia = harmonogram.pozycje[299]!.rataGr;
    expect(pierwsza).toBeGreaterThan(ostatnia);
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
});

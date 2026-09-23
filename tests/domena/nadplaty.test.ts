import { describe, expect, it } from 'vitest';
import { policzHarmonogram, type ParametryKredytu } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

const seriaStala: WpisSerii[] = [{ od: '2026-01-01', stopa: 0.0355 }];
const bazoweParametry: ParametryKredytu = {
  kwotaGr: 40_000_000,
  liczbaRat: 300,
  marza: 0.0211,
  typRat: 'rowne',
  wskaznik: 'POLSTR_1M',
  pierwszaRata: '2026-10-15',
};

function sumaKapitaluZNadplat(parametry: ParametryKredytu, nadplaty: NonNullable<ParametryKredytu['nadplaty']>) {
  const harmonogram = policzHarmonogram({ ...parametry, nadplaty }, seriaStala);
  const suma = harmonogram.pozycje.reduce((acc, pozycja) => acc + pozycja.kapitalGr + pozycja.nadplataGr, 0);
  return { harmonogram, suma };
}

describe('nadpłaty', () => {
  it('obniża ratę i pozostawia liczbę rat bez zmian', () => {
    const { harmonogram, suma } = sumaKapitaluZNadplat(bazoweParametry, [
      { miesiac: 12, kwotaGr: 5_000_000, tryb: 'obniz-rate' },
    ]);

    expect(harmonogram.pozycje).toHaveLength(300);
    expect(harmonogram.pozycje[12]!.rataGr).toBeLessThan(harmonogram.pozycje[11]!.rataGr);
    expect(suma).toBe(bazoweParametry.kwotaGr);
  });

  it('skraca okres i utrzymuje zbliżoną wysokość raty po nadpłacie', () => {
    const { harmonogram, suma } = sumaKapitaluZNadplat(bazoweParametry, [
      { miesiac: 12, kwotaGr: 5_000_000, tryb: 'skroc-okres' },
    ]);

    expect(harmonogram.pozycje.length).toBeLessThan(bazoweParametry.liczbaRat);
    expect(harmonogram.pozycje[12]!.rataGr).toBeCloseTo(harmonogram.pozycje[11]!.rataGr, -2);
    expect(suma).toBe(bazoweParametry.kwotaGr);
  });

  it('przycina nadpłatę większą od salda i kończy saldo na zero', () => {
    const { harmonogram, suma } = sumaKapitaluZNadplat(
      { ...bazoweParametry, liczbaRat: 12 },
      [{ miesiac: 12, kwotaGr: 39_000_000, tryb: 'skroc-okres' }],
    );

    expect(harmonogram.pozycje.at(-1)!.saldoPoGr).toBe(0);
    expect(suma).toBe(bazoweParametry.kwotaGr);
  });
});

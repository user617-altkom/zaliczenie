import { describe, expect, it } from 'vitest';
import { policzHarmonogram, type ParametryKredytu } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

const bazoweParametry: ParametryKredytu = {
  kwotaGr: 40_000_000,
  liczbaRat: 300,
  marza: 0.0211,
  typRat: 'rowne',
  wskaznik: 'POLSTR_1M',
  pierwszaRata: '2026-10-15',
};

describe('zmiana wskaźnika w trakcie spłaty', () => {
  it('stosuje wpis obowiązujący w dniu raty i przelicza ratę', () => {
    const seria: WpisSerii[] = [
      { od: '2026-01-01', stopa: 0.03 },
      { od: '2027-01-01', stopa: 0.05 },
    ];
    const harmonogram = policzHarmonogram(bazoweParametry, seria);
    const przedZmiana = harmonogram.pozycje.filter((pozycja) => pozycja.data < '2027-01-01');
    const poZmianie = harmonogram.pozycje.filter((pozycja) => pozycja.data >= '2027-01-01');

    expect(przedZmiana.length).toBeGreaterThan(0);
    expect(poZmianie.length).toBeGreaterThan(0);
    expect(przedZmiana.every((pozycja) => pozycja.stopaRoczna === 0.0511)).toBe(true);
    expect(poZmianie.every((pozycja) => pozycja.stopaRoczna === 0.0711)).toBe(true);
    expect(poZmianie[0]!.rataGr).not.toBe(przedZmiana[0]!.rataGr);
  });

  it('dla WIBOR 3M utrzymuje stopę w kwartale i zmienia ją od kolejnej raty', () => {
    const parametry: ParametryKredytu = {
      ...bazoweParametry,
      wskaznik: 'WIBOR_3M',
      pierwszaRata: '2026-01-15',
      liczbaRat: 12,
    };
    const seria: WpisSerii[] = [
      { od: '2025-12-01', stopa: 0.04 },
      { od: '2026-04-01', stopa: 0.06 },
    ];
    const harmonogram = policzHarmonogram(parametry, seria);

    expect(harmonogram.pozycje.slice(0, 3).every((pozycja) => pozycja.stopaRoczna === 0.0611)).toBe(true);
    expect(harmonogram.pozycje.slice(3).every((pozycja) => pozycja.stopaRoczna === 0.0811)).toBe(true);
  });
});

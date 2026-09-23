import { describe, expect, it } from 'vitest';
import { policzHarmonogram, stopaNaOkres } from '../../src/domena/harmonogram';
import { seriaWskaznika } from '../../src/dane/wskazniki';

describe('konwersja wskaźnika', () => {
  it('stosuje spread i nowy wskaźnik od wskazanego momentu', () => {
    const seriaWibor = seriaWskaznika('WIBOR_3M');

    expect(stopaNaOkres(seriaWibor, '2028-09-15', 0.0211, {
      data: '2028-10-15',
      wskaznik: 'POLSTR_1M',
      spreadPp: 0.002,
    })).toBeCloseTo(0.0591, 10);

    expect(stopaNaOkres(seriaWibor, '2028-10-15', 0.0211, {
      data: '2028-10-15',
      wskaznik: 'POLSTR_1M',
      spreadPp: 0.002,
    })).toBeCloseTo(0.0586472, 10);
  });

  it('nie zmienia salda w dniu konwersji i od raty 25 zmienia wysokość raty', () => {
    const parametry = {
      kwotaGr: 300_000_000,
      liczbaRat: 240,
      marza: 0.0211,
      typRat: 'rowne' as const,
      wskaznik: 'WIBOR_3M' as const,
      pierwszaRata: '2026-10-15',
      konwersja: {
        numerRaty: 25,
        wskaznik: 'POLSTR_1M' as const,
        spreadPp: 0.002,
      },
    };

    const bezKonwersji = policzHarmonogram({ ...parametry, konwersja: undefined }, seriaWskaznika('WIBOR_3M'));
    const zKonwersja = policzHarmonogram(parametry, seriaWskaznika('WIBOR_3M'));

    expect(zKonwersja.pozycje[23]!.saldoPoGr).toBe(bezKonwersji.pozycje[23]!.saldoPoGr);
    expect(zKonwersja.pozycje[24]!.rataGr).toBeLessThan(zKonwersja.pozycje[23]!.rataGr);
    expect(zKonwersja.pozycje[24]!.stopaRoczna).toBeLessThan(zKonwersja.pozycje[23]!.stopaRoczna);
    expect(zKonwersja.pozycje[24]!.stopaRoczna).toBeCloseTo(0.0586472, 5);
  });
});

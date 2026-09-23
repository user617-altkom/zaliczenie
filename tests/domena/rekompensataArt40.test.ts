import { describe, expect, it } from 'vitest';
import { policzHarmonogram, rekompensataArt40, type ParametryKredytu } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

const seria: WpisSerii[] = [{ od: '2026-01-01', stopa: 0.06 }];

describe('rekompensataArt40', () => {
  it.each([
    { kwotaGr: 5_000_000, miesiac: 13, stopaRoczna: 0.06, oczekiwane: 150_000 },
    { kwotaGr: 20_000_000, miesiac: 40, stopaRoczna: 0.06, oczekiwane: 0 },
    { kwotaGr: 1_000_000, miesiac: 5, stopaRoczna: 0.02, oczekiwane: 20_000 },
  ])('liczy rekompensatę dla $miesiac. miesiąca umowy', ({ kwotaGr, miesiac, stopaRoczna, oczekiwane }) => {
    expect(rekompensataArt40(kwotaGr, miesiac, stopaRoczna)).toBe(oczekiwane);
  });

  it('nie zmienia salda po nadpłacie i pokazuje sumę rekompensat w harmonogramie', () => {
    const parametry: ParametryKredytu = {
      kwotaGr: 300_000_000,
      liczbaRat: 240,
      marza: 0.0211,
      typRat: 'rowne',
      wskaznik: 'WIBOR_3M',
      pierwszaRata: '2026-10-15',
      nadplaty: [{ miesiac: 13, kwotaGr: 5_000_000, tryb: 'skroc-okres' }],
    };

    const bezRekompensaty = policzHarmonogram({ ...parametry, nadplaty: [{ miesiac: 13, kwotaGr: 5_000_000, tryb: 'skroc-okres' }] }, seria);
    const zRekompensata = policzHarmonogram(parametry, seria);

    expect(zRekompensata.pozycje[12]!.rekompensataGr).toBe(150_000);
    expect(zRekompensata.sumaRekompensatGr).toBe(150_000);
    expect(zRekompensata.pozycje[12]!.saldoPoGr).toBe(bezRekompensaty.pozycje[12]!.saldoPoGr);
  });
});

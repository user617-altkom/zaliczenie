import { describe, expect, it } from 'vitest';
import { seriaWskaznika, walidujSerie } from '../../src/dane/wskazniki';

describe('src/dane/wskazniki', () => {
  it.each(['POLSTR_1M', 'WIBOR_3M'] as const)(
    '%s: seria niepusta, rosnąca po dacie, stopy w (0, 1)',
    (wskaznik) => {
      const seria = seriaWskaznika(wskaznik);
      expect(seria.length).toBeGreaterThan(0);
      for (const wpis of seria) {
        expect(wpis.od).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(wpis.stopa).toBeGreaterThan(0);
        expect(wpis.stopa).toBeLessThan(1);
      }
      const daty = seria.map((wpis) => wpis.od);
      expect([...daty].sort()).toEqual(daty);
    },
  );

  it('walidujSerie odrzuca duplikat daty', () => {
    expect(() =>
      walidujSerie('TEST', [
        { od: '2026-01-01', stopa: 0.03 },
        { od: '2026-01-01', stopa: 0.04 },
      ]),
    ).toThrow(/duplikat|nieposortowane/);
  });

  it('walidujSerie odrzuca kolejność malejącą', () => {
    expect(() =>
      walidujSerie('TEST', [
        { od: '2026-02-01', stopa: 0.03 },
        { od: '2026-01-01', stopa: 0.04 },
      ]),
    ).toThrow(/nieposortowane/);
  });

  it('walidujSerie odrzuca pustą tablicę', () => {
    expect(() => walidujSerie('TEST', [])).toThrow(/brak wpisów/);
  });

  it('walidujSerie odrzuca stopę spoza zakresu', () => {
    expect(() => walidujSerie('TEST', [{ od: '2026-01-01', stopa: 1.5 }])).toThrow(/stopa/);
  });
});

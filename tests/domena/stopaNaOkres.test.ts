import { describe, expect, it } from 'vitest';
import { nastepnaDataRaty, stopaNaOkres } from '../../src/domena/harmonogram';
import type { WpisSerii } from '../../src/dane/wskazniki';

const seriaTestowa: WpisSerii[] = [
  { od: '2026-01-01', stopa: 0.03 },
  { od: '2026-06-01', stopa: 0.04 },
  { od: '2027-01-01', stopa: 0.05 },
];

describe('stopaNaOkres', () => {
  it('data raty przed pierwszym wpisem → wartość pierwszego wpisu (fallback)', () => {
    expect(stopaNaOkres(seriaTestowa, '2025-12-15', 0.02)).toBeCloseTo(0.03 + 0.02, 10);
  });

  it('data raty po ostatnim wpisie → ostatnia znana wartość (FR-005)', () => {
    expect(stopaNaOkres(seriaTestowa, '2030-06-15', 0.02)).toBeCloseTo(0.05 + 0.02, 10);
  });

  it('data raty między wpisami → największy wpis z od ≤ dataRaty (FR-004)', () => {
    expect(stopaNaOkres(seriaTestowa, '2026-05-31', 0.0)).toBeCloseTo(0.03, 10);
    expect(stopaNaOkres(seriaTestowa, '2026-06-01', 0.0)).toBeCloseTo(0.04, 10);
    expect(stopaNaOkres(seriaTestowa, '2026-12-31', 0.0)).toBeCloseTo(0.04, 10);
    expect(stopaNaOkres(seriaTestowa, '2027-01-01', 0.0)).toBeCloseTo(0.05, 10);
  });

  it('marża dodawana do wartości wskaźnika', () => {
    expect(stopaNaOkres(seriaTestowa, '2026-06-15', 0.0211)).toBeCloseTo(0.04 + 0.0211, 10);
  });

  it('pusta seria → rzuca błąd', () => {
    expect(() => stopaNaOkres([], '2026-01-01', 0.02)).toThrow(/pusta/);
  });
});

describe('nastepnaDataRaty', () => {
  it('offset 0 zwraca datę pierwszej raty', () => {
    expect(nastepnaDataRaty('2026-10-15', 0)).toBe('2026-10-15');
  });

  it('offset 1 dodaje jeden miesiąc kalendarzowo', () => {
    expect(nastepnaDataRaty('2026-10-15', 1)).toBe('2026-11-15');
  });

  it('offset 299 daje datę 25 lat później', () => {
    expect(nastepnaDataRaty('2026-10-15', 299)).toBe('2051-09-15');
  });

  it('korekta końca miesiąca (31 stycznia + 1 → 28 lutego)', () => {
    expect(nastepnaDataRaty('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('rok przestępny: 31 stycznia 2028 + 1 → 29 lutego', () => {
    expect(nastepnaDataRaty('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('nieprawidłowy format daty → rzuca błąd', () => {
    expect(() => nastepnaDataRaty('2026-13-01', 0)).toThrow(/nieprawidłowa/);
  });
});

import polstr1m from '../../dane/polstr-1m.json';
import wibor3m from '../../dane/wibor-3m.json';
import type { KodWskaznika } from '../domena/harmonogram';

/** Jeden wpis serii wskaźnika: wartość obowiązuje od dnia `od` do dnia przed kolejnym wpisem. */
export interface WpisSerii {
  /** Dzień, od którego obowiązuje wartość, YYYY-MM-DD. */
  od: string;
  /** Stopa jako ułamek roczny, np. 0.0355 dla 3,55 %. */
  stopa: number;
}

interface PlikSerii {
  wartosci: WpisSerii[];
}

const SERIE: Record<KodWskaznika, WpisSerii[]> = {
  POLSTR_1M: walidujSerie('POLSTR_1M', (polstr1m as PlikSerii).wartosci),
  WIBOR_3M: walidujSerie('WIBOR_3M', (wibor3m as PlikSerii).wartosci),
};

/** Seria wartości wskaźnika z dane/*.json, uporządkowana rosnąco po dacie. */
export function seriaWskaznika(wskaznik: KodWskaznika): WpisSerii[] {
  return SERIE[wskaznik];
}

/**
 * Waliduje kształt serii wczytanej z pliku JSON:
 * niepusta, wpisy w porządku rosnącym po dacie, bez duplikatów daty,
 * stopa w rozsądnym zakresie (0, 1).
 * Wywoływana raz przy inicjalizacji modułu; łapie błędne dane statycznie.
 */
export function walidujSerie(kod: string, wpisy: unknown): WpisSerii[] {
  if (!Array.isArray(wpisy) || wpisy.length === 0) {
    throw new Error(`seria ${kod}: brak wpisów`);
  }
  const wynik: WpisSerii[] = [];
  let poprzedniaData: string | null = null;
  for (const [indeks, surowy] of wpisy.entries()) {
    if (typeof surowy !== 'object' || surowy === null) {
      throw new Error(`seria ${kod}[${indeks}]: wpis nie jest obiektem`);
    }
    const wpis = surowy as { od?: unknown; stopa?: unknown };
    if (typeof wpis.od !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wpis.od)) {
      throw new Error(`seria ${kod}[${indeks}]: pole "od" nie jest datą YYYY-MM-DD`);
    }
    if (typeof wpis.stopa !== 'number' || !Number.isFinite(wpis.stopa) || wpis.stopa <= 0 || wpis.stopa >= 1) {
      throw new Error(`seria ${kod}[${indeks}]: pole "stopa" musi być w przedziale (0, 1)`);
    }
    if (poprzedniaData !== null && wpis.od <= poprzedniaData) {
      throw new Error(`seria ${kod}[${indeks}]: daty nieposortowane lub duplikat (${wpis.od} po ${poprzedniaData})`);
    }
    wynik.push({ od: wpis.od, stopa: wpis.stopa });
    poprzedniaData = wpis.od;
  }
  return wynik;
}

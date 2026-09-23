import { NextResponse } from 'next/server';
import { policzHarmonogram, type KodWskaznika, type Nadplata, type ParametryKredytu, type TrybNadplaty, type TypRat } from '../../../src/domena/harmonogram';
import { seriaWskaznika } from '../../../src/dane/wskazniki';

const PRZYKLAD =
  '/api/harmonogram?kwota=40000000&liczbaRat=300&pierwszaRata=2026-10-15&marza=2.11&typRat=rowne&wskaznik=polstr-1m';

interface BladParsowania {
  blad: string;
  pole: string;
}

function blad(pole: string, komunikat: string): BladParsowania {
  return { blad: komunikat, pole };
}

function parsujParametry(szukane: URLSearchParams): ParametryKredytu | BladParsowania {
  const kwota = Number(szukane.get('kwota'));
  const liczbaRat = Number(szukane.get('liczbaRat'));
  const marza = Number(szukane.get('marza'));
  const pierwszaRata = szukane.get('pierwszaRata');
  const typRat = szukane.get('typRat');
  const wskaznik = szukane.get('wskaznik');
  const konwersjaData = szukane.get('konwersjaData') ?? szukane.get('dataKonwersji');
  const konwersjaRata = szukane.get('konwersjaRata') ?? szukane.get('rataKonwersji');
  const konwersjaWskaznik = szukane.get('konwersjaWskaznik') ?? szukane.get('wskaznikPoKonwersji');
  const spread = szukane.get('spread') ?? szukane.get('spreadKorygujacy') ?? szukane.get('spreadPp');

  if (!Number.isInteger(kwota) || kwota <= 0) return blad('kwota', 'kwota musi być dodatnią liczbą całkowitą groszy');
  if (!Number.isInteger(liczbaRat) || liczbaRat <= 0) return blad('liczbaRat', 'liczbaRat musi być dodatnią liczbą całkowitą');
  if (!Number.isFinite(marza) || marza < 0) return blad('marza', 'marza musi być nieujemną liczbą punktów procentowych');
  if (typRat !== 'rowne' && typRat !== 'malejace') return blad('typRat', 'typRat musi mieć wartość rowne albo malejace');
  if (wskaznik !== 'polstr-1m' && wskaznik !== 'wibor-3m') return blad('wskaznik', 'wskaznik musi mieć wartość polstr-1m albo wibor-3m');
  if (pierwszaRata === null || !prawidlowaData(pierwszaRata)) return blad('pierwszaRata', 'pierwszaRata musi mieć format YYYY-MM-DD');

  const nadplatyResult = parsujNadplaty(szukane.getAll('nadplata'), liczbaRat);
  if ('blad' in nadplatyResult) return nadplatyResult;

  let konwersja: ParametryKredytu['konwersja'] | undefined = undefined;
  if (konwersjaData || konwersjaRata || konwersjaWskaznik || spread) {
    if (!konwersjaWskaznik || !((konwersjaData !== null && prawidlowaData(konwersjaData)) || konwersjaRata !== null) || spread === null) {
      return blad('konwersja', 'konwersja wymaga: konwersjaData lub konwersjaRata, konwersjaWskaznik i spread');
    }
    const spreadValue = Number(spread);
    if (!Number.isFinite(spreadValue) || spreadValue < 0) {
      return blad('konwersja', 'spread musi być nieujemną liczbą punktów procentowych');
    }
    const wlaczona = konwersjaData !== null ? { data: konwersjaData } : { numerRaty: Number(konwersjaRata) };
    konwersja = {
      ...wlaczona,
      wskaznik: mapujWskaznik(konwersjaWskaznik),
      spreadPp: spreadValue / 100,
    };
  }

  return {
    kwotaGr: kwota,
    liczbaRat,
    marza: marza / 100,
    wskaznik: mapujWskaznik(wskaznik),
    typRat: typRat as TypRat,
    pierwszaRata,
    nadplaty: nadplatyResult,
    konwersja,
  };
}

function prawidlowaData(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const czesci = data.split('-').map(Number);
  const rok = czesci[0];
  const miesiac = czesci[1];
  const dzien = czesci[2];
  if (rok === undefined || miesiac === undefined || dzien === undefined) return false;
  const dataUtc = new Date(Date.UTC(rok, miesiac - 1, dzien));
  return dataUtc.getUTCFullYear() === rok && dataUtc.getUTCMonth() === miesiac - 1 && dataUtc.getUTCDate() === dzien;
}

function mapujWskaznik(wskaznik: string): KodWskaznika {
  return wskaznik === 'polstr-1m' ? 'POLSTR_1M' : 'WIBOR_3M';
}

function parsujNadplaty(wartosci: string[], liczbaRat: number): Nadplata[] | BladParsowania {
  const nadplaty: Nadplata[] = [];
  for (const wartosc of wartosci) {
    const czesci = wartosc.split(':');
    if (czesci.length !== 2 && czesci.length !== 3) {
      return blad('nadplata', 'nadplata musi mieć format miesiac:kwotaGr albo miesiac:kwotaGr:tryb');
    }
    const miesiac = Number(czesci[0]);
    const kwotaGr = Number(czesci[1]);
    const tryb = czesci.length === 3 ? czesci[2] : 'skroc-okres';
    if (!Number.isInteger(miesiac) || miesiac < 1 || miesiac > liczbaRat) {
      return blad('nadplata', `miesiac nadplaty musi należeć do zakresu 1..${liczbaRat}`);
    }
    if (!Number.isInteger(kwotaGr) || kwotaGr <= 0) return blad('nadplata', 'kwotaGr nadplaty musi być dodatnią liczbą całkowitą');
    if (tryb !== 'obniz-rate' && tryb !== 'skroc-okres') return blad('nadplata', 'tryb nadplaty musi mieć wartość obniz-rate albo skroc-okres');
    nadplaty.push({ miesiac, kwotaGr, tryb: tryb as TrybNadplaty });
  }
  return nadplaty;
}

export function GET(request: Request) {
  const parametry = parsujParametry(new URL(request.url).searchParams);
  if ('blad' in parametry) {
    return NextResponse.json(parametry, { status: 400 });
  }

  try {
    const harmonogram = policzHarmonogram(parametry, seriaWskaznika(parametry.wskaznik));
    return NextResponse.json(harmonogram);
  } catch (bladWewnetrzny) {
    const komunikat = bladWewnetrzny instanceof Error ? bladWewnetrzny.message : String(bladWewnetrzny);
    const jestBledemNadplaty = komunikat.startsWith('nadplata') || komunikat.includes('nadpłat');
    return NextResponse.json(
      jestBledemNadplaty ? { blad: komunikat, pole: 'nadplata' } : { blad: komunikat, zrodlo: 'dane' },
      { status: jestBledemNadplaty ? 400 : 500 },
    );
  }
}

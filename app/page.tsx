'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';

// Ekran kalkulatora według designu Broadsheet (frontend/HarmonogramKalkulator.jsx)
// i kontraktu z specs/001-harmonogram-splat/contracts/api-harmonogram.md.
// Komponent nie liczy rat: wszystkie kwoty przychodzą z /api/harmonogram w groszach.

type TypRat = 'rowne' | 'malejace';
type Wskaznik = 'polstr-1m' | 'wibor-3m';
type TrybNadplaty = 'obniz-rate' | 'skroc-okres';
type PoleFormularza =
  | 'kwota'
  | 'liczbaRat'
  | 'pierwszaRata'
  | 'marza'
  | 'typRat'
  | 'wskaznik'
  | 'nadplata'
  | 'konwersjaData'
  | 'konwersjaRata'
  | 'konwersjaWskaznik'
  | 'spread'
  | 'konwersja';

interface Formularz {
  kwota: string;
  liczbaRat: string;
  pierwszaRata: string;
  marza: string;
  wskaznik: Wskaznik;
  typRat: TypRat;
  konwersjaAktywna: boolean;
  konwersjaData: string;
  konwersjaRata: string;
  konwersjaWskaznik: Wskaznik;
  spread: string;
}

interface NadplataFormularza {
  identyfikator: number;
  miesiac: string;
  kwota: string;
  tryb: TrybNadplaty;
}

interface PozycjaHarmonogramu {
  numer: number;
  data: string;
  kapitalGr: number;
  odsetkiGr: number;
  rataGr: number;
  nadplataGr: number;
  saldoPoGr: number;
  stopaRoczna: number;
}

interface Harmonogram {
  pozycje: PozycjaHarmonogramu[];
  sumaOdsetekGr: number;
}

interface OdpowiedzBledu {
  blad: string;
  pole?: string;
  zrodlo?: string;
}

type BladEkranu =
  | { rodzaj: 'formularz' }
  | { rodzaj: 'walidacja'; komunikat: string }
  | { rodzaj: 'dane'; komunikat: string }
  | { rodzaj: 'siec' };

interface BledyFormularza {
  pola: Partial<Record<PoleFormularza, string>>;
  nadplaty: Record<number, string>;
}

interface Wynik {
  harmonogram: Harmonogram;
  migawkaParametrow: string;
  liczbaRatWpisana: number;
  wskaznik: Wskaznik;
  typRat: TypRat;
  pierwszaRata: string;
}

interface OpcjaPrzelacznika<T extends string> {
  wartosc: T;
  etykieta: string;
}

const FORMULARZ_POCZATKOWY: Formularz = {
  kwota: '400 000',
  liczbaRat: '300',
  pierwszaRata: '2026-10-15',
  marza: '2,11',
  wskaznik: 'polstr-1m',
  typRat: 'rowne',
  konwersjaAktywna: false,
  konwersjaData: '2028-10-15',
  konwersjaRata: '25',
  konwersjaWskaznik: 'polstr-1m',
  spread: '0,20',
};

const BRAK_BLEDOW: BledyFormularza = { pola: {}, nadplaty: {} };

const POLA_FORMULARZA: readonly PoleFormularza[] = [
  'kwota',
  'liczbaRat',
  'pierwszaRata',
  'marza',
  'typRat',
  'wskaznik',
  'nadplata',
  'konwersjaData',
  'konwersjaRata',
  'konwersjaWskaznik',
  'spread',
  'konwersja',
];

const OPCJE_WSKAZNIKA: OpcjaPrzelacznika<Wskaznik>[] = [
  { wartosc: 'polstr-1m', etykieta: 'POLSTR 1M' },
  { wartosc: 'wibor-3m', etykieta: 'WIBOR 3M' },
];

const OPCJE_TYPU_RAT: OpcjaPrzelacznika<TypRat>[] = [
  { wartosc: 'rowne', etykieta: 'Raty równe' },
  { wartosc: 'malejace', etykieta: 'Raty malejące' },
];

const OPCJE_TRYBU_NADPLATY: OpcjaPrzelacznika<TrybNadplaty>[] = [
  { wartosc: 'obniz-rate', etykieta: 'Obniż ratę' },
  { wartosc: 'skroc-okres', etykieta: 'Skróć okres' },
];

const formatKwoty = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
});

const formatKwotyCsv = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const obramowanieFokusu =
  'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-akcent';

const klasy = {
  etykieta: 'mb-1.5 block text-sm text-neutral-700',
  pole: `h-11 w-full rounded-md border bg-neutral-100 px-3 tabular-nums text-tusz hover:border-neutral-500 ${obramowanieFokusu}`,
  poleZwykle: 'border-neutral-300',
  poleBledne: 'border-akcent-2-600 bg-akcent-2-100',
  komunikatBledu: 'mt-1.5 text-sm text-akcent-2-700',
  podpowiedz: 'mt-1.5 text-sm text-neutral-600',
  przyciskGlowny: `inline-flex h-11 items-center gap-2 rounded-md bg-akcent px-6 font-semibold text-white hover:bg-akcent-600 active:bg-akcent-700 disabled:cursor-not-allowed disabled:opacity-45 ${obramowanieFokusu}`,
  przyciskDrugorzedny: `h-11 rounded-md border border-akcent px-5 text-akcent-700 hover:bg-akcent-100 active:bg-akcent-200 disabled:cursor-not-allowed disabled:opacity-45 ${obramowanieFokusu}`,
  przyciskDyskretny: `h-11 rounded-md px-3 text-akcent-700 hover:bg-akcent-100 active:bg-akcent-200 ${obramowanieFokusu}`,
  naglowekSekcji: 'mb-5 text-2xl font-semibold',
  komorkaNaglowka: 'px-3 py-3 text-sm font-semibold text-neutral-700',
  komorka: 'px-3 py-2 tabular-nums',
};

/** Jedyne miejsce, w którym grosze zamieniają się na złote. */
function kwotaWZlotych(grosze: number): number {
  return grosze / 100;
}

function formatujZl(grosze: number): string {
  return `${formatKwoty.format(kwotaWZlotych(grosze))} zł`;
}

function formatujStope(stopaRoczna: number): string {
  return `${formatKwoty.format(stopaRoczna * 100)} %`;
}

function formatujDate(data: string): string {
  const [rok, miesiac, dzien] = data.split('-');
  return rok && miesiac && dzien ? `${dzien}.${miesiac}.${rok}` : data;
}

function parsujLiczbe(tekst: string): number {
  const oczyszczony = tekst.replace(/\s/g, '').replace(',', '.');
  return oczyszczony === '' ? Number.NaN : Number(oczyszczony);
}

function naGrosze(tekstZlotych: string): number {
  return Math.round(parsujLiczbe(tekstZlotych) * 100);
}

function opisOkresu(liczbaRat: number): string {
  if (!Number.isInteger(liczbaRat) || liczbaRat <= 0) return '';
  const lata = Math.floor(liczbaRat / 12);
  const miesiace = liczbaRat % 12;
  const czesci: string[] = [];
  if (lata > 0) czesci.push(`${lata} ${odmiana(lata, 'rok', 'lata', 'lat')}`);
  if (miesiace > 0) czesci.push(`${miesiace} ${odmiana(miesiace, 'miesiąc', 'miesiące', 'miesięcy')}`);
  return `= ${czesci.join(' i ')}`;
}

function odmiana(liczba: number, pojedyncza: string, mnogaMala: string, mnogaDuza: string): string {
  if (liczba === 1) return pojedyncza;
  const jednosci = liczba % 10;
  const dziesiatki = liczba % 100;
  return jednosci >= 2 && jednosci <= 4 && (dziesiatki < 12 || dziesiatki > 14) ? mnogaMala : mnogaDuza;
}

function walidujFormularz(formularz: Formularz, listaNadplat: NadplataFormularza[]): BledyFormularza {
  const pola: BledyFormularza['pola'] = {};
  const nadplaty: BledyFormularza['nadplaty'] = {};

  const kwota = parsujLiczbe(formularz.kwota);
  if (!Number.isFinite(kwota) || kwota <= 0) pola.kwota = 'Podaj kwotę kredytu większą od zera.';

  const liczbaRat = parsujLiczbe(formularz.liczbaRat);
  const liczbaRatPoprawna = Number.isInteger(liczbaRat) && liczbaRat > 0;
  if (!liczbaRatPoprawna) pola.liczbaRat = 'Liczba rat musi być dodatnią liczbą całkowitą.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(formularz.pierwszaRata)) pola.pierwszaRata = 'Wybierz datę pierwszej raty.';

  const marza = parsujLiczbe(formularz.marza);
  if (!Number.isFinite(marza) || marza < 0) pola.marza = 'Marża nie może być ujemna.';

  if (formularz.konwersjaAktywna) {
    const spread = parsujLiczbe(formularz.spread);
    if (!Number.isFinite(spread) || spread < 0) {
      pola.spread = 'Spread korygujący nie może być ujemny.';
    }

    if (formularz.konwersjaData && formularz.konwersjaRata) {
      pola.konwersjaRata = 'Wybierz tylko jedną z opcji: data albo numer raty konwersji.';
    }

    if (!formularz.konwersjaData && !formularz.konwersjaRata) {
      pola.konwersjaData = 'Wybierz datę lub numer raty konwersji.';
    } else {
      if (formularz.konwersjaData && !/^\d{4}-\d{2}-\d{2}$/.test(formularz.konwersjaData)) {
        pola.konwersjaData = 'Data konwersji ma nieprawidłowy format.';
      }
      if (formularz.konwersjaRata) {
        const numerRaty = parsujLiczbe(formularz.konwersjaRata);
        if (!Number.isInteger(numerRaty) || numerRaty < 1 || (liczbaRatPoprawna && numerRaty > liczbaRat)) {
          pola.konwersjaRata = liczbaRatPoprawna
            ? `Numer raty musi należeć do zakresu 1–${liczbaRat}.`
            : 'Numer raty musi być dodatnią liczbą całkowitą.';
        }
      }
    }
  }

  const zajeteMiesiace = new Set<number>();
  for (const nadplata of listaNadplat) {
    const miesiac = parsujLiczbe(nadplata.miesiac);
    const kwotaNadplaty = parsujLiczbe(nadplata.kwota);
    if (!Number.isInteger(miesiac) || miesiac < 1 || (liczbaRatPoprawna && miesiac > liczbaRat)) {
      nadplaty[nadplata.identyfikator] = liczbaRatPoprawna
        ? `Miesiąc musi należeć do zakresu 1–${liczbaRat}.`
        : 'Miesiąc musi być dodatnią liczbą całkowitą.';
    } else if (zajeteMiesiace.has(miesiac)) {
      nadplaty[nadplata.identyfikator] = `W miesiącu ${miesiac} jest już nadpłata.`;
    } else if (!Number.isFinite(kwotaNadplaty) || kwotaNadplaty <= 0) {
      nadplaty[nadplata.identyfikator] = 'Kwota nadpłaty musi być większa od zera.';
    }
    if (Number.isInteger(miesiac)) zajeteMiesiace.add(miesiac);
  }

  return { pola, nadplaty };
}

function maBledy(bledy: BledyFormularza): boolean {
  return Object.keys(bledy.pola).length > 0 || Object.keys(bledy.nadplaty).length > 0;
}

function zbudujQuery(formularz: Formularz, listaNadplat: NadplataFormularza[]): URLSearchParams {
  const query = new URLSearchParams({
    kwota: String(naGrosze(formularz.kwota)),
    liczbaRat: String(parsujLiczbe(formularz.liczbaRat)),
    pierwszaRata: formularz.pierwszaRata,
    marza: String(parsujLiczbe(formularz.marza)),
    typRat: formularz.typRat,
    wskaznik: formularz.wskaznik,
  });
  for (const nadplata of listaNadplat) {
    query.append('nadplata', `${parsujLiczbe(nadplata.miesiac)}:${naGrosze(nadplata.kwota)}:${nadplata.tryb}`);
  }

  if (formularz.konwersjaAktywna) {
    if (formularz.konwersjaData) query.set('konwersjaData', formularz.konwersjaData);
    if (formularz.konwersjaRata) query.set('konwersjaRata', formularz.konwersjaRata);
    query.set('konwersjaWskaznik', formularz.konwersjaWskaznik);
    const spread = parsujLiczbe(formularz.spread);
    if (Number.isFinite(spread)) query.set('spread', String(spread));
  }

  return query;
}

function migawka(formularz: Formularz, listaNadplat: NadplataFormularza[]): string {
  return zbudujQuery(formularz, listaNadplat).toString();
}

function zbudujCsv(pozycje: PozycjaHarmonogramu[]): string {
  const kwotaCsv = (grosze: number) => formatKwotyCsv.format(kwotaWZlotych(grosze));
  const naglowek = 'Nr;Data;Kapitał;Odsetki;Rata;Nadpłata;Saldo po spłacie;Stopa roczna';
  const wiersze = pozycje.map((pozycja) =>
    [
      pozycja.numer,
      pozycja.data,
      kwotaCsv(pozycja.kapitalGr),
      kwotaCsv(pozycja.odsetkiGr),
      kwotaCsv(pozycja.rataGr),
      kwotaCsv(pozycja.nadplataGr),
      kwotaCsv(pozycja.saldoPoGr),
      formatKwotyCsv.format(pozycja.stopaRoczna * 100),
    ].join(';'),
  );
  return `﻿${[naglowek, ...wiersze].join('\r\n')}`;
}

function pobierzPlik(tresc: string, nazwaPliku: string) {
  const adres = URL.createObjectURL(new Blob([tresc], { type: 'text/csv;charset=utf-8' }));
  const odnosnik = document.createElement('a');
  odnosnik.href = adres;
  odnosnik.download = nazwaPliku;
  document.body.appendChild(odnosnik);
  odnosnik.click();
  odnosnik.remove();
  URL.revokeObjectURL(adres);
}

function klasaPola(blad: string | undefined, dodatkowe = ''): string {
  return `${klasy.pole} ${blad ? klasy.poleBledne : klasy.poleZwykle} ${dodatkowe}`;
}

function atrybutyBledu(identyfikator: string, blad: string | undefined, podpowiedz?: string) {
  const opisy = [blad ? `${identyfikator}-blad` : null, podpowiedz ? `${identyfikator}-podpowiedz` : null].filter(Boolean);
  return {
    'aria-invalid': blad ? true : undefined,
    'aria-describedby': opisy.length > 0 ? opisy.join(' ') : undefined,
  };
}

function KomunikatBledu({ identyfikator, blad }: { identyfikator: string; blad: string | undefined }) {
  if (!blad) return null;
  return (
    <p id={`${identyfikator}-blad`} className={klasy.komunikatBledu}>
      {blad}
    </p>
  );
}

function Przelacznik<T extends string>({
  nazwa,
  etykieta,
  wartosc,
  opcje,
  onZmiana,
  blad,
  children,
}: {
  nazwa: string;
  etykieta: string;
  wartosc: T;
  opcje: OpcjaPrzelacznika<T>[];
  onZmiana: (wartosc: T) => void;
  blad?: string;
  children?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className={klasy.etykieta}>{etykieta}</legend>
      <div
        className={`inline-flex h-11 overflow-hidden rounded-md border ${blad ? 'border-akcent-2-600' : 'border-neutral-300'}`}
      >
        {opcje.map((opcja, indeks) => (
          <label key={opcja.wartosc} className={`relative flex ${indeks > 0 ? 'border-l border-neutral-300' : ''}`}>
            <input
              type="radio"
              name={nazwa}
              value={opcja.wartosc}
              checked={wartosc === opcja.wartosc}
              onChange={() => onZmiana(opcja.wartosc)}
              className="peer sr-only"
            />
            <span className="flex cursor-pointer items-center bg-neutral-100 px-4 text-sm whitespace-nowrap text-tusz peer-checked:bg-akcent peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-akcent-800 peer-[:not(:checked)]:hover:bg-akcent-100">
              {opcja.etykieta}
            </span>
          </label>
        ))}
      </div>
      {children}
      <KomunikatBledu identyfikator={nazwa} blad={blad} />
    </fieldset>
  );
}

function LiczbaPodsumowania({ etykieta, wartosc, dopisek }: { etykieta: string; wartosc: ReactNode; dopisek?: string }) {
  return (
    <div>
      <dt className="mb-1 text-sm text-neutral-700">{etykieta}</dt>
      <dd className="text-3xl font-semibold tabular-nums">{wartosc}</dd>
      {dopisek && <dd className="mt-1 text-sm text-neutral-600">{dopisek}</dd>}
    </div>
  );
}

function KwotaDuza({ grosze }: { grosze: number }) {
  return (
    <>
      {formatKwoty.format(kwotaWZlotych(grosze))}
      <span className="ml-1.5 text-base font-normal">zł</span>
    </>
  );
}

function ZnacznikZmianyStopy({ stopa, poprzednia }: { stopa: number; poprzednia: number | undefined }) {
  if (poprzednia === undefined || stopa === poprzednia) return null;
  const wzrost = stopa > poprzednia;
  return (
    <span
      className={`mr-1.5 text-xs ${wzrost ? 'text-akcent-2-700' : 'text-akcent-700'}`}
      title={wzrost ? 'Stopa wzrosła' : 'Stopa spadła'}
      aria-label={wzrost ? 'stopa wzrosła' : 'stopa spadła'}
    >
      {wzrost ? '↑' : '↓'}
    </span>
  );
}

export default function Strona() {
  const [formularz, setFormularz] = useState<Formularz>(FORMULARZ_POCZATKOWY);
  const [listaNadplat, setListaNadplat] = useState<NadplataFormularza[]>([]);
  const [bledy, setBledy] = useState<BledyFormularza>(BRAK_BLEDOW);
  const [bladEkranu, setBladEkranu] = useState<BladEkranu | null>(null);
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const kolejnyIdentyfikator = useRef(1);

  function ustawPole<K extends keyof Formularz>(pole: K, wartosc: Formularz[K]) {
    setFormularz((poprzedni) => ({ ...poprzedni, [pole]: wartosc }));
  }

  function zmienNadplate<K extends keyof NadplataFormularza>(identyfikator: number, pole: K, wartosc: NadplataFormularza[K]) {
    setListaNadplat((lista) =>
      lista.map((nadplata) => (nadplata.identyfikator === identyfikator ? { ...nadplata, [pole]: wartosc } : nadplata)),
    );
  }

  function dodajNadplate() {
    const identyfikator = kolejnyIdentyfikator.current++;
    setListaNadplat((lista) => [...lista, { identyfikator, miesiac: '12', kwota: '50 000', tryb: 'obniz-rate' }]);
  }

  function usunNadplate(identyfikator: number) {
    setListaNadplat((lista) => lista.filter((nadplata) => nadplata.identyfikator !== identyfikator));
  }

  async function policz(zdarzenie: FormEvent<HTMLFormElement>) {
    zdarzenie.preventDefault();
    const bledyWalidacji = walidujFormularz(formularz, listaNadplat);
    setBledy(bledyWalidacji);
    if (maBledy(bledyWalidacji)) {
      setBladEkranu({ rodzaj: 'formularz' });
      return;
    }

    setBladEkranu(null);
    setLadowanie(true);
    const query = zbudujQuery(formularz, listaNadplat);
    try {
      const odpowiedz = await fetch(`/api/harmonogram?${query.toString()}`, { headers: { Accept: 'application/json' } });
      const dane: Harmonogram | OdpowiedzBledu = await odpowiedz.json();
      if (!odpowiedz.ok || 'blad' in dane) {
        const bladApi = dane as OdpowiedzBledu;
        if (bladApi.zrodlo === 'dane' || odpowiedz.status >= 500) {
          setBladEkranu({ rodzaj: 'dane', komunikat: bladApi.blad });
        } else {
          setBladEkranu({ rodzaj: 'walidacja', komunikat: bladApi.blad });
          const pole = POLA_FORMULARZA.find((nazwa) => nazwa === bladApi.pole);
          if (pole) setBledy({ pola: { [pole]: bladApi.blad }, nadplaty: {} });
        }
        return;
      }
      setWynik({
        harmonogram: dane,
        migawkaParametrow: query.toString(),
        liczbaRatWpisana: parsujLiczbe(formularz.liczbaRat),
        wskaznik: formularz.wskaznik,
        typRat: formularz.typRat,
        pierwszaRata: formularz.pierwszaRata,
      });
    } catch {
      setBladEkranu({ rodzaj: 'siec' });
    } finally {
      setLadowanie(false);
    }
  }

  function eksportujCsv() {
    if (!wynik) return;
    pobierzPlik(
      zbudujCsv(wynik.harmonogram.pozycje),
      `harmonogram-${wynik.wskaznik}-${wynik.typRat}-${wynik.pierwszaRata}.csv`,
    );
  }

  const pozycje = wynik?.harmonogram.pozycje ?? [];
  const rataPierwsza = pozycje[0];
  const rataOstatnia = pozycje.at(-1);
  const sumaKapitalu = pozycje.reduce((suma, pozycja) => suma + pozycja.kapitalGr, 0);
  const sumaRat = pozycje.reduce((suma, pozycja) => suma + pozycja.rataGr, 0);
  const sumaNadplat = pozycje.reduce((suma, pozycja) => suma + pozycja.nadplataGr, 0);
  const skroconoORat = wynik ? wynik.liczbaRatWpisana - pozycje.length : 0;
  const parametryZmienione = wynik !== null && !ladowanie && migawka(formularz, listaNadplat) !== wynik.migawkaParametrow;
  const opisLiczbyRat = opisOkresu(parsujLiczbe(formularz.liczbaRat));

  return (
    <main className="px-6 py-10 md:px-12 md:py-14">
      <div className="max-w-6xl">
        <h1 className="mb-2 text-4xl leading-tight font-semibold md:text-5xl">Harmonogram spłat na POLSTR</h1>
        <p className="mb-12 max-w-2xl text-neutral-700">
          Wprowadź parametry kredytu o zmiennym oprocentowaniu i planowane nadpłaty, a następnie policz harmonogram rat.
        </p>

        <form onSubmit={policz} noValidate>
          <section className="mb-12" aria-labelledby="naglowek-parametry">
            <h2 id="naglowek-parametry" className={klasy.naglowekSekcji}>
              Parametry kredytu
            </h2>
            <div className="grid max-w-5xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="kwota" className={klasy.etykieta}>
                  Kwota kredytu (zł)
                </label>
                <input
                  id="kwota"
                  inputMode="decimal"
                  required
                  className={klasaPola(bledy.pola.kwota)}
                  value={formularz.kwota}
                  onChange={(zdarzenie) => ustawPole('kwota', zdarzenie.target.value)}
                  {...atrybutyBledu('kwota', bledy.pola.kwota)}
                />
                <KomunikatBledu identyfikator="kwota" blad={bledy.pola.kwota} />
              </div>
              <div>
                <label htmlFor="liczbaRat" className={klasy.etykieta}>
                  Liczba rat
                </label>
                <input
                  id="liczbaRat"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className={klasaPola(bledy.pola.liczbaRat)}
                  value={formularz.liczbaRat}
                  onChange={(zdarzenie) => ustawPole('liczbaRat', zdarzenie.target.value)}
                  {...atrybutyBledu('liczbaRat', bledy.pola.liczbaRat, opisLiczbyRat)}
                />
                {opisLiczbyRat && (
                  <p id="liczbaRat-podpowiedz" className={klasy.podpowiedz}>
                    {opisLiczbyRat}
                  </p>
                )}
                <KomunikatBledu identyfikator="liczbaRat" blad={bledy.pola.liczbaRat} />
              </div>
              <div>
                <label htmlFor="pierwszaRata" className={klasy.etykieta}>
                  Data pierwszej raty
                </label>
                <input
                  id="pierwszaRata"
                  type="date"
                  required
                  className={klasaPola(bledy.pola.pierwszaRata)}
                  value={formularz.pierwszaRata}
                  onChange={(zdarzenie) => ustawPole('pierwszaRata', zdarzenie.target.value)}
                  {...atrybutyBledu('pierwszaRata', bledy.pola.pierwszaRata)}
                />
                <KomunikatBledu identyfikator="pierwszaRata" blad={bledy.pola.pierwszaRata} />
              </div>
              <div>
                <label htmlFor="marza" className="mb-1.5 block text-sm font-semibold text-akcent-700">
                  Marża banku (pp)
                </label>
                <input
                  id="marza"
                  inputMode="decimal"
                  required
                  className={`${klasy.pole} border-2 font-semibold hover:border-akcent-600 ${
                    bledy.pola.marza ? klasy.poleBledne : 'border-akcent bg-akcent-100'
                  }`}
                  value={formularz.marza}
                  onChange={(zdarzenie) => ustawPole('marza', zdarzenie.target.value)}
                  {...atrybutyBledu('marza', bledy.pola.marza)}
                />
                <KomunikatBledu identyfikator="marza" blad={bledy.pola.marza} />
              </div>
              <Przelacznik
                nazwa="wskaznik"
                etykieta="Wskaźnik"
                wartosc={formularz.wskaznik}
                opcje={OPCJE_WSKAZNIKA}
                onZmiana={(wartosc) => ustawPole('wskaznik', wartosc)}
                blad={bledy.pola.wskaznik}
              >
                <p className={klasy.podpowiedz}>POLSTR zmienia się co miesiąc, WIBOR co kwartał.</p>
              </Przelacznik>
              <Przelacznik
                nazwa="typRat"
                etykieta="Typ rat"
                wartosc={formularz.typRat}
                opcje={OPCJE_TYPU_RAT}
                onZmiana={(wartosc) => ustawPole('typRat', wartosc)}
                blad={bledy.pola.typRat}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-3 text-sm font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formularz.konwersjaAktywna}
                    onChange={(zdarzenie) => ustawPole('konwersjaAktywna', zdarzenie.target.checked)}
                    className="size-4 accent-akcent"
                  />
                  Włącz konwersję wskaźnika
                </label>
                <p className="mt-2 text-sm text-neutral-600">
                  Zmień wskaźnik od wybranej daty lub numeru raty, z własnym spreadem korygującym.
                </p>

                {formularz.konwersjaAktywna && (
                  <div className="mt-5 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label htmlFor="konwersjaData" className={klasy.etykieta}>
                        Data konwersji
                      </label>
                      <input
                        id="konwersjaData"
                        type="date"
                        className={klasaPola(bledy.pola.konwersjaData)}
                        value={formularz.konwersjaData}
                        onChange={(zdarzenie) => ustawPole('konwersjaData', zdarzenie.target.value)}
                        {...atrybutyBledu('konwersjaData', bledy.pola.konwersjaData)}
                      />
                      <KomunikatBledu identyfikator="konwersjaData" blad={bledy.pola.konwersjaData} />
                    </div>
                    <div>
                      <label htmlFor="konwersjaRata" className={klasy.etykieta}>
                        Nr raty konwersji
                      </label>
                      <input
                        id="konwersjaRata"
                        type="number"
                        min="1"
                        step="1"
                        className={klasaPola(bledy.pola.konwersjaRata)}
                        value={formularz.konwersjaRata}
                        onChange={(zdarzenie) => ustawPole('konwersjaRata', zdarzenie.target.value)}
                        {...atrybutyBledu('konwersjaRata', bledy.pola.konwersjaRata)}
                      />
                      <KomunikatBledu identyfikator="konwersjaRata" blad={bledy.pola.konwersjaRata} />
                    </div>
                    <div>
                      <label htmlFor="konwersjaWskaznik" className={klasy.etykieta}>
                        Nowy wskaźnik
                      </label>
                      <select
                        id="konwersjaWskaznik"
                        className={klasaPola(bledy.pola.konwersjaWskaznik)}
                        value={formularz.konwersjaWskaznik}
                        onChange={(zdarzenie) => ustawPole('konwersjaWskaznik', zdarzenie.target.value as Wskaznik)}
                        {...atrybutyBledu('konwersjaWskaznik', bledy.pola.konwersjaWskaznik)}
                      >
                        {OPCJE_WSKAZNIKA.map((opcja) => (
                          <option key={opcja.wartosc} value={opcja.wartosc}>
                            {opcja.etykieta}
                          </option>
                        ))}
                      </select>
                      <KomunikatBledu identyfikator="konwersjaWskaznik" blad={bledy.pola.konwersjaWskaznik} />
                    </div>
                    <div>
                      <label htmlFor="spread" className={klasy.etykieta}>
                        Spread korygujący (pp)
                      </label>
                      <input
                        id="spread"
                        inputMode="decimal"
                        className={klasaPola(bledy.pola.spread)}
                        value={formularz.spread}
                        onChange={(zdarzenie) => ustawPole('spread', zdarzenie.target.value)}
                        {...atrybutyBledu('spread', bledy.pola.spread)}
                      />
                      <KomunikatBledu identyfikator="spread" blad={bledy.pola.spread} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mb-12" aria-labelledby="naglowek-nadplaty">
            <h2 id="naglowek-nadplaty" className={klasy.naglowekSekcji}>
              Nadpłaty
            </h2>
            {listaNadplat.length === 0 && (
              <p className="mb-4 text-neutral-700">Brak zaplanowanych nadpłat. Na przykład 50 000 zł w 12. miesiącu.</p>
            )}
            <div className="mb-4 flex max-w-4xl flex-col gap-5">
              {listaNadplat.map((nadplata, indeks) => {
                const blad = bledy.nadplaty[nadplata.identyfikator];
                const przedrostek = `nadplata-${nadplata.identyfikator}`;
                return (
                  <div key={nadplata.identyfikator}>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="w-36">
                        <label htmlFor={`${przedrostek}-miesiac`} className={klasy.etykieta}>
                          Miesiąc (nr raty)
                        </label>
                        <input
                          id={`${przedrostek}-miesiac`}
                          type="number"
                          min="1"
                          step="1"
                          className={klasaPola(blad)}
                          value={nadplata.miesiac}
                          onChange={(zdarzenie) => zmienNadplate(nadplata.identyfikator, 'miesiac', zdarzenie.target.value)}
                          {...atrybutyBledu(przedrostek, blad)}
                        />
                      </div>
                      <div className="w-44">
                        <label htmlFor={`${przedrostek}-kwota`} className={klasy.etykieta}>
                          Kwota (zł)
                        </label>
                        <input
                          id={`${przedrostek}-kwota`}
                          inputMode="decimal"
                          className={klasaPola(blad)}
                          value={nadplata.kwota}
                          onChange={(zdarzenie) => zmienNadplate(nadplata.identyfikator, 'kwota', zdarzenie.target.value)}
                          {...atrybutyBledu(przedrostek, blad)}
                        />
                      </div>
                      <Przelacznik
                        nazwa={`${przedrostek}-tryb`}
                        etykieta="Tryb"
                        wartosc={nadplata.tryb}
                        opcje={OPCJE_TRYBU_NADPLATY}
                        onZmiana={(wartosc) => zmienNadplate(nadplata.identyfikator, 'tryb', wartosc)}
                      />
                      <button
                        type="button"
                        className={klasy.przyciskDyskretny}
                        onClick={() => usunNadplate(nadplata.identyfikator)}
                        aria-label={`Usuń nadpłatę ${indeks + 1}`}
                      >
                        Usuń
                      </button>
                    </div>
                    <KomunikatBledu identyfikator={przedrostek} blad={blad} />
                  </div>
                );
              })}
            </div>
            <button type="button" className={klasy.przyciskDrugorzedny} onClick={dodajNadplate}>
              + Dodaj nadpłatę
            </button>
            <KomunikatBledu identyfikator="nadplata" blad={bledy.pola.nadplata} />
          </section>

          <div className="mb-4 flex flex-wrap items-center gap-4">
            <button type="submit" className={klasy.przyciskGlowny} disabled={ladowanie}>
              {ladowanie && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {ladowanie ? 'Liczę…' : 'Policz'}
            </button>
            {parametryZmienione && (
              <p className="text-sm text-akcent-700">Parametry zmienione – kliknij Policz, aby odświeżyć wynik.</p>
            )}
          </div>
        </form>

        {bladEkranu && (
          <div role="alert" className="mt-6 max-w-3xl border-l-4 border-akcent-2-600 bg-akcent-2-100 px-4 py-3 text-akcent-2-800">
            {bladEkranu.rodzaj === 'formularz' && 'Popraw zaznaczone pola formularza.'}
            {bladEkranu.rodzaj === 'walidacja' && bladEkranu.komunikat}
            {bladEkranu.rodzaj === 'dane' && (
              <>
                <strong className="font-semibold">Błąd danych wskaźników.</strong> {bladEkranu.komunikat}
              </>
            )}
            {bladEkranu.rodzaj === 'siec' && 'Nie udało się połączyć z serwerem.'}
          </div>
        )}
      </div>

      <div aria-live="polite" aria-busy={ladowanie} className={`mt-14 transition-opacity ${ladowanie ? 'opacity-50' : ''}`}>
        {!wynik && <p className="text-neutral-700">Uzupełnij parametry i kliknij Policz.</p>}

        {wynik && rataPierwsza && rataOstatnia && (
          <>
            <section className="mb-12 max-w-6xl" aria-labelledby="naglowek-podsumowanie">
              <h2 id="naglowek-podsumowanie" className={klasy.naglowekSekcji}>
                Podsumowanie
              </h2>
              <dl className="grid max-w-5xl grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <LiczbaPodsumowania etykieta="Rata pierwsza" wartosc={<KwotaDuza grosze={rataPierwsza.rataGr} />} />
                <LiczbaPodsumowania
                  etykieta="Rata ostatnia"
                  wartosc={<KwotaDuza grosze={rataOstatnia.rataGr} />}
                  dopisek="rata wyrównująca"
                />
                <LiczbaPodsumowania etykieta="Suma odsetek" wartosc={<KwotaDuza grosze={wynik.harmonogram.sumaOdsetekGr} />} />
                <LiczbaPodsumowania
                  etykieta="Liczba rat"
                  wartosc={pozycje.length}
                  dopisek={skroconoORat > 0 ? `skrócono o ${skroconoORat} ${odmiana(skroconoORat, 'ratę', 'raty', 'rat')}` : undefined}
                />
                {sumaNadplat > 0 && (
                  <>
                    <LiczbaPodsumowania etykieta="Suma nadpłat" wartosc={<KwotaDuza grosze={sumaNadplat} />} />
                    <LiczbaPodsumowania etykieta="Suma wpłat" wartosc={<KwotaDuza grosze={sumaRat + sumaNadplat} />} dopisek="raty i nadpłaty" />
                  </>
                )}
              </dl>
            </section>

            <section aria-labelledby="naglowek-harmonogram">
              <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <h2 id="naglowek-harmonogram" className="text-2xl font-semibold">
                  Harmonogram
                </h2>
                <button type="button" className={klasy.przyciskDrugorzedny} onClick={eksportujCsv}>
                  Eksport CSV
                </button>
                <span className="text-sm text-neutral-700">
                  {pozycje.length} {odmiana(pozycje.length, 'pozycja', 'pozycje', 'pozycji')}
                </span>
              </div>

              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[56rem] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-papier">
                    <tr className="border-b-2 border-tusz">
                      <th className={klasy.komorkaNaglowka}>Nr</th>
                      <th className={klasy.komorkaNaglowka}>Data</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Kapitał</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Odsetki</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Rata</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Nadpłata</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Saldo po spłacie</th>
                      <th className={`${klasy.komorkaNaglowka} text-right`}>Stopa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pozycje.map((pozycja, indeks) => (
                      <tr
                        key={pozycja.numer}
                        className={`border-b border-neutral-200 hover:bg-akcent-200 ${
                          pozycja.nadplataGr > 0 ? 'bg-akcent-100' : 'even:bg-neutral-100'
                        }`}
                      >
                        <td className={klasy.komorka}>{pozycja.numer}</td>
                        <td className={klasy.komorka}>{formatujDate(pozycja.data)}</td>
                        <td className={`${klasy.komorka} text-right`}>{formatujZl(pozycja.kapitalGr)}</td>
                        <td className={`${klasy.komorka} text-right`}>{formatujZl(pozycja.odsetkiGr)}</td>
                        <td className={`${klasy.komorka} text-right font-semibold`}>{formatujZl(pozycja.rataGr)}</td>
                        <td className={`${klasy.komorka} text-right ${pozycja.nadplataGr > 0 ? 'font-semibold text-akcent-800' : 'text-neutral-500'}`}>
                          {pozycja.nadplataGr > 0 ? formatujZl(pozycja.nadplataGr) : '–'}
                        </td>
                        <td className={`${klasy.komorka} text-right`}>{formatujZl(pozycja.saldoPoGr)}</td>
                        <td className={`${klasy.komorka} text-right whitespace-nowrap`}>
                          <ZnacznikZmianyStopy stopa={pozycja.stopaRoczna} poprzednia={pozycje[indeks - 1]?.stopaRoczna} />
                          {formatujStope(pozycja.stopaRoczna)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-papier">
                    <tr className="border-t-2 border-tusz font-semibold">
                      <td className={klasy.komorka} colSpan={2}>
                        Razem
                      </td>
                      <td className={`${klasy.komorka} text-right`}>{formatujZl(sumaKapitalu)}</td>
                      <td className={`${klasy.komorka} text-right`}>{formatujZl(wynik.harmonogram.sumaOdsetekGr)}</td>
                      <td className={`${klasy.komorka} text-right`}>{formatujZl(sumaRat)}</td>
                      <td className={`${klasy.komorka} text-right`}>{formatujZl(sumaNadplat)}</td>
                      <td className={klasy.komorka} colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

// Kalkulator harmonogramu spłat kredytu hipotecznego — React + Tailwind, bez bibliotek UI.
// W aplikacji: dodaj `import React from "react";` na górze i `export default HarmonogramKalkulator;` na końcu.
const { useState } = React;

const fmt = (v) => {
  const n = Number(v) || 0;
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return (n < 0 ? "−" : "") + int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "," + dec;
};
const parseNum = (s) => Number(String(s).replace(/\s|\u00a0/g, "").replace(",", "."));
const fmtData = (d) => {
  const x = new Date(d);
  return isNaN(x) ? String(d) : x.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const dzisPlusMiesiac = () => {
  const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(10);
  return d.toISOString().slice(0, 10);
};

const cls = {
  label: "block mb-1.5 text-sm text-[var(--color-neutral-700,#605d5d)]",
  input: "w-full h-11 px-3 bg-[var(--color-neutral-100,#f8f4f4)] text-[var(--color-text,#201e1d)] border border-[var(--color-neutral-300,#d7d3d3)] rounded-[var(--radius-md,2px)] tabular-nums hover:border-[var(--color-neutral-500,#9b9797)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent,#0088b0)]",
  segWrap: "inline-flex h-11 border border-[var(--color-neutral-300,#d7d3d3)] rounded-[var(--radius-md,2px)] overflow-hidden",
  seg: "px-4 text-sm cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent,#0088b0)]",
  segOn: "bg-[var(--color-accent,#0088b0)] text-white",
  segOff: "bg-[var(--color-neutral-100,#f8f4f4)] text-[var(--color-text,#201e1d)] hover:bg-[var(--color-accent-100,#e2f3fb)]",
  btnPrimary: "h-11 px-6 rounded-[var(--radius-md,2px)] bg-[var(--color-accent,#0088b0)] text-white font-semibold hover:bg-[var(--color-accent-600,#007396)] active:bg-[var(--color-accent-700,#005d7a)] disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent,#0088b0)]",
  btnSecondary: "h-11 px-5 rounded-[var(--radius-md,2px)] border border-[var(--color-accent,#0088b0)] text-[var(--color-accent-700,#005d7a)] hover:bg-[var(--color-accent-100,#e2f3fb)] active:bg-[var(--color-accent-200,#c3e5f4)] disabled:opacity-45 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent,#0088b0)]",
  btnGhost: "h-11 px-3 rounded-[var(--radius-md,2px)] text-[var(--color-accent-700,#005d7a)] hover:bg-[var(--color-accent-100,#e2f3fb)] active:bg-[var(--color-accent-200,#c3e5f4)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent,#0088b0)]",
  h2: "text-2xl font-semibold mb-5",
  th: "py-3 px-3 font-semibold text-sm text-[var(--color-neutral-700,#605d5d)]",
  td: "py-2 px-3 tabular-nums",
};

function Segmented({ value, onChange, options, name }) {
  return (
    <div role="radiogroup" aria-label={name} className={cls.segWrap}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v}
          onClick={() => onChange(v)} className={`${cls.seg} ${value === v ? cls.segOn : cls.segOff}`}>{l}</button>
      ))}
    </div>
  );
}

function HarmonogramKalkulator({ apiUrl = "/api/harmonogram" }) {
  const [form, setForm] = useState({
    kwota: "500000", liczbaRat: "300", pierwszaRata: dzisPlusMiesiac(),
    marza: "1,90", wskaznik: "POLSTR1M", typRat: "rowne",
  });
  const [nadplaty, setNadplaty] = useState([]);
  const [wynik, setWynik] = useState(null);
  const [stan, setStan] = useState({ loading: false, error: "" });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e && e.target ? e.target.value : e }));
  const setNad = (i, k, v) => setNadplaty((l) => l.map((n, j) => (j === i ? { ...n, [k]: v } : n)));
  const dodajNad = () => setNadplaty((l) => [...l, { miesiac: "12", kwota: "10000", tryb: "rata" }]);
  const usunNad = (i) => setNadplaty((l) => l.filter((_, j) => j !== i));

  const policz = async (e) => {
    e.preventDefault();
    const kwota = parseNum(form.kwota), liczbaRat = parseInt(form.liczbaRat, 10), marza = parseNum(form.marza);
    if (!(kwota > 0) || !(liczbaRat > 0) || isNaN(marza) || !form.pierwszaRata) {
      setStan({ loading: false, error: "Uzupełnij poprawnie kwotę, liczbę rat, marżę i datę pierwszej raty." });
      return;
    }
    const q = new URLSearchParams({
      kwota: kwota.toFixed(2), liczbaRat: String(liczbaRat), marza: String(marza),
      wskaznik: form.wskaznik, typRat: form.typRat, pierwszaRata: form.pierwszaRata,
    });
    const nad = nadplaty
      .map((n) => ({ miesiac: parseInt(n.miesiac, 10), kwota: parseNum(n.kwota), tryb: n.tryb }))
      .filter((n) => n.miesiac > 0 && n.kwota > 0);
    if (nad.length) q.set("nadplaty", nad.map((n) => `${n.miesiac}:${n.kwota.toFixed(2)}:${n.tryb}`).join(","));

    setStan({ loading: true, error: "" });
    try {
      const res = await fetch(`${apiUrl}?${q}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Serwer zwrócił błąd ${res.status}`);
      const data = await res.json();
      const raty = Array.isArray(data) ? data : data.raty || [];
      setWynik({ raty });
      setStan({ loading: false, error: "" });
    } catch (err) {
      setWynik(null);
      setStan({ loading: false, error: `Nie udało się pobrać harmonogramu. ${err.message || ""}` });
    }
  };

  const raty = wynik ? wynik.raty : [];
  const sumaOdsetek = raty.reduce((s, r) => s + Number(r.odsetki || 0), 0);
  const sumaKapitalu = raty.reduce((s, r) => s + Number(r.kapital || 0), 0);

  const eksportCSV = () => {
    const n2 = (v) => Number(v || 0).toFixed(2).replace(".", ",");
    const wiersze = [
      ["Nr", "Data", "Kapitał", "Odsetki", "Rata", "Saldo"],
      ...raty.map((r) => [r.nr, fmtData(r.data), n2(r.kapital), n2(r.odsetki), n2(r.rata), n2(r.saldo)]),
    ];
    const csv = "\ufeff" + wiersze.map((w) => w.join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `harmonogram_${form.pierwszaRata}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-[var(--color-bg,#f3f2f2)] text-[var(--color-text,#201e1d)] font-[family-name:var(--font-body,'Source_Serif_4',serif)]">
      <div className="max-w-6xl px-6 py-10 md:px-12 md:py-14">
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-2">Harmonogram spłat kredytu hipotecznego</h1>
        <p className="text-[var(--color-neutral-700,#605d5d)] mb-12 max-w-2xl">Wprowadź parametry kredytu i nadpłaty, a następnie policz harmonogram.</p>

        <form onSubmit={policz} noValidate>
          <section className="mb-12">
            <h2 className={cls.h2}>Parametry kredytu</h2>
            <div className="grid gap-x-8 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
              <div>
                <label htmlFor="kwota" className={cls.label}>Kwota kredytu (PLN)</label>
                <input id="kwota" inputMode="decimal" className={cls.input} value={form.kwota} onChange={set("kwota")} />
              </div>
              <div>
                <label htmlFor="liczbaRat" className={cls.label}>Liczba rat</label>
                <input id="liczbaRat" type="number" min="1" max="600" className={cls.input} value={form.liczbaRat} onChange={set("liczbaRat")} />
              </div>
              <div>
                <label htmlFor="pierwszaRata" className={cls.label}>Data pierwszej raty</label>
                <input id="pierwszaRata" type="date" className={cls.input} value={form.pierwszaRata} onChange={set("pierwszaRata")} />
              </div>
              <div>
                <label htmlFor="marza" className="block mb-1.5 text-sm font-semibold text-[var(--color-accent-700,#005d7a)]">Marża (pp)</label>
                <input id="marza" inputMode="decimal" className={`${cls.input} font-semibold bg-[var(--color-accent-100,#e2f3fb)] border-2 border-[var(--color-accent,#0088b0)] hover:border-[var(--color-accent-600,#007396)]`} value={form.marza} onChange={set("marza")} />
              </div>
              <div>
                <span className={cls.label}>Wskaźnik</span>
                <Segmented name="Wskaźnik" value={form.wskaznik} onChange={set("wskaznik")}
                  options={[["POLSTR1M", "POLSTR 1M"], ["WIBOR3M", "WIBOR 3M"]]} />
              </div>
              <div>
                <span className={cls.label}>Typ rat</span>
                <Segmented name="Typ rat" value={form.typRat} onChange={set("typRat")}
                  options={[["rowne", "Równe"], ["malejace", "Malejące"]]} />
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className={cls.h2}>Nadpłaty</h2>
            {nadplaty.length === 0 && (
              <p className="text-[var(--color-neutral-700,#605d5d)] mb-4">Brak zaplanowanych nadpłat.</p>
            )}
            <div className="flex flex-col gap-4 mb-4 max-w-4xl">
              {nadplaty.map((n, i) => (
                <div key={i} className="flex flex-wrap items-end gap-4">
                  <div className="w-32">
                    <label htmlFor={`nm${i}`} className={cls.label}>Miesiąc (nr raty)</label>
                    <input id={`nm${i}`} type="number" min="1" className={cls.input} value={n.miesiac} onChange={(e) => setNad(i, "miesiac", e.target.value)} />
                  </div>
                  <div className="w-44">
                    <label htmlFor={`nk${i}`} className={cls.label}>Kwota (PLN)</label>
                    <input id={`nk${i}`} inputMode="decimal" className={cls.input} value={n.kwota} onChange={(e) => setNad(i, "kwota", e.target.value)} />
                  </div>
                  <div>
                    <span className={cls.label}>Tryb</span>
                    <Segmented name={`Tryb nadpłaty ${i + 1}`} value={n.tryb} onChange={(v) => setNad(i, "tryb", v)}
                      options={[["rata", "Obniż ratę"], ["okres", "Skróć okres"]]} />
                  </div>
                  <button type="button" className={cls.btnGhost} onClick={() => usunNad(i)} aria-label={`Usuń nadpłatę ${i + 1}`}>Usuń</button>
                </div>
              ))}
            </div>
            <button type="button" className={cls.btnSecondary} onClick={dodajNad}>Dodaj nadpłatę</button>
          </section>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <button type="submit" className={cls.btnPrimary} disabled={stan.loading}>{stan.loading ? "Liczę…" : "Policz"}</button>
            {stan.error && <p role="alert" className="text-[var(--color-accent-2-700,#9e0050)]">{stan.error}</p>}
          </div>
        </form>

        {wynik && (
          <div className="mt-14">
            <section className="mb-12">
              <h2 className={cls.h2}>Podsumowanie</h2>
              <dl className="grid gap-x-12 gap-y-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl">
                {[
                  ["Rata pierwsza", raty[0] ? raty[0].rata : 0],
                  ["Rata ostatnia", raty.length ? raty[raty.length - 1].rata : 0],
                  ["Suma odsetek", sumaOdsetek],
                  ["Liczba rat", null, raty.length],
                ].map(([l, v, raw]) => (
                  <div key={l}>
                    <dt className="text-sm text-[var(--color-neutral-700,#605d5d)] mb-1">{l}</dt>
                    <dd className="text-3xl font-semibold tabular-nums">
                      {raw != null ? raw : fmt(v)}{raw == null && <span className="text-base font-normal ml-1.5">PLN</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-5 max-w-5xl">
                <h2 className="text-2xl font-semibold">Tabela rat</h2>
                <button type="button" className={cls.btnSecondary} onClick={eksportCSV} disabled={!raty.length}>Eksport CSV</button>
              </div>
              <div className="max-w-5xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[var(--color-bg,#f3f2f2)]">
                    <tr className="border-b-2 border-[var(--color-text,#201e1d)]">
                      <th className={cls.th}>Nr</th>
                      <th className={cls.th}>Data</th>
                      <th className={`${cls.th} text-right`}>Kapitał</th>
                      <th className={`${cls.th} text-right`}>Odsetki</th>
                      <th className={`${cls.th} text-right`}>Rata</th>
                      <th className={`${cls.th} text-right`}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raty.map((r) => (
                      <tr key={r.nr} className="border-b border-[var(--color-neutral-200,#eae7e7)] hover:bg-[var(--color-accent-100,#e2f3fb)]">
                        <td className={cls.td}>{r.nr}</td>
                        <td className={cls.td}>{fmtData(r.data)}</td>
                        <td className={`${cls.td} text-right`}>{fmt(r.kapital)}</td>
                        <td className={`${cls.td} text-right`}>{fmt(r.odsetki)}</td>
                        <td className={`${cls.td} text-right font-semibold`}>{fmt(r.rata)}</td>
                        <td className={`${cls.td} text-right`}>{fmt(r.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-text,#201e1d)] font-semibold">
                      <td className={cls.td} colSpan={2}>Razem</td>
                      <td className={`${cls.td} text-right`}>{fmt(sumaKapitalu)}</td>
                      <td className={`${cls.td} text-right`}>{fmt(sumaOdsetek)}</td>
                      <td className={`${cls.td} text-right`}>{fmt(sumaKapitalu + sumaOdsetek)}</td>
                      <td className={cls.td}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

if (typeof module !== "undefined") module.exports = { HarmonogramKalkulator };
else window.HarmonogramKalkulator = HarmonogramKalkulator;

// Podgląd: symulacja GET /api/harmonogram (dane przykładowe, stawki wskaźników umowne).
(function () {
  const STAWKI = { POLSTR1M: 4.62, WIBOR3M: 4.71 };
  const r2 = (x) => Math.round(x * 100) / 100;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    if (!url.pathname.endsWith("/api/harmonogram")) return orig(input, init);
    const p = url.searchParams;
    const P0 = +p.get("kwota"), n = +p.get("liczbaRat"), marza = +p.get("marza");
    const r = (marza + (STAWKI[p.get("wskaznik")] || 4.6)) / 100 / 12;
    const malejace = p.get("typRat") === "malejace";
    const nad = {};
    (p.get("nadplaty") || "").split(",").filter(Boolean).forEach((s) => {
      const [m, k, t] = s.split(":"); nad[+m] = { kwota: +k, tryb: t };
    });
    const start = new Date(p.get("pierwszaRata"));
    let saldo = P0, pozostalo = n;
    const annuity = (S, k) => (r === 0 ? S / k : (S * r) / (1 - Math.pow(1 + r, -k)));
    let rataStala = annuity(saldo, n), kapStaly = saldo / n;
    const raty = [];
    for (let i = 1; saldo > 0.005 && i <= n; i++) {
      const ods = r2(saldo * r);
      let kap = malejace ? kapStaly : rataStala - ods;
      if (kap > saldo || pozostalo === 1) kap = saldo;
      kap = r2(kap);
      saldo = r2(saldo - kap);
      const d = new Date(start); d.setMonth(start.getMonth() + i - 1);
      raty.push({ nr: i, data: d.toISOString().slice(0, 10), kapital: kap, odsetki: ods, rata: r2(kap + ods), saldo });
      pozostalo--;
      const np = nad[i];
      if (np && saldo > 0) {
        saldo = r2(Math.max(0, saldo - np.kwota));
        raty[raty.length - 1].saldo = saldo;
        if (np.tryb === "rata" && pozostalo > 0) { rataStala = annuity(saldo, pozostalo); kapStaly = saldo / pozostalo; }
      }
    }
    await new Promise((res) => setTimeout(res, 350));
    return new Response(JSON.stringify({ raty }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
})();

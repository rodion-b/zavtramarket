// ZavtraMarket demo exchange. Everything runs in the browser: prices tick on a
// timer, orders fill against a generated order book, and the account lives in
// localStorage. Money is kept in integer cents throughout.
(() => {
  const { languages, defaultLang } = window.I18N;
  const S = window.ZM_STRINGS;
  const EVENTS = window.ZM_EVENTS;
  const CATS = window.ZM_CATEGORIES;

  const LANG_KEY = "zavtramarket-lang";
  const STATE_KEY = "zavtramarket-demo-v1";
  const START_BALANCE = 100000;
  const HISTORY_HOURS = 24 * 60;
  const TICK_MS = 3000;
  const LOCALES = { ru: "ru-RU", uk: "uk-UA", be: "be-BY", en: "en-US" };
  const COLORS = ["#e11d2a", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];
  const RANGES = { "1d": 24, "1w": 168, "1m": 720, all: HISTORY_HOURS };

  // ---------- markets index ----------

  const MARKETS = new Map(); // "event/market" -> { key, event, market, base }
  EVENTS.forEach((event) => {
    event.markets.forEach((market) => {
      const key = `${event.id}/${market.id}`;
      MARKETS.set(key, { key, event, market, base: market.price });
    });
  });
  const isBinary = (event) => event.markets.length === 1;

  // ---------- helpers ----------

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  let lang = defaultLang;
  try {
    lang = localStorage.getItem(LANG_KEY) || defaultLang;
  } catch (e) {
    /* storage blocked — non-fatal */
  }
  if (!languages.some((l) => l.code === lang)) lang = defaultLang;

  const tx = (value) => (value == null ? "" : typeof value === "string" ? value : value[lang] ?? value.ru);
  function t(key, vars = {}) {
    return tx(S[key]).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }
  const sideName = (side) => t(side === "yes" ? "yes" : "no");
  const locale = () => LOCALES[lang] || "ru-RU";
  const money = (cents) =>
    new Intl.NumberFormat(locale(), { style: "currency", currency: "USD" }).format(cents / 100);
  const compactMoney = (dollars) =>
    new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(dollars);
  const decimal1 = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v);
  const cents1 = (v) => `${decimal1(v)}¢`;
  const fmtDate = (iso) =>
    new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  const fmtTime = (ms) =>
    new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
      new Date(ms)
    );
  const outcomeLabel = (entry) => (isBinary(entry.event) ? tx(entry.event.title) : tx(entry.market.label));

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- state ----------

  function freshState() {
    return { balance: START_BALANCE, prices: {}, positions: {}, orders: [], history: [], watch: [], volumes: {}, nextId: 1 };
  }
  let state = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY));
    if (saved && typeof saved.balance === "number") state = { ...freshState(), ...saved };
  } catch (e) {
    /* missing or corrupt — start fresh */
  }
  function save() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage blocked — the demo still works for this visit */
    }
  }

  // ---------- pricing ----------

  // The Yes price in cents, which doubles as the % chance.
  const price = (key) => state.prices[key] ?? MARKETS.get(key).base;
  const setPrice = (key, value) => {
    state.prices[key] = clamp(Math.round(value), 2, 98);
  };
  // Best prices to buy (ask) and sell (bid) each side. Yes ask + No bid = 100.
  const ask = (key, side) => (side === "yes" ? price(key) : 101 - price(key));
  const bid = (key, side) => (side === "yes" ? price(key) - 1 : 100 - price(key));

  const historyCache = new Map();
  function baseHistory(key) {
    if (historyCache.has(key)) return historyCache.get(key);
    const next = rng(hashStr(key));
    const points = new Array(HISTORY_HOURS);
    let p = MARKETS.get(key).base;
    points[HISTORY_HOURS - 1] = p;
    for (let i = HISTORY_HOURS - 2; i >= 0; i--) {
      p += (next() - 0.5) * 1.3;
      if (next() < 0.004) p += (next() - 0.5) * 16;
      p = clamp(p, 1, 99);
      points[i] = p;
    }
    historyCache.set(key, points);
    return points;
  }
  function priceHistory(key) {
    const points = baseHistory(key).slice();
    points[points.length - 1] = price(key);
    return points;
  }
  const change24h = (key) => Math.round(price(key) - baseHistory(key)[HISTORY_HOURS - 25]);

  // Resting liquidity. Sizes are seeded by price level so the book is stable.
  function levelSize(key, kind, p) {
    const next = rng(hashStr(`${key}|${kind}|${p}`));
    return 40 + Math.floor(next() * 900);
  }
  function book(key, side) {
    const m = price(key);
    const yesAsks = [];
    for (let p = m; p <= Math.min(99, m + 7); p++) yesAsks.push({ p, n: levelSize(key, "a", p) });
    const yesBids = [];
    for (let p = m - 1; p >= Math.max(1, m - 8); p--) yesBids.push({ p, n: levelSize(key, "b", p) });
    if (side === "yes") return { asks: yesAsks, bids: yesBids };
    // A No ask is the other side of a Yes bid, and vice versa.
    return {
      asks: yesBids.map(({ p, n }) => ({ p: 100 - p, n })),
      bids: yesAsks.map(({ p, n }) => ({ p: 100 - p, n })),
    };
  }

  // Fill against levels (best first) within a cent budget and/or count.
  function walk(levels, { budget = Infinity, max = Infinity, limit = null, buying = true }) {
    let n = 0;
    let total = 0;
    let last = null;
    for (const level of levels) {
      if (limit != null && (buying ? level.p > limit : level.p < limit)) break;
      const affordable = buying ? Math.floor((budget - total) / level.p) : Infinity;
      const take = Math.min(level.n, affordable, max - n);
      if (take <= 0) break;
      n += take;
      total += take * level.p;
      last = level.p;
    }
    return { n, total, last, avg: n ? total / n : 0 };
  }

  // ---------- trading ----------

  const posKey = (key, side) => `${key}|${side}`;

  function addPosition(key, side, n, cost) {
    const k = posKey(key, side);
    const pos = state.positions[k] || { n: 0, cost: 0 };
    pos.n += n;
    pos.cost += cost;
    state.positions[k] = pos;
  }
  function record(key, side, action, n, p) {
    state.history.unshift({ time: Date.now(), key, side, action, n, p });
    state.history = state.history.slice(0, 200);
    const eventId = MARKETS.get(key).event.id;
    state.volumes[eventId] = (state.volumes[eventId] || 0) + n * p;
  }
  // Moving through the book moves the price to the last level touched.
  function impact(key, side, action, last) {
    if (last == null) return;
    if (action === "buy") setPrice(key, side === "yes" ? last : 101 - last);
    else setPrice(key, side === "yes" ? last + 1 : 100 - last);
  }

  function marketBuy(key, side, budget) {
    const fill = walk(book(key, side).asks, { budget: Math.min(budget, state.balance) });
    if (!fill.n) return null;
    state.balance -= fill.total;
    addPosition(key, side, fill.n, fill.total);
    record(key, side, "buy", fill.n, Math.round(fill.avg));
    impact(key, side, "buy", fill.last);
    save();
    return fill;
  }

  function marketSell(key, side, count) {
    const pos = state.positions[posKey(key, side)];
    if (!pos) return null;
    const fill = walk(book(key, side).bids, { max: Math.min(count, pos.n), buying: false });
    if (!fill.n) return null;
    const avgCost = pos.cost / pos.n;
    pos.cost -= avgCost * fill.n;
    pos.n -= fill.n;
    if (pos.n === 0) delete state.positions[posKey(key, side)];
    state.balance += fill.total;
    record(key, side, "sell", fill.n, Math.round(fill.avg));
    impact(key, side, "sell", fill.last);
    save();
    return fill;
  }

  // Crosses the book up to the limit price, then rests whatever is left.
  function limitBuy(key, side, limit, count) {
    const now = walk(book(key, side).asks, { max: count, limit, budget: state.balance });
    if (now.n) {
      state.balance -= now.total;
      addPosition(key, side, now.n, now.total);
      record(key, side, "buy", now.n, Math.round(now.avg));
      impact(key, side, "buy", now.last);
    }
    const rest = Math.min(count - now.n, Math.floor(state.balance / limit));
    if (rest > 0) {
      state.balance -= rest * limit;
      state.orders.push({ id: state.nextId++, key, side, p: limit, n: rest, time: Date.now() });
    }
    save();
    return { filled: now, rested: rest };
  }

  function cancelOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    state.balance += order.p * order.n;
    state.orders = state.orders.filter((o) => o.id !== id);
    save();
  }

  function fillRestingOrders() {
    const filled = [];
    state.orders = state.orders.filter((order) => {
      if (ask(order.key, order.side) > order.p) return true;
      addPosition(order.key, order.side, order.n, order.p * order.n);
      record(order.key, order.side, "buy", order.n, order.p);
      filled.push(order);
      return false;
    });
    return filled;
  }

  const reserved = () => state.orders.reduce((sum, o) => sum + o.p * o.n, 0);
  function positionRows() {
    return Object.entries(state.positions).map(([k, pos]) => {
      const [key, side] = k.split("|");
      const entry = MARKETS.get(key);
      const now = bid(key, side);
      const value = pos.n * now;
      return { key, side, entry, n: pos.n, avg: pos.cost / pos.n, now, value, pnl: value - pos.cost };
    });
  }

  // ---------- UI state ----------

  const ui = {
    q: "",
    sort: "volume",
    range: "1w",
    bookSide: "yes",
    ptab: "positions",
    chartHover: false,
    trade: { key: null, side: "yes", mode: "buy", type: "market", amount: "", limit: "", count: "" },
  };

  function parseRoute() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, query = ""] = hash.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query);
    if (parts[0] === "e" && parts[1]) return { view: "event", id: decodeURIComponent(parts[1]), params };
    if (parts[0] === "portfolio") return { view: "portfolio", params };
    if (parts[0] === "c" && parts[1]) return { view: "list", cat: parts[1], params };
    return { view: "list", cat: "trending", params };
  }
  const eventHref = (event, marketId, side, action) => {
    const q = new URLSearchParams();
    if (marketId) q.set("m", marketId);
    if (side) q.set("s", side);
    if (action) q.set("a", action);
    const qs = q.toString();
    return `#/e/${event.id}${qs ? `?${qs}` : ""}`;
  };

  // ---------- shared pieces ----------

  function deltaHtml(key) {
    const d = change24h(key);
    if (!d) return `<span class="delta flat" data-live="delta" data-key="${key}">0</span>`;
    return `<span class="delta ${d > 0 ? "up" : "down"}" data-live="delta" data-key="${key}">${d > 0 ? "▲" : "▼"} ${Math.abs(d)}</span>`;
  }
  const pctHtml = (key) => `<span data-live="pct" data-key="${key}">${price(key)}%</span>`;
  const askHtml = (key, side) => `<span data-live="ask" data-key="${key}" data-side="${side}">${ask(key, side)}¢</span>`;
  const eventVolume = (event) => event.volume + (state.volumes[event.id] || 0) / 100;
  const sortedMarkets = (event) =>
    event.markets.map((m) => `${event.id}/${m.id}`).sort((a, b) => price(b) - price(a));

  function starButton(event) {
    const on = state.watch.includes(event.id);
    return `<button class="star${on ? " on" : ""}" type="button" data-action="watch" data-event="${event.id}"
      aria-pressed="${on}" aria-label="${esc(t(on ? "watchRemove" : "watchAdd"))}" title="${esc(t(on ? "watchRemove" : "watchAdd"))}">${on ? "★" : "☆"}</button>`;
  }

  function cardHtml(event) {
    const keys = sortedMarkets(event);
    let body;
    if (isBinary(event)) {
      const key = keys[0];
      body = `
        <div class="card-binary">
          <div class="big-chance">${pctHtml(key)} <small>${esc(t("chance"))}</small> ${deltaHtml(key)}</div>
          <div class="yn">
            <a class="btn-yes" href="${eventHref(event, event.markets[0].id, "yes")}">${esc(t("yes"))} ${askHtml(key, "yes")}</a>
            <a class="btn-no" href="${eventHref(event, event.markets[0].id, "no")}">${esc(t("no"))} ${askHtml(key, "no")}</a>
          </div>
        </div>`;
    } else {
      const rows = keys
        .slice(0, 3)
        .map((key) => {
          const { market } = MARKETS.get(key);
          return `<li>
            <a class="oc-label" href="${eventHref(event, market.id)}">${esc(tx(market.label))}</a>
            <span class="oc-pct">${pctHtml(key)}</span>
            <a class="mini-yes" href="${eventHref(event, market.id, "yes")}">${esc(t("yes"))}</a>
            <a class="mini-no" href="${eventHref(event, market.id, "no")}">${esc(t("no"))}</a>
          </li>`;
        })
        .join("");
      const more = keys.length > 3 ? `<p class="more">${esc(t("moreOutcomes", { n: keys.length - 3 }))}</p>` : "";
      body = `<ul class="card-outcomes">${rows}</ul>${more}`;
    }
    return `<article class="card">
      <header class="card-head">
        <span class="card-icon" aria-hidden="true">${event.icon}</span>
        <a class="card-title" href="${eventHref(event)}">${esc(tx(event.title))}</a>
        ${starButton(event)}
      </header>
      ${body}
      <footer class="card-foot">
        <span>${esc(t("volume", { v: compactMoney(eventVolume(event)) }))}</span>
        <span>${esc(t("closes", { d: fmtDate(event.closes) }))}</span>
      </footer>
    </article>`;
  }

  // ---------- chart ----------

  function chartSeries(event) {
    return sortedMarkets(event)
      .slice(0, 4)
      .map((key, i) => ({
        key,
        label: isBinary(event) ? t("yes") : tx(MARKETS.get(key).market.label),
        color: COLORS[i],
        data: priceHistory(key),
      }));
  }

  function drawChart(el, series, range, height) {
    if (!el) return;
    const width = el.clientWidth || 600;
    const count = RANGES[range];
    const step = Math.max(1, Math.ceil(count / 240));
    const indices = [];
    for (let i = HISTORY_HOURS - 1; i >= HISTORY_HOURS - count; i -= step) indices.unshift(i);
    const now = Date.now();
    const times = indices.map((i) => now - (HISTORY_HOURS - 1 - i) * 3600e3);
    const lines = series.map((s) => indices.map((i) => s.data[i]));

    const all = lines.flat();
    // A span that's a multiple of 20 gives round gridlines every 5% or more.
    let lo = Math.max(0, Math.floor((Math.min(...all) - 4) / 10) * 10);
    const span = Math.min(100, Math.ceil((Math.max(...all) + 4 - lo) / 20) * 20);
    let hi = lo + span;
    if (hi > 100) {
      hi = 100;
      lo = 100 - span;
    }

    const pad = { l: 4, r: 44, t: 10, b: 24 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    const x = (i) => pad.l + (indices.length > 1 ? (i / (indices.length - 1)) * plotW : plotW);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * plotH;

    const grid = [0, 1, 2, 3, 4]
      .map((k) => {
        const v = lo + ((hi - lo) * k) / 4;
        return `<line class="gridline" x1="${pad.l}" x2="${pad.l + plotW}" y1="${y(v)}" y2="${y(v)}"/>
          <text class="axis" x="${width - 4}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}%</text>`;
      })
      .join("");
    const dateFmt = new Intl.DateTimeFormat(
      locale(),
      range === "1d" ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" }
    );
    const xLabels = [0, Math.floor((indices.length - 1) / 2), indices.length - 1]
      .map((i, k) => {
        const anchor = ["start", "middle", "end"][k];
        return `<text class="axis" x="${k === 2 ? pad.l + plotW : x(i)}" y="${height - 6}" text-anchor="${anchor}">${dateFmt.format(times[i])}</text>`;
      })
      .join("");
    const paths = lines
      .map((pts, s) => {
        const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
        const last = pts.length - 1;
        return `<path d="${d}" fill="none" stroke="${series[s].color}" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="${x(last)}" cy="${y(pts[last])}" r="3.5" fill="${series[s].color}"/>`;
      })
      .join("");
    const hoverDots = series.map((s) => `<circle class="hover-dot" r="4" fill="${s.color}" style="display:none"/>`).join("");

    el.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
        ${grid}${xLabels}${paths}
        <line class="hover-line" y1="${pad.t}" y2="${pad.t + plotH}" style="display:none"/>
        ${hoverDots}
      </svg><div class="chart-tip" hidden></div>`;

    const svg = el.querySelector("svg");
    const line = svg.querySelector(".hover-line");
    const dots = svg.querySelectorAll(".hover-dot");
    const tip = el.querySelector(".chart-tip");
    const fullFmt = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    svg.addEventListener("pointermove", (e) => {
      ui.chartHover = true;
      const rect = svg.getBoundingClientRect();
      const i = clamp(Math.round(((e.clientX - rect.left - pad.l) / plotW) * (indices.length - 1)), 0, indices.length - 1);
      const px = x(i);
      line.setAttribute("x1", px);
      line.setAttribute("x2", px);
      line.style.display = "";
      dots.forEach((dot, s) => {
        dot.setAttribute("cx", px);
        dot.setAttribute("cy", y(lines[s][i]));
        dot.style.display = "";
      });
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(fullFmt.format(times[i]))}</b>${series
        .map((s, k) => `<span><i style="background:${s.color}"></i>${esc(s.label)} ${Math.round(lines[k][i])}%</span>`)
        .join("")}`;
      const tipX = px > width / 2 ? px - tip.offsetWidth - 12 : px + 12;
      tip.style.left = `${clamp(tipX, 0, width - tip.offsetWidth)}px`;
    });
    svg.addEventListener("pointerleave", () => {
      ui.chartHover = false;
      line.style.display = "none";
      dots.forEach((dot) => (dot.style.display = "none"));
      tip.hidden = true;
    });
  }

  // ---------- views ----------

  function filteredEvents(cat) {
    const q = ui.q.trim().toLowerCase();
    let list = EVENTS.filter((event) => {
      if (cat === "watchlist" && !state.watch.includes(event.id)) return false;
      if (cat !== "trending" && cat !== "watchlist" && event.cat !== cat) return false;
      if (!q) return true;
      const text = [tx(event.title), ...event.markets.map((m) => tx(m.label))].join(" ").toLowerCase();
      return text.includes(q);
    });
    const topMove = (event) => Math.max(...event.markets.map((m) => Math.abs(change24h(`${event.id}/${m.id}`))));
    const sorters = {
      volume: (a, b) => eventVolume(b) - eventVolume(a),
      movers: (a, b) => topMove(b) - topMove(a),
      closing: (a, b) => a.closes.localeCompare(b.closes),
      new: (a, b) => b.opens.localeCompare(a.opens),
    };
    return list.sort(sorters[ui.sort]);
  }

  function listView(cat) {
    const pills = [...CATS, { id: "watchlist", label: S.watchlist }]
      .map(
        (c) =>
          `<a class="pill${c.id === cat ? " active" : ""}" href="#/c/${c.id}"${c.id === cat ? ' aria-current="page"' : ""}>${c.id === "watchlist" ? "★ " : ""}${esc(tx(c.label))}</a>`
      )
      .join("");
    const sorts = ["volume", "movers", "closing", "new"]
      .map((s) => `<option value="${s}"${ui.sort === s ? " selected" : ""}>${esc(t(`sort${s[0].toUpperCase()}${s.slice(1)}`))}</option>`)
      .join("");
    return `
      <div class="toolbar">
        <nav class="pills" aria-label="${esc(t("navMarkets"))}">${pills}</nav>
        <div class="tools">
          <input id="search" class="search" type="search" placeholder="${esc(t("search"))}" aria-label="${esc(t("search"))}" value="${esc(ui.q)}">
          <select id="sort" class="select" aria-label="${esc(t("sortLabel"))}">${sorts}</select>
        </div>
      </div>
      <div id="results"></div>`;
  }

  function renderResults(cat) {
    const el = document.getElementById("results");
    if (!el) return;
    const events = filteredEvents(cat);
    if (!events.length) {
      el.innerHTML = `<p class="empty">${esc(t(cat === "watchlist" && !ui.q ? "emptyWatchlist" : "noResults"))}</p>`;
      return;
    }
    let featured = "";
    let rest = events;
    if (cat === "trending" && !ui.q) {
      // Feature the biggest multi-outcome event: its chart has the most to show.
      const top = events.find((e) => !isBinary(e)) || events[0];
      rest = events.filter((e) => e !== top);
      const keys = sortedMarkets(top);
      const rows = keys
        .slice(0, 4)
        .map((key, i) => {
          const { market } = MARKETS.get(key);
          return `<li><i style="background:${COLORS[i]}"></i>
            <span class="oc-label">${esc(isBinary(top) ? t("yes") : tx(market.label))}</span>
            <span class="oc-pct">${pctHtml(key)}</span>
            <a class="mini-yes" href="${eventHref(top, market.id, "yes")}">${esc(t("yes"))} ${askHtml(key, "yes")}</a>
            <a class="mini-no" href="${eventHref(top, market.id, "no")}">${esc(t("no"))} ${askHtml(key, "no")}</a></li>`;
        })
        .join("");
      featured = `<article class="featured">
        <div class="featured-info">
          <p class="crumb">${esc(tx(CATS.find((c) => c.id === top.cat).label))}</p>
          <a class="featured-title" href="${eventHref(top)}"><span aria-hidden="true">${top.icon}</span> ${esc(tx(top.title))}</a>
          <ul class="featured-outcomes">${rows}</ul>
          <p class="card-foot"><span>${esc(t("volume", { v: compactMoney(eventVolume(top)) }))}</span><span>${esc(t("closes", { d: fmtDate(top.closes) }))}</span></p>
        </div>
        <div class="chart featured-chart" id="featured-chart" data-event="${top.id}"></div>
      </article>`;
    }
    el.innerHTML = `${featured}<div class="grid">${rest.map(cardHtml).join("")}</div>`;
    const chart = document.getElementById("featured-chart");
    if (chart) drawChart(chart, chartSeries(EVENTS.find((e) => e.id === chart.dataset.event)), "1m", 220);
  }

  function eventView(event) {
    const binary = isBinary(event);
    const key = ui.trade.key;
    const entry = MARKETS.get(key);
    const series = chartSeries(event);
    const legend = series
      .map((s) => `<span class="legend-item"><i style="background:${s.color}"></i>${esc(s.label)} <b>${pctHtml(s.key)}</b></span>`)
      .join("");
    const ranges = Object.keys(RANGES)
      .map(
        (r) =>
          `<button type="button" class="range${ui.range === r ? " active" : ""}" data-action="range" data-range="${r}" aria-pressed="${ui.range === r}">${esc(t(`range${r === "all" ? "All" : r}`))}</button>`
      )
      .join("");

    const outcomes = binary
      ? ""
      : `<section class="panel outcomes">
          <table>
            <thead><tr><th>${esc(t("outcome"))}</th><th>${esc(t("chanceCol"))}</th><th></th></tr></thead>
            <tbody>${sortedMarkets(event)
              .map((k) => {
                const { market } = MARKETS.get(k);
                const selected = k === key;
                return `<tr class="${selected ? "selected" : ""}">
                  <td><a href="${eventHref(event, market.id, ui.trade.side)}">${esc(tx(market.label))}</a></td>
                  <td class="oc-pct">${pctHtml(k)} ${deltaHtml(k)}</td>
                  <td class="oc-buttons">
                    <a class="btn-yes${selected && ui.trade.side === "yes" ? " active" : ""}" href="${eventHref(event, market.id, "yes")}">${esc(t("yes"))} ${askHtml(k, "yes")}</a>
                    <a class="btn-no${selected && ui.trade.side === "no" ? " active" : ""}" href="${eventHref(event, market.id, "no")}">${esc(t("no"))} ${askHtml(k, "no")}</a>
                  </td></tr>`;
              })
              .join("")}</tbody>
          </table>
        </section>`;

    const related = EVENTS.filter((e) => e.cat === event.cat && e.id !== event.id).slice(0, 3);
    const rulesKey = binary ? "rulesBinary" : "rulesMulti";

    return `
      <a class="back" href="#/">${esc(t("backToMarkets"))}</a>
      <div class="event-layout">
        <header class="event-head">
          <span class="event-icon" aria-hidden="true">${event.icon}</span>
          <div>
            <p class="crumb"><a href="#/c/${event.cat}">${esc(tx(CATS.find((c) => c.id === event.cat).label))}</a></p>
            <h1>${esc(tx(event.title))}</h1>
            <p class="meta">${esc(t("volume", { v: compactMoney(eventVolume(event)) }))} · ${esc(t("closes", { d: fmtDate(event.closes) }))}</p>
          </div>
          ${starButton(event)}
        </header>

        <section class="panel chart-panel">
          <div class="legend">${legend}</div>
          <div class="chart" id="event-chart"></div>
          <div class="ranges">${ranges}</div>
        </section>

        ${outcomes}

        <aside class="trade-panel panel" id="trade-panel" aria-label="${esc(outcomeLabel(entry))}">${tradePanelHtml()}</aside>

        <section class="panel book-panel">
          <div class="panel-head">
            <h2>${esc(t("orderBook"))}${binary ? "" : ` · ${esc(tx(entry.market.label))}`}</h2>
            <div class="seg small">
              ${["yes", "no"]
                .map(
                  (s) =>
                    `<button type="button" data-action="bookSide" data-side="${s}" class="${ui.bookSide === s ? "active" : ""}" aria-pressed="${ui.bookSide === s}">${esc(sideName(s))}</button>`
                )
                .join("")}
            </div>
          </div>
          <div id="book"></div>
        </section>

        <section class="panel rules-panel">
          <h2>${esc(t("rules"))}</h2>
          <p>${esc(t(rulesKey, { d: fmtDate(event.closes), src: tx(event.source) }))}</p>
          <h2>${esc(t("timeline"))}</h2>
          <dl class="timeline">
            <div><dt>${esc(t("opened"))}</dt><dd>${esc(fmtDate(event.opens))}</dd></div>
            <div><dt>${esc(t("closing"))}</dt><dd>${esc(fmtDate(event.closes))}</dd></div>
            <div><dt>${esc(t("payoutWhen"))}</dt><dd>${esc(t("payoutWhenText"))}</dd></div>
          </dl>
        </section>

        ${
          related.length
            ? `<section class="related"><h2>${esc(t("related"))}</h2><div class="grid">${related.map(cardHtml).join("")}</div></section>`
            : ""
        }
      </div>`;
  }

  function bookHtml() {
    const key = ui.trade.key;
    const { asks, bids } = book(key, ui.bookSide);
    const maxN = Math.max(...asks.map((l) => l.n), ...bids.map((l) => l.n));
    const row = (l, kind) => `<tr class="${kind}">
        <td class="bar-cell"><span class="bar" style="width:${(l.n / maxN) * 100}%"></span>${l.p}¢</td>
        <td>${l.n.toLocaleString(locale())}</td>
        <td>${money(l.p * l.n)}</td></tr>`;
    return `<table class="book">
      <thead><tr><th>${esc(t("bookPrice"))}</th><th>${esc(t("bookQty"))}</th><th>${esc(t("bookTotal"))}</th></tr></thead>
      <tbody>
        <tr class="book-label"><td colspan="3">${esc(t("asks"))}</td></tr>
        ${asks.slice(0, 5).reverse().map((l) => row(l, "ask")).join("")}
        <tr class="spread"><td colspan="3">${esc(t("spread", { s: asks[0].p - bids[0].p }))}</td></tr>
        ${bids.slice(0, 5).map((l) => row(l, "bid")).join("")}
        <tr class="book-label"><td colspan="3">${esc(t("bids"))}</td></tr>
      </tbody></table>`;
  }

  function tradePanelHtml() {
    const tr = ui.trade;
    const entry = MARKETS.get(tr.key);
    const pos = state.positions[posKey(tr.key, tr.side)];
    const sides = ["yes", "no"]
      .map(
        (s) => `<button type="button" data-action="side" data-side="${s}" class="side-${s}${tr.side === s ? " active" : ""}" aria-pressed="${tr.side === s}">
          ${esc(sideName(s))} <span data-live="${tr.mode === "buy" ? "ask" : "bid"}" data-key="${tr.key}" data-side="${s}">${tr.mode === "buy" ? ask(tr.key, s) : bid(tr.key, s)}¢</span></button>`
      )
      .join("");
    let fields;
    if (tr.mode === "sell") {
      fields = pos
        ? `<p class="hold">${esc(t("youHold", { n: pos.n, side: sideName(tr.side) }))}</p>
           <label class="field"><span>${esc(t("contracts"))}</span>
             <span class="input-row"><input id="f-count" type="number" inputmode="numeric" min="1" max="${pos.n}" step="1" value="${esc(tr.count)}" placeholder="0">
             <button type="button" class="chip" data-action="sellAll">${esc(t("sellAll"))}</button></span></label>`
        : `<p class="hold muted">${esc(t("noPosition", { side: sideName(tr.side) }))}</p>`;
    } else if (tr.type === "limit") {
      fields = `<label class="field"><span>${esc(t("limitPrice"))}</span>
          <input id="f-limit" type="number" inputmode="numeric" min="1" max="99" step="1" value="${esc(tr.limit)}" placeholder="${ask(tr.key, tr.side)}"></label>
        <label class="field"><span>${esc(t("contracts"))}</span>
          <input id="f-count" type="number" inputmode="numeric" min="1" step="1" value="${esc(tr.count)}" placeholder="0"></label>
        <p class="hint" id="limit-hint"></p>`;
    } else {
      fields = `<label class="field"><span>${esc(t("amount"))}</span>
          <input id="f-amount" type="number" inputmode="decimal" min="0" step="1" value="${esc(tr.amount)}" placeholder="0"></label>
        <div class="chips">${[1, 10, 100]
          .map((v) => `<button type="button" class="chip" data-action="quick" data-add="${v}">+$${v}</button>`)
          .join("")}</div>`;
    }
    return `
      <p class="tp-outcome">${esc(outcomeLabel(entry))}</p>
      <div class="seg">
        ${["buy", "sell"]
          .map(
            (m) =>
              `<button type="button" data-action="mode" data-mode="${m}" class="${tr.mode === m ? "active" : ""}" aria-pressed="${tr.mode === m}">${esc(t(m))}</button>`
          )
          .join("")}
      </div>
      <div class="sides">${sides}</div>
      ${
        tr.mode === "buy"
          ? `<div class="seg small">${["market", "limit"]
              .map(
                (ty) =>
                  `<button type="button" data-action="type" data-type="${ty}" class="${tr.type === ty ? "active" : ""}" aria-pressed="${tr.type === ty}">${esc(t(ty === "market" ? "orderMarket" : "orderLimit"))}</button>`
              )
              .join("")}</div>`
          : ""
      }
      ${fields}
      <dl class="summary" id="trade-summary"></dl>
      <p class="trade-error" id="trade-error" role="alert"></p>
      <button type="button" class="submit side-${tr.side}" id="trade-submit" data-action="submit"></button>`;
  }

  // Recomputes the order preview without re-rendering the inputs.
  function quote() {
    const tr = ui.trade;
    const key = tr.key;
    if (tr.mode === "sell") {
      const pos = state.positions[posKey(key, tr.side)];
      const n = Math.floor(Number(tr.count) || 0);
      if (!pos) return { ok: false, rows: [] };
      const fill = walk(book(key, tr.side).bids, { max: Math.min(n, pos.n), buying: false });
      return {
        ok: fill.n > 0,
        rows: [
          [t("contracts"), fill.n.toLocaleString(locale())],
          [t("avgPrice"), fill.n ? cents1(fill.avg) : "—"],
          [t("proceeds"), money(fill.total)],
        ],
        label: t("submitSell", { side: sideName(tr.side) }),
      };
    }
    if (tr.type === "limit") {
      const p = Math.floor(Number(tr.limit) || 0);
      const n = Math.floor(Number(tr.count) || 0);
      const valid = p >= 1 && p <= 99 && n > 0;
      const cost = valid ? p * n : 0;
      return {
        ok: valid && cost <= state.balance,
        error: valid && cost > state.balance ? t("insufficient") : "",
        hint: valid && p < ask(key, tr.side) ? t("limitHint", { side: sideName(tr.side), p }) : "",
        rows: [
          [t("cost"), money(cost)],
          [t("toWin"), `${money(n * 100)}${valid ? ` <em class="gain">+${money(n * 100 - cost)}</em>` : ""}`],
        ],
        label: t("placeLimit"),
      };
    }
    const budget = Math.round((Number(tr.amount) || 0) * 100);
    const fill = walk(book(key, tr.side).asks, { budget });
    return {
      ok: fill.n > 0 && fill.total <= state.balance,
      error: fill.total > state.balance ? t("insufficient") : "",
      rows: [
        [t("contracts"), fill.n.toLocaleString(locale())],
        [t("avgPrice"), fill.n ? cents1(fill.avg) : "—"],
        [t("cost"), money(fill.total)],
        [t("toWin"), `${money(fill.n * 100)}${fill.n ? ` <em class="gain">+${money(fill.n * 100 - fill.total)}</em>` : ""}`],
      ],
      label: t("submitBuy", { side: sideName(tr.side) }),
    };
  }

  function updateTradeSummary() {
    const summary = document.getElementById("trade-summary");
    if (!summary) return;
    const q = quote();
    summary.innerHTML = q.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("");
    document.getElementById("trade-error").textContent = q.error || "";
    const hint = document.getElementById("limit-hint");
    if (hint) hint.textContent = q.hint || "";
    const submit = document.getElementById("trade-submit");
    submit.textContent = q.label || t("submitSell", { side: sideName(ui.trade.side) });
    submit.disabled = !q.ok;
  }

  function portfolioView() {
    const tabs = ["positions", "orders", "history"]
      .map(
        (tab) =>
          `<button type="button" data-action="ptab" data-tab="${tab}" class="${ui.ptab === tab ? "active" : ""}" aria-pressed="${ui.ptab === tab}">${esc(t(tab === "orders" ? "openOrders" : tab))}</button>`
      )
      .join("");
    return `
      <div class="portfolio-head">
        <h1>${esc(t("navPortfolio"))}</h1>
        <button type="button" class="link-button" data-action="reset">${esc(t("resetDemo"))}</button>
      </div>
      <div class="stats" id="stats"></div>
      <div class="seg tabs">${tabs}</div>
      <div class="panel table-panel" id="ptable"></div>`;
  }

  function renderPortfolioData() {
    const stats = document.getElementById("stats");
    const table = document.getElementById("ptable");
    if (!stats || !table) return;
    const rows = positionRows();
    const value = rows.reduce((sum, r) => sum + r.value, 0);
    const pnl = state.balance + reserved() + value - START_BALANCE;
    const sign = (c) => (c > 0 ? "gain" : c < 0 ? "loss" : "");
    stats.innerHTML = `
      <div class="stat"><span>${esc(t("cash"))}</span><b>${money(state.balance)}</b></div>
      <div class="stat"><span>${esc(t("positionsValue"))}</span><b>${money(value)}</b></div>
      <div class="stat"><span>${esc(t("totalPnl"))}</span><b class="${sign(pnl)}">${pnl > 0 ? "+" : ""}${money(pnl)}</b></div>`;

    const marketCell = (entry) =>
      `<a href="${eventHref(entry.event, entry.market.id)}"><span aria-hidden="true">${entry.event.icon}</span> ${esc(
        isBinary(entry.event) ? tx(entry.event.title) : `${tx(entry.market.label)} · ${tx(entry.event.title)}`
      )}</a>`;
    const sideBadge = (side) => `<span class="badge ${side}">${esc(sideName(side))}</span>`;

    if (ui.ptab === "positions") {
      table.innerHTML = rows.length
        ? `<table class="data"><thead><tr><th>${esc(t("colMarket"))}</th><th>${esc(t("colSide"))}</th><th>${esc(t("contracts"))}</th><th>${esc(t("colAvg"))}</th><th>${esc(t("colNow"))}</th><th>${esc(t("colValue"))}</th><th>${esc(t("colPnl"))}</th><th></th></tr></thead><tbody>
          ${rows
            .map(
              (r) => `<tr><td>${marketCell(r.entry)}</td><td>${sideBadge(r.side)}</td><td>${r.n.toLocaleString(locale())}</td>
                <td>${cents1(r.avg)}</td><td>${r.now}¢</td><td>${money(r.value)}</td>
                <td class="${sign(r.pnl)}">${r.pnl > 0 ? "+" : ""}${money(r.pnl)}</td>
                <td><a class="chip" href="${eventHref(r.entry.event, r.entry.market.id, r.side, "sell")}">${esc(t("sell"))}</a></td></tr>`
            )
            .join("")}</tbody></table>`
        : `<p class="empty">${esc(t("noPositions"))}</p>`;
    } else if (ui.ptab === "orders") {
      table.innerHTML = state.orders.length
        ? `<table class="data"><thead><tr><th>${esc(t("colMarket"))}</th><th>${esc(t("colSide"))}</th><th>${esc(t("colPrice"))}</th><th>${esc(t("contracts"))}</th><th>${esc(t("colTime"))}</th><th></th></tr></thead><tbody>
          ${state.orders
            .map((o) => {
              const entry = MARKETS.get(o.key);
              return `<tr><td>${marketCell(entry)}</td><td>${sideBadge(o.side)}</td><td>${o.p}¢</td><td>${o.n.toLocaleString(locale())}</td>
                <td>${esc(fmtTime(o.time))}</td><td><button type="button" class="chip" data-action="cancel" data-id="${o.id}">${esc(t("cancel"))}</button></td></tr>`;
            })
            .join("")}</tbody></table>`
        : `<p class="empty">${esc(t("noOrders"))}</p>`;
    } else {
      table.innerHTML = state.history.length
        ? `<table class="data"><thead><tr><th>${esc(t("colTime"))}</th><th>${esc(t("colMarket"))}</th><th>${esc(t("colAction"))}</th><th>${esc(t("colSide"))}</th><th>${esc(t("contracts"))}</th><th>${esc(t("colPrice"))}</th></tr></thead><tbody>
          ${state.history
            .map(
              (h) => `<tr><td>${esc(fmtTime(h.time))}</td><td>${marketCell(MARKETS.get(h.key))}</td>
                <td>${esc(t(h.action === "buy" ? "actionBuy" : "actionSell"))}</td><td>${sideBadge(h.side)}</td>
                <td>${h.n.toLocaleString(locale())}</td><td>${h.p}¢</td></tr>`
            )
            .join("")}</tbody></table>`
        : `<p class="empty">${esc(t("noHistory"))}</p>`;
    }
  }

  // ---------- chrome & rendering ----------

  const main = document.getElementById("app");
  const switcher = document.getElementById("lang-switcher");
  let route = parseRoute();

  function renderHeader() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-s]").forEach((node) => {
      node.textContent = t(node.dataset.s);
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
      const active = link.dataset.view === route.view || (link.dataset.view === "list" && route.view === "event");
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    switcher.setAttribute("aria-label", t("langSwitcher"));
    switcher.innerHTML = languages
      .map(
        ({ code, label, name }) =>
          `<button type="button" class="lang-option" lang="${code}" title="${esc(name)}" aria-label="${esc(name)}" aria-pressed="${code === lang}" data-action="lang" data-lang="${code}">${esc(label)}</button>`
      )
      .join("");
    updateBalance();
  }
  function updateBalance() {
    document.getElementById("balance").textContent = money(state.balance);
  }

  function render() {
    route = parseRoute();
    let title = t("title");
    if (route.view === "event") {
      const event = EVENTS.find((e) => e.id === route.id);
      if (!event) {
        main.innerHTML = `<p class="empty">${esc(t("notFound"))} <a href="#/">${esc(t("backToMarkets"))}</a></p>`;
      } else {
        const marketId = route.params.get("m");
        const key = event.markets.some((m) => m.id === marketId)
          ? `${event.id}/${marketId}`
          : ui.trade.key && ui.trade.key.startsWith(`${event.id}/`)
            ? ui.trade.key
            : sortedMarkets(event)[0];
        const side = route.params.get("s");
        const action = route.params.get("a");
        if (key !== ui.trade.key) Object.assign(ui.trade, { amount: "", limit: "", count: "" });
        ui.trade.key = key;
        if (side === "yes" || side === "no") ui.trade.side = side;
        if (action === "sell") {
          ui.trade.mode = "sell";
          const pos = state.positions[posKey(key, ui.trade.side)];
          ui.trade.count = pos ? String(pos.n) : "";
        }
        ui.bookSide = ui.trade.side;
        main.innerHTML = eventView(event);
        drawChart(document.getElementById("event-chart"), chartSeries(event), ui.range, 280);
        document.getElementById("book").innerHTML = bookHtml();
        updateTradeSummary();
        title = `${tx(event.title)} · ZavtraMarket`;
      }
    } else if (route.view === "portfolio") {
      main.innerHTML = portfolioView();
      renderPortfolioData();
    } else {
      main.innerHTML = listView(route.cat);
      renderResults(route.cat);
    }
    document.title = title;
    renderHeader();
  }

  // Re-render only the trade panel, keeping the rest of the page in place.
  function renderTradePanel() {
    const panel = document.getElementById("trade-panel");
    if (!panel) return;
    panel.innerHTML = tradePanelHtml();
    updateTradeSummary();
  }

  // Live-updates every price on screen after a tick or a trade.
  function refreshLive() {
    document.querySelectorAll("[data-live]").forEach((node) => {
      const { key, side } = node.dataset;
      let text;
      if (node.dataset.live === "pct") text = `${price(key)}%`;
      else if (node.dataset.live === "ask") text = `${ask(key, side)}¢`;
      else if (node.dataset.live === "bid") text = `${bid(key, side)}¢`;
      else if (node.dataset.live === "delta") {
        const d = change24h(key);
        node.className = `delta ${d > 0 ? "up" : d < 0 ? "down" : "flat"}`;
        text = d ? `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}` : "0";
      }
      if (text != null && node.textContent !== text) {
        node.textContent = text;
        node.classList.remove("flash");
        void node.offsetWidth;
        node.classList.add("flash");
      }
    });
    updateBalance();
    if (route.view === "event") {
      const event = EVENTS.find((e) => e.id === route.id);
      if (event && !ui.chartHover) drawChart(document.getElementById("event-chart"), chartSeries(event), ui.range, 280);
      const bookEl = document.getElementById("book");
      if (bookEl) bookEl.innerHTML = bookHtml();
      updateTradeSummary();
    } else if (route.view === "portfolio") {
      renderPortfolioData();
    } else {
      const chart = document.getElementById("featured-chart");
      if (chart && !ui.chartHover) drawChart(chart, chartSeries(EVENTS.find((e) => e.id === chart.dataset.event)), "1m", 220);
    }
  }

  // ---------- toasts ----------

  const toasts = document.getElementById("toasts");
  function toast(message, tone = "ok") {
    const el = document.createElement("div");
    el.className = `toast ${tone}`;
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.classList.add("out"), 3200);
    setTimeout(() => el.remove(), 3600);
  }

  // ---------- events ----------

  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const { action } = target.dataset;
    const tr = ui.trade;
    if (action === "lang") {
      lang = target.dataset.lang;
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch (err) {
        /* storage blocked — non-fatal */
      }
      render();
    } else if (action === "watch") {
      const id = target.dataset.event;
      state.watch = state.watch.includes(id) ? state.watch.filter((w) => w !== id) : [...state.watch, id];
      save();
      if (route.view === "list") renderResults(route.cat);
      else render();
    } else if (action === "range") {
      ui.range = target.dataset.range;
      document.querySelectorAll("[data-action=range]").forEach((b) => {
        b.classList.toggle("active", b === target);
        b.setAttribute("aria-pressed", String(b === target));
      });
      const event = EVENTS.find((ev) => ev.id === route.id);
      drawChart(document.getElementById("event-chart"), chartSeries(event), ui.range, 280);
    } else if (action === "bookSide") {
      ui.bookSide = target.dataset.side;
      document.querySelectorAll("[data-action=bookSide]").forEach((b) => {
        b.classList.toggle("active", b === target);
        b.setAttribute("aria-pressed", String(b === target));
      });
      document.getElementById("book").innerHTML = bookHtml();
    } else if (action === "mode") {
      tr.mode = target.dataset.mode;
      tr.count = "";
      renderTradePanel();
    } else if (action === "side") {
      // The side lives in the URL so a re-render (or reload) keeps it.
      const { event, market } = MARKETS.get(tr.key);
      if (tr.mode === "sell") tr.count = "";
      history.replaceState(null, "", eventHref(event, market.id, target.dataset.side));
      render();
    } else if (action === "type") {
      tr.type = target.dataset.type;
      renderTradePanel();
    } else if (action === "quick") {
      tr.amount = String((Number(tr.amount) || 0) + Number(target.dataset.add));
      document.getElementById("f-amount").value = tr.amount;
      updateTradeSummary();
    } else if (action === "sellAll") {
      const pos = state.positions[posKey(tr.key, tr.side)];
      tr.count = pos ? String(pos.n) : "";
      document.getElementById("f-count").value = tr.count;
      updateTradeSummary();
    } else if (action === "submit") {
      submitTrade();
    } else if (action === "cancel") {
      cancelOrder(Number(target.dataset.id));
      toast(t("toastCanceled"));
      updateBalance();
      renderPortfolioData();
    } else if (action === "ptab") {
      ui.ptab = target.dataset.tab;
      render();
    } else if (action === "reset") {
      if (confirm(t("resetConfirm"))) {
        state = freshState();
        save();
        render();
      }
    }
  });

  function submitTrade() {
    const tr = ui.trade;
    const side = sideName(tr.side);
    if (tr.mode === "sell") {
      const fill = marketSell(tr.key, tr.side, Math.floor(Number(tr.count) || 0));
      if (fill) toast(t("toastSold", { n: fill.n, side, p: decimal1(fill.avg) }));
      tr.count = "";
    } else if (tr.type === "limit") {
      const p = Math.floor(Number(tr.limit));
      const { filled, rested } = limitBuy(tr.key, tr.side, p, Math.floor(Number(tr.count)));
      if (filled.n) toast(t("toastBought", { n: filled.n, side, p: decimal1(filled.avg) }));
      if (rested) toast(t("toastPlaced", { n: rested, side, p }));
      tr.count = "";
    } else {
      const fill = marketBuy(tr.key, tr.side, Math.round((Number(tr.amount) || 0) * 100));
      if (fill) toast(t("toastBought", { n: fill.n, side, p: decimal1(fill.avg) }));
      tr.amount = "";
    }
    renderTradePanel();
    refreshLive();
  }

  document.addEventListener("input", (e) => {
    const tr = ui.trade;
    if (e.target.id === "search") {
      ui.q = e.target.value;
      renderResults(route.cat);
    } else if (e.target.id === "f-amount") {
      tr.amount = e.target.value;
      updateTradeSummary();
    } else if (e.target.id === "f-limit") {
      tr.limit = e.target.value;
      updateTradeSummary();
    } else if (e.target.id === "f-count") {
      tr.count = e.target.value;
      updateTradeSummary();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "sort") {
      ui.sort = e.target.value;
      renderResults(route.cat);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.closest("#trade-panel input")) {
      const submit = document.getElementById("trade-submit");
      if (submit && !submit.disabled) submitTrade();
    }
  });

  window.addEventListener("hashchange", () => {
    const prev = route;
    render();
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    const sameEvent = prev.view === "event" && route.view === "event" && prev.id === route.id;
    if (sameEvent && narrow) document.getElementById("trade-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (!sameEvent) window.scrollTo(0, 0);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refreshLive, 150);
  });

  // ---------- market simulation ----------

  const keys = [...MARKETS.keys()];
  setInterval(() => {
    if (document.hidden) return;
    for (let i = 0; i < 4; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const base = MARKETS.get(key).base;
      const m = price(key);
      // Random walk with a gentle pull back toward the starting price.
      const upOdds = 0.5 + clamp((base - m) * 0.03, -0.3, 0.3);
      setPrice(key, m + (Math.random() < upOdds ? 1 : -1));
    }
    fillRestingOrders().forEach((o) => toast(t("toastFilled", { n: o.n, side: sideName(o.side), p: o.p })));
    save();
    refreshLive();
  }, TICK_MS);

  render();
})();

# ZavtraMarket

Website for **ZavtraMarket** — a prediction market (politics, sport, currencies, culture), currently a demo with a waitlist. Domain: `zavtramarkets.com` (`zavtramarket.com` and `zavtra.markets` redirect to it via Porkbun URL forwarding).

Static site, no build step. The home page is a Kalshi-style prediction-market demo with made-up data:

- **Header:** the ZAVTRA logo (rising behind the Earth's curve), nav buttons (Markets, Live, Portfolio, How it works), a global search, the demo balance, a language picker and a "Join waitlist" button that opens a signup dialog.
- **Home:** a featured-market carousel (outcomes, payouts, odds and a chart), category hubs, a trending list, info cards, every market as a card, and a waitlist signup band.
- **Market pages:** a probability chart, an order book, rules and a trade panel (market and limit buys, sell to close).
- **Portfolio:** positions, open orders and history. **Live:** markets whose price moved in the last minute.

Everything runs in the browser: prices tick on a timer, orders fill against a generated order book, and the virtual $1,000 account is kept in `localStorage`. The site is available in Russian (default), Ukrainian, Belarusian and English.

- `index.html`: the page shell (header, footer, waitlist dialog)
- `style.css`: tokens and shared base styles; `app.css`: everything else
- `app.js`: routing, pricing, trading, charts and the views
- `data.js`: the fictional markets; `strings.js`: languages and UI text
- `markets/index.html`: redirects old `/markets/` links to the home page

Asset links in `index.html` carry a `?v=` content hash so browsers never mix a new page with cached old CSS/JS. After changing a CSS or JS file, update its hash (first 8 hex chars of `sha1sum <file>`).

## Before launch

- The waitlist form only validates and shows a confirmation locally — **no email is actually captured yet**. Wire the waitlist `submit` handler in `app.js` up to a real backend, e.g. [Formspree](https://formspree.io), Mailchimp, ConvertKit, or a Supabase table.
- Double-check the regulatory situation for prediction/betting markets in whichever jurisdictions you plan to operate in or target before opening real-money markets.

## Deploy (GitHub Pages)

1. Push this repo to GitHub (`rodion-b/zavtramarkets`).
2. In the repo settings, enable **Pages** for the `main` branch, root directory.
3. `CNAME` already contains `zavtramarkets.com` — point your domain's DNS at GitHub Pages ([docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)):
   - `A` records for the apex domain to GitHub's Pages IPs, or
   - a `CNAME` record from `www` to `<username>.github.io` if you serve from `www` instead.
4. Wait for DNS to propagate and HTTPS to provision in the Pages settings.

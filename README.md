# ZavtraMarket

Landing / waitlist page for **ZavtraMarket** — a prediction market for the Slavic world (politics, sport, currencies, culture). Domain: `zavtramarket.com`.

Static site, no build step: `index.html`, `style.css`, `i18n.js`, `script.js`. Available in Russian (default), Ukrainian, Belarusian and English via a switcher in the header. Each translatable node has a `data-i18n` key; the strings live in `i18n.js`, and `index.html` holds the Russian text so the page reads correctly before JS runs.

## Before launch

- The waitlist form only validates and shows a confirmation locally — **no email is actually captured yet**. Wire `script.js` (`waitlist-form` submit handler) up to a real backend, e.g. [Formspree](https://formspree.io), Mailchimp, ConvertKit, or a Supabase table.
- Swap the placeholder favicon (emoji data URI) for a real one once you have a logo.
- Double-check the regulatory situation for prediction/betting markets in whichever jurisdictions you plan to operate in or target before opening real-money markets.

## Deploy (GitHub Pages)

1. Push this repo to GitHub (e.g. `rodion-b/zavtramarket`).
2. In the repo settings, enable **Pages** for the `main` branch, root directory.
3. `CNAME` already contains `zavtramarket.com` — point your domain's DNS at GitHub Pages ([docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)):
   - `A` records for the apex domain to GitHub's Pages IPs, or
   - a `CNAME` record from `www` to `<username>.github.io` if you serve from `www` instead.
4. Wait for DNS to propagate and HTTPS to provision in the Pages settings.

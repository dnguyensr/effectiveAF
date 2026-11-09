# effectiveAF

[![CI](https://github.com/dnguyensr/effectiveAF/actions/workflows/ci.yml/badge.svg)](https://github.com/dnguyensr/effectiveAF/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

**What does your premium credit card really cost after the perks you actually use?**

👉 **[Open effectiveAF](https://dnguyensr.github.io/effectiveAF/)**

## What it does

Premium cards advertise hundreds of dollars in statement credits, but they come as monthly, quarterly and semi-annual coupons that are easy to forget or that you'd never use anyway. effectiveAF lets you value each credit the way **you** actually use it, then shows:

```text
Effective annual fee = annual fee − the value you really get from each credit
```

If the result is zero or below, the card pays for itself. If not, you'll see how much it still needs to earn back through rewards or other benefits.

- **Nothing is assumed.** Every credit starts as _not set_ and counts $0 until you decide what it's worth: slide or type a value, or mark it _won't use_. Quick presets set every credit to face value, or only travel and dining.
- **Have it or considering it:** mark each card as one you hold (is it worth keeping?) or one you're thinking of signing up for (is it worth getting?). Considered cards show what they _would_ cost and stay out of your wallet total.
- **My wallet:** your cards as tabs, a running total, and a _use it before it resets_ list of credits about to expire this month or period.
- **Compare:** 2 to 5 cards side by side, like a car-trim sheet: similar credits share a row, and "—" means a card doesn't have one.
- **Your own perks and cards:** add credits we don't list, or value non-credit benefits like lounge access; create cards that aren't in the catalog.
- **Break-even spend:** for a card that still costs money, how much you'd need to spend each month in its bonus categories to beat a 2% cash-back card.
- **Forum summary:** a Markdown table to paste when asking whether to keep a card.
- **Works offline** after the first visit, and can be installed to your home screen.

Supported cards:

- American Express Platinum Card
- American Express Gold Card
- Chase Sapphire Preferred
- Chase Sapphire Reserve
- Capital One Venture X

## Privacy

- No accounts, no bank logins, no tracking or analytics.
- Everything runs in your browser. Your valuations are saved in your browser's local storage on your device and are never sent anywhere.
- Clearing your browser data erases them. Use **Back up or restore** in the app to download a file you can restore later or on another device.

## Disclaimer

Card fees and credit amounts come from the issuers' public benefit pages. Each card shows the date its data was last checked, but issuers change benefits often, so always confirm with the issuer. The values you enter are your own estimates. This is not financial advice, and the project is not affiliated with American Express, Chase, Capital One or any other issuer.

## Development

Prerequisites: Node.js 22 or later (see `.nvmrc`). Docker is only needed to update screenshot baselines.

```sh
npm ci                     # install dependencies
npx playwright install     # one-time: download test browsers
npm run dev                # start the dev server at http://localhost:5173/effectiveAF/
```

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `npm test`                           | Unit tests (Vitest)                                       |
| `npm run test:coverage`              | Unit tests with coverage thresholds                       |
| `npm run coverage:check`             | Coverage ratchet: no file may lose coverage               |
| `npm run test:e2e`                   | Playwright end-to-end tests against the production build  |
| `npm run test:e2e:docker`            | Same, inside the Linux Playwright image used by CI        |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript                                       |
| `npm run format`                     | Format with Prettier                                      |
| `npm run licenses:check`             | Fail if any dependency's license isn't GPL-3.0 compatible |
| `npm run verify`                     | Everything CI runs, in order                              |

### Baselines

Three kinds of baseline are committed and checked in CI:

- **Calculation baselines** (`tests/baselines/*.json`): the numbers the app produces for every catalog card. If you change card data or the math, run `npm run baselines:update` and review the diff in your PR.
- **Coverage baseline** (`tests/baselines/coverage.json`): per-file coverage. A file may not drop more than 0.5 points, and new files need at least 90% lines and 85% branches. After adding tests, record higher numbers with `npm run coverage:update`.
- **Screenshot baselines** (`tests/e2e/__screenshots__/`): font rendering differs between operating systems, so these are always generated in Linux. Run `npm run test:e2e:update` (needs Docker) or the **Update screenshots** workflow on GitHub (Actions → Update screenshots → Run workflow on your branch), which commits the new images and re-runs CI. Never use `playwright test --update-snapshots` directly on Windows or macOS.

### Updating card data

Card definitions live in `src/catalog/cards/`. Every change must:

1. Come from the issuer's own benefits page, with `sourceUrl` pointing to it.
2. Update `lastVerified` to the date you checked.
3. Give each perk a `kind` (it decides which comparison row it lines up in) and keep `earnRates` current.
4. Include regenerated calculation baselines (`npm run baselines:update`), with the diff explained in the PR.

## Deployment

Every push to `main` and every pull request runs the full test suite, but deploying is manual for now: in GitHub go to **Actions → CI → Run workflow**, choose `main`, tick **Deploy to GitHub Pages**, and run it. The site is published only if the tests pass. In the repository settings, **Pages → Source** must be set to **GitHub Actions**.

## License

effectiveAF is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE). Third-party components bundled into the app are listed, with their licenses, in `third-party-licenses.txt` (linked from the app's footer).

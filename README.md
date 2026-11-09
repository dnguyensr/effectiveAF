# effectiveAF

[![CI](https://github.com/dnguyensr/effectiveAF/actions/workflows/ci.yml/badge.svg)](https://github.com/dnguyensr/effectiveAF/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

**What does your premium credit card really cost after the perks you actually use?**

👉 **[Open effectiveAF](https://dnguyensr.github.io/effectiveAF/)**

> 🚧 Early development: Phase 1 (five cards, valuations, backups) is built; more cards and features are planned.

## What it does

Premium cards advertise hundreds of dollars in statement credits, but they come as monthly, quarterly and semi-annual coupons that are easy to forget or that you'd never use anyway. effectiveAF lets you value each credit the way **you** actually use it, then shows:

```text
Effective annual fee = annual fee − the value you really get from each credit
```

If the result is zero or below, the card pays for itself. If not, you'll see how much it still needs to earn back through rewards or other benefits.

Supported cards:

- American Express Platinum Card
- American Express Gold Card
- Chase Sapphire Preferred
- Chase Sapphire Reserve
- Capital One Venture X

## Privacy

- No accounts, no bank logins, no tracking or analytics.
- Everything runs in your browser. Your valuations are saved in your browser's local storage on your device and are never sent anywhere.
- Clearing your browser data erases them. Use **Backup** in the app to download a file you can restore later or on another device.

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
| `npm run test:e2e`                   | Playwright end-to-end tests against the production build  |
| `npm run test:e2e:docker`            | Same, inside the Linux Playwright image used by CI        |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript                                       |
| `npm run format`                     | Format with Prettier                                      |
| `npm run licenses:check`             | Fail if any dependency's license isn't GPL-3.0 compatible |
| `npm run verify`                     | Everything CI runs, in order                              |

### Baselines

Two kinds of baseline are committed and checked in CI:

- **Calculation baselines** (`tests/baselines/*.json`): the numbers the app produces for every catalog card. If you change card data or the math, run `npm run baselines:update` and review the diff in your PR.
- **Screenshot baselines** (`tests/e2e/__screenshots__/`): font rendering differs between operating systems, so these are always generated in Linux. Run `npm run test:e2e:update` (needs Docker), never `playwright test --update-snapshots` directly on Windows or macOS.

### Updating card data

Card definitions live in `src/catalog/cards/`. Every change must:

1. Come from the issuer's own benefits page, with `sourceUrl` pointing to it.
2. Update `lastVerified` to the date you checked.
3. Include regenerated calculation baselines (`npm run baselines:update`), with the diff explained in the PR.

## Deployment

Every push to `main` runs the full test suite; if it passes, GitHub Actions builds the site and publishes it to GitHub Pages. In the repository settings, **Pages → Source** must be set to **GitHub Actions**.

## License

effectiveAF is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE). Third-party components bundled into the app are listed, with their licenses, in `third-party-licenses.txt` (linked from the app's footer).

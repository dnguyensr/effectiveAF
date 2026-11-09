// SPDX-License-Identifier: GPL-3.0-or-later
import { formatUsd } from '../core/money';

const REPO_URL = 'https://github.com/dnguyensr/effectiveAF';

export function App() {
  return (
    <>
      <header class="site-header">
        <h1>
          effective<span class="brand-accent">AF</span>
        </h1>
        <p class="tagline">What your credit card really costs after the perks you actually use.</p>
      </header>
      <main>
        <section class="placeholder" aria-labelledby="coming-soon">
          <h2 id="coming-soon">Coming soon</h2>
          <p>
            Effective annual fee = annual fee − the value <em>you</em> get from each credit. For
            example, a {formatUsd(89500)} fee minus {formatUsd(62000)} of credits you&apos;d really
            use is an effective fee of {formatUsd(27500)}.
          </p>
        </section>
      </main>
      <footer class="site-footer">
        <p>Runs entirely in your browser. Nothing you enter leaves your device.</p>
        <p>
          <a href={REPO_URL}>Source code</a> · Licensed under{' '}
          <a href={`${REPO_URL}/blob/main/LICENSE`}>GPL-3.0-or-later</a> ·{' '}
          <a href={`${import.meta.env.BASE_URL}third-party-licenses.txt`}>Third-party notices</a>
        </p>
      </footer>
    </>
  );
}

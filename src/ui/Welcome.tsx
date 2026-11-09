// SPDX-License-Identifier: GPL-3.0-or-later

interface Props {
  onValueCards: () => void;
  onCompare: () => void;
}

/** First visit: pick what you came to do. */
export function Welcome({ onValueCards, onCompare }: Props) {
  return (
    <section class="view welcome" aria-labelledby="welcome-title">
      <h2 id="welcome-title">What would you like to do?</h2>
      <div class="choices">
        <button type="button" class="choice" onClick={onValueCards}>
          <span class="choice-title">Value the cards I have</span>
          <span class="choice-text">
            Set what each credit is really worth to you and see what each card actually costs.
          </span>
        </button>
        <button type="button" class="choice" onClick={onCompare}>
          <span class="choice-title">Compare cards</span>
          <span class="choice-text">
            Line up 2 to 5 cards side by side, credit by credit, before you apply, renew or
            downgrade.
          </span>
        </button>
      </div>
      <p class="hint">
        Nothing is filled in for you: every credit starts at $0 until you decide what it's worth.
        Card credits come from issuers' public pages and change often; always confirm the current
        terms with the issuer before you apply, renew or cancel.
      </p>
    </section>
  );
}

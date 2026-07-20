# Blackjack Trainer

Browser-first blackjack basic-strategy trainer built with React, TypeScript, and Vite.

## Objective

Build a blackjack trainer that runs primarily in the browser. The MVP is client-only: game state, strategy validation, bankroll, settings, audio feedback, and per-configuration stats are all handled locally. A Python backend can be added later if cross-device persistence or user accounts become useful.

## Functional Requirements

- Provide built-in blackjack basic strategy.
- Support strategy configuration by:
  - number of decks: 1, 2, 4, 6, or 8
  - dealer soft 17 rule: dealer hits soft 17 or stands on soft 17
  - surrender availability
  - double-after-split availability
  - Dealer peeks mechancis
- Deal realistic blackjack hands from a finite shoe based on the selected deck count.
- Reshuffle when the shoe reaches a configurable penetration threshold.
- Play hands to completion, including dealer play and bankroll settlement.
- Validate each user decision against the configured basic strategy.
- Support hit, stand, double, split, and surrender when legal.
- Support split hands and play each split hand to completion.
- Allow configurable bets and track fake-money bankroll.
- Allow bankroll replenishment when funds are depleted.
- Track per-configuration stats:
  - hands completed
  - decisions made
  - correct decisions
  - incorrect decisions
  - accuracy percentage
  - bankroll
- Provide audible feedback using browser speech synthesis.
- Allow audio feedback to be enabled or disabled.
- Allow users to emphasize selected hand categories with a target percentage:
  - hard totals
  - soft totals
  - pairs
  - surrender-eligible hands
  - doubles
- Provide an optional strategy-table view in the browser.
- Generate displayed strategy tables from the same strategy data used by the trainer.
- Strategy tables should reflect the selected rules configuration.

## Non-Functional Requirements

- Use a modern TypeScript frontend.
- Keep blackjack rules and strategy logic independent from React components.
- Persist local settings, bankroll, and stats with browser storage.
- Add focused tests for core game and strategy behavior.
- Deploy the static frontend with Terraform-managed S3 and CloudFront.
- Comment code where blackjack rules or TypeScript idioms are not obvious.

## Architecture

```text
src/
  app/             React app shell and view composition
  audio/           Browser speech helpers
  components/      Reusable UI components
  game/            Cards, hands, shoe, table rules, engine, settlement
  persistence/     localStorage-backed settings and stats
  strategy/        Basic strategy lookup and table generation
  styles/          Application CSS
  test/            Unit tests
```

Infrastructure (Terraform) and card art live in a private companion repo,
not here — see [Deployment](#deployment) and [Card art](#card-art) below.

## Card Art

The card art currently in use in the hosted version is licensed from Adobe
Stock (asset ID 675688801 if you're curious) under a standard license.

`src/assets/cards/` is where the app looks for 52 card PNGs (see that 
folder's README for the expected filenames). You will not find them there. 
This is intentional, not an oversight, and definitely not me forgetting to 
`git add` something.

If you're playing the hosted version, you'll notice it has actual card 
faces and looks like a real app. That's because the production build on 
CloudFront serves the licensed PNGs just fine — using stock assets inside 
a running app is exactly what an Adobe Stock Standard license is for. What 
it is emphatically *not* for is me handing out the raw PNG files to anyone 
with a `git clone` command, which is a distinct and much more annoying 
restriction that I have chosen to respect rather than test in court.

Despite my best efforts at creative license-interpretation 
("but they're not the *main* part of the app!"), it turns out redistributing 
the stand-alone files isn't covered — a fact I confirmed by reading the 
actual terms instead of vibing it, which I recommend as a general life 
strategy. The PNGs are `.gitignore`'d here and staying that way, because I 
would like this to remain a hobby project and not an educational anecdote 
in someone's stock-photo-licensing webinar.

The repo version doesn't fall over without them, though: `CardView` 
gracefully falls back to a plain text placeholder (rank + suit symbol) for 
any missing card image, with a console warning, instead of crashing. Clone 
away — you'll just be playing blackjack with the visual flair of a 1997 
teletext service until you sort out art assets.

**To get real card faces locally:**

* **Maintainer (hi, it's me):** copy the PNGs from the private 
  `blackjack-trainer-assets` repo into `src/assets/cards/`.
  The CodePipeline CI takes care of this.
* **Contributor:** source your own deck under a license that won't get 
  either of us a strongly worded email from a company with more lawyers 
  than you have friends — a public-domain or permissively licensed set 
  works great (e.g. the classic Byron Knoll SVG playing-card set, exported 
  to PNG). Drop all 52 files into `src/assets/cards/` using the naming 
  scheme documented there.

**Do not**, under any circumstances, ask me to just "throw the Adobe ones 
in a zip real quick." I like this repo. I like my inbox even more, and I 
would like it to remain free of cease-and-desist letters.

## Design Decisions

Judgment calls made while implementing the requirements above, where the "obvious" reading was ambiguous or where a real-table rule needed to be picked explicitly.

**Settlement rules**
- A 21 made by hitting/splitting into two cards is a plain 21, not a natural blackjack — it doesn't get the 3:2 payout and can push against a dealer's non-natural 21. Only a player's *original* two-card 21 counts as blackjack.
- A natural blackjack on the initial deal settles immediately; no hit/double/surrender is offered on it (previously the app let you hit away a made blackjack).
- Dealer peek is configurable (`dealerPeeksForBlackjack`, default on). When enabled, the dealer's hole card is checked immediately and the round settles before the player acts if it's a blackjack. When disabled, the dealer's blackjack is only discovered at final settlement (no-hole-card style), which can cost extra money on doubled or split bets — matches how some tables actually play.
- Splitting aces deals exactly one card to each resulting hand with no further action (no hit/double/resplit) — the standard casino rule, and not currently configurable.

**Strategy**
- Hard 11 doubles against every upcard except a dealer ace under stand-on-soft-17 rules; under hit-on-soft-17 it doubles against everything, including the ace. This is the one hard-total decision that depends on the soft-17 rule.
- Surrender is never recommended on a soft hand, even when the same total would qualify as a hard hand (e.g., soft 16 vs. 10 never surrenders, but hard 16 vs. 10 does).
- Recommended-action lookups fall back sensibly when a strategy code isn't actually legal at the table — e.g., "double or stand" falls back to stand if doubling isn't allowed, "surrender or hit" falls back to hit if surrender is off.

**Bankroll & betting**
- Blackjack pays 1.5x the bet, surrender costs half the bet, both rounded to the nearest dollar (so a $25 blackjack pays $38, not $37.50).
- The bet size is a standalone control decoupled from table rules — changing it doesn't reset stats or the shoe the way changing a table rule does. It only takes effect on the next deal.

**Shoe behavior**
- The shoe persists across hands and only reshuffles once the configured penetration threshold is hit, rather than a fresh shoe every deal — except in Drill mode (see below), where every hand gets a fresh shoe by design.

**Drill mode**
- Implemented categories so far: soft hands (13–20), pairs (any rank), and surrender-eligible hands (hard 15/16 against the specific upcards where surrender actually applies, adjusted for the soft-17 rule). Hard totals and doubles are called out in the requirements above but aren't broken out as separate drillable categories yet — generic hard totals are already the majority outcome of a normal random deal, so they're implicitly covered by whatever percentage falls through to "normal."
- Each category's weight is an independent 0–100% and they don't need to sum to 100 — leftover probability deals a normal random hand. If they're pushed over 100 combined, they're scaled down proportionally rather than starving whichever category is evaluated last.
- A drilled hand's dealer hole card deliberately avoids completing a blackjack, so the player actually reaches the decision being drilled instead of losing the rep to an instant peek settlement.
- "The shoe is ignored" is interpreted as applying to the whole mode, not just drilled hands — even hands that fall through to "normal" while drill mode is on are dealt from a fresh synthetic shoe, not the continuous one.

**Audio feedback**
- All of the audio cues for a single action (hand total, correct/incorrect feedback, round result) are combined into one `speechSynthesis` utterance instead of separate calls, because `speak()` cancels whatever's currently playing — separate calls were silently clipping each other.
- Hand totals are announced dealer-style ("soft 17") rather than reading the on-screen label verbatim ("17 soft").

**Stats**
- Stats (and bankroll) are persisted per rule-configuration key, not as one global blob — switching decks/rules gives you a separate saved stat line for that exact configuration.

## Known Gaps vs. Requirements

- Drill mode doesn't yet have separate "hard totals" or "doubles" categories (see above).
- No bankroll replenishment control exists yet for when the bankroll is depleted.
- Table rules, drill settings, bet amount, and the audio toggle reset to defaults on reload — only stats/bankroll are persisted to `localStorage` today.

## Backend Decision

AWS Lambda is not necessary for the MVP because the application can run entirely in the browser. If cloud sync is added later, use Python on AWS Lambda behind API Gateway with DynamoDB or S3 for persistence.

## Development

```sh
npm install
npm run dev
npm test
```

## Deployment

Terraform config for the static-site hosting (S3 + CloudFront) lives in
the private `blackjack-trainer-assets` repo, not here, since it's
infra/deployment detail rather than application code. Build the app here,
then apply Terraform from that repo:

```sh
npm run build
# in blackjack-trainer-assets:
#   cd terraform && terraform init && terraform apply
```

That Terraform will create a CI pipeline using CodePipeline and CodeBuild,
the Terraform is only the infrastructure (Route 53 zone, S3 bucket,
CloudFront distribution, CodePipeline itself). The actual code deployment
is handled by that pipeline.
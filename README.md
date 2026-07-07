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
terraform/         Static site deployment
```

## Backend Decision

AWS Lambda is not necessary for the MVP because the application can run entirely in the browser. If cloud sync is added later, use Python on AWS Lambda behind API Gateway with DynamoDB or S3 for persistence.

## Development

```sh
npm install
npm run dev
npm test
```

## Deployment

```sh
npm run build
cd terraform
terraform init
terraform apply
```

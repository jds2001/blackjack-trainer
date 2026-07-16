import type { Card, Rank } from "../game/cards";
import { actionLabels } from "../components/actionLabels";
import type { PlayerAction } from "../game/rules";
import { normalizePairRank, pairRowLabel, type StrategySection } from "./strategyTables";
import type { DealerUpcard, StrategyCode, StrategyInput } from "./strategyTypes";

const pairRankNames: Partial<Record<Rank, string>> = {
  A: "Aces",
  J: "Jacks",
  Q: "Queens",
  K: "Kings"
};

export function pairRankDisplayName(rank: Rank): string {
  return pairRankNames[rank] ?? `${rank}s`;
}

export type StrategyTarget = {
  section: StrategySection;
  /** Matches a `hand` label in the generated reference table, for row lookup/highlighting. */
  rowLabel: string;
  /** Human-readable hand classification, e.g. "Hard 16", "Pair of Kings". */
  displayLabel: string;
  upcard: DealerUpcard;
};

export function classifyStrategyInput(input: StrategyInput): Omit<StrategyTarget, "upcard"> {
  if (input.isPair && input.pairRank) {
    const normalized = normalizePairRank(input.pairRank);
    return {
      section: "pairs",
      rowLabel: pairRowLabel(normalized),
      displayLabel: `Pair of ${pairRankDisplayName(input.pairRank)}`
    };
  }

  if (input.isSoft) {
    const label = `Soft ${input.playerTotal}`;
    return { section: "softTotals", rowLabel: label, displayLabel: label };
  }

  const label = `Hard ${input.playerTotal}`;
  return { section: "hardTotals", rowLabel: label, displayLabel: label };
}

export function strategyTargetFor(input: StrategyInput): StrategyTarget {
  return { ...classifyStrategyInput(input), upcard: input.dealerUpcard };
}

/**
 * Identifies a single pending decision so the UI can tell "not yet answered" from "answered a
 * different decision". Keyed off the hand's actual cards rather than its strategy classification,
 * since classification (total/pair) can repeat across draws — e.g. resplitting into another pair of 8s.
 */
export function decisionKey(handIndex: number, cards: Card[]): string {
  return [handIndex, ...cards.map((card) => `${card.rank}${card.suit}`)].join(":");
}

export function actionFullLabel(action: PlayerAction): string {
  return actionLabels[action];
}

const strategyCodeFullLabels: Record<StrategyCode, string> = {
  H: "Hit",
  S: "Stand",
  D: "Double (hit if double isn't allowed)",
  Ds: "Double (stand if double isn't allowed)",
  P: "Split",
  Rh: "Surrender (hit if surrender isn't allowed)",
  Rs: "Surrender (stand if surrender isn't allowed)"
};

export function strategyCodeFullLabel(code: StrategyCode): string {
  return strategyCodeFullLabels[code];
}

export const strategyCodeLegend: { code: StrategyCode; label: string }[] = (
  Object.keys(strategyCodeFullLabels) as StrategyCode[]
).map((code) => ({ code, label: strategyCodeFullLabels[code] }));

import type { Rank } from "../game/cards";
import type { TableRules } from "../game/rules";
import { getBasicStrategy } from "./basicStrategy";
import type { DealerUpcard, StrategyCode, StrategyInput } from "./strategyTypes";

export const dealerUpcards: DealerUpcard[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

export type StrategyTables = {
  hardTotals: StrategyTableRow[];
  softTotals: StrategyTableRow[];
  pairs: StrategyTableRow[];
};

export type StrategySection = keyof StrategyTables;

export type StrategyTableRow = {
  hand: string;
} & Record<DealerUpcard, StrategyCode>;

export const pairRanks: Rank[] = ["A", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

/** Face cards share a pair-strategy row with 10s, so lookups against the generated table must normalize to "10". */
export function normalizePairRank(rank: Rank): Rank {
  return rank === "J" || rank === "Q" || rank === "K" ? "10" : rank;
}

export function pairRowLabel(rank: Rank): string {
  return `${rank},${rank}`;
}

export function generateStrategyTable(rules: TableRules): StrategyTables {
  return {
    hardTotals: range(5, 17).map((total) =>
      generateRowForHand(
        `Hard ${total}`,
        { playerTotal: total, isSoft: false, isPair: false, canDouble: true, canSplit: false, canSurrender: true },
        rules
      )
    ),
    softTotals: range(13, 20).map((total) =>
      generateRowForHand(
        `Soft ${total}`,
        { playerTotal: total, isSoft: true, isPair: false, canDouble: true, canSplit: false, canSurrender: false },
        rules
      )
    ),
    pairs: pairRanks.map((rank) =>
      generateRowForHand(
        pairRowLabel(rank),
        {
          playerTotal: rank === "A" ? 12 : pairTotal(rank),
          isSoft: rank === "A",
          isPair: true,
          pairRank: rank,
          canDouble: true,
          canSplit: true,
          canSurrender: false
        },
        rules
      )
    )
  };
}

/** Shared row builder: both the reference tables and the in-game contextual strategy row go through this. */
export function generateRowForHand(
  label: string,
  input: Omit<StrategyInput, "dealerUpcard">,
  rules: TableRules
): StrategyTableRow {
  return dealerUpcards.reduce<StrategyTableRow>(
    (result, upcard) => {
      result[upcard] = getBasicStrategy({ ...input, dealerUpcard: upcard }, rules);
      return result;
    },
    { hand: label } as StrategyTableRow
  );
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function pairTotal(rank: Rank) {
  if (["10", "J", "Q", "K"].includes(rank)) return 20;
  return Number(rank) * 2;
}

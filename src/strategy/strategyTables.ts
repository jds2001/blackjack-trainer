import type { Rank } from "../game/cards";
import type { TableRules } from "../game/rules";
import { getBasicStrategy } from "./basicStrategy";
import type { DealerUpcard, StrategyCode } from "./strategyTypes";

export const dealerUpcards: DealerUpcard[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

export type StrategyTables = {
  hardTotals: StrategyTableRow[];
  softTotals: StrategyTableRow[];
  pairs: StrategyTableRow[];
};

export type StrategyTableRow = {
  hand: string;
} & Record<DealerUpcard, StrategyCode>;

export function generateStrategyTable(rules: TableRules): StrategyTables {
  return {
    hardTotals: range(5, 17).map((total) => row(`Hard ${total}`, (dealerUpcard) => getBasicStrategy({
      playerTotal: total,
      isSoft: false,
      isPair: false,
      dealerUpcard,
      canDouble: true,
      canSplit: false,
      canSurrender: true
    }, rules))),
    softTotals: range(13, 20).map((total) => row(`Soft ${total}`, (dealerUpcard) => getBasicStrategy({
      playerTotal: total,
      isSoft: true,
      isPair: false,
      dealerUpcard,
      canDouble: true,
      canSplit: false,
      canSurrender: false
    }, rules))),
    pairs: (["A", "10", "9", "8", "7", "6", "5", "4", "3", "2"] as Rank[]).map((rank) =>
      row(`${rank},${rank}`, (dealerUpcard) => getBasicStrategy({
        playerTotal: rank === "A" ? 12 : pairTotal(rank),
        isSoft: rank === "A",
        isPair: true,
        pairRank: rank,
        dealerUpcard,
        canDouble: true,
        canSplit: true,
        canSurrender: false
      }, rules))
    )
  };
}

function row(label: string, strategyFor: (dealerUpcard: DealerUpcard) => StrategyCode) {
  return dealerUpcards.reduce<StrategyTableRow>(
    (result, upcard) => {
      result[upcard] = strategyFor(upcard);
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

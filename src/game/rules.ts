export type DeckCount = 1 | 2 | 4 | 6 | 8;
export type PlayerAction = "hit" | "stand" | "double" | "split" | "surrender";

export type TableRules = {
  deckCount: DeckCount;
  dealerHitsSoft17: boolean;
  dealerPeeksForBlackjack: boolean;
  surrenderAllowed: boolean;
  doubleAfterSplit: boolean;
  maxSplitHands: number;
  startingBankroll: number;
  defaultBet: number;
};

export const defaultRules: TableRules = {
  deckCount: 6,
  dealerHitsSoft17: false,
  dealerPeeksForBlackjack: true,
  surrenderAllowed: true,
  doubleAfterSplit: true,
  maxSplitHands: 4,
  startingBankroll: 1000,
  defaultBet: 25
};

export function rulesKey(rules: TableRules) {
  return [
    `${rules.deckCount}d`,
    rules.dealerHitsSoft17 ? "h17" : "s17",
    rules.dealerPeeksForBlackjack ? "peek" : "nopeek",
    rules.surrenderAllowed ? "sur" : "nosur",
    rules.doubleAfterSplit ? "das" : "nodas"
  ].join(":");
}

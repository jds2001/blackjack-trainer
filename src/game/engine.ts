import type { Card } from "./cards";
import { canSplit } from "./hand";
import type { PlayerAction, TableRules } from "./rules";
import { createShoe, drawCard, type Shoe } from "./shoe";

export type PlayerHandState = {
  cards: Card[];
  bet: number;
  legalActions: PlayerAction[];
  hasActed: boolean;
};

export type RoundState = {
  shoe: Shoe;
  dealerHand: Card[];
  playerHands: PlayerHandState[];
  activeHandIndex: number;
};

export function createInitialRound(rules: TableRules): RoundState {
  const shoe = createShoe(rules.deckCount);
  const playerCards = [drawCard(shoe), drawCard(shoe)];
  const dealerHand = [drawCard(shoe), drawCard(shoe)];

  return {
    shoe,
    dealerHand,
    activeHandIndex: 0,
    playerHands: [
      {
        cards: playerCards,
        bet: rules.defaultBet,
        legalActions: legalActionsForHand(playerCards, rules, false),
        hasActed: false
      }
    ]
  };
}

export function legalActionsForHand(hand: Card[], rules: TableRules, isSplitHand: boolean): PlayerAction[] {
  const actions: PlayerAction[] = ["hit", "stand"];
  if (hand.length === 2) actions.push("double");
  if (rules.surrenderAllowed && hand.length === 2 && !isSplitHand) actions.push("surrender");
  if (canSplit(hand)) actions.push("split");
  return actions;
}

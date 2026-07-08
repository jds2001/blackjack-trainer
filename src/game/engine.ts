import type { Card } from "./cards";
import { bestHandValue, canSplit, isBust, isSoftHand } from "./hand";
import type { PlayerAction, TableRules } from "./rules";
import { settleHand, type Settlement } from "./settlement";
import { createShoe, drawCard, type Shoe } from "./shoe";

export type PlayerHandState = {
  cards: Card[];
  bet: number;
  legalActions: PlayerAction[];
  hasActed: boolean;
  isSurrendered: boolean;
};

export type RoundState = {
  shoe: Shoe;
  dealerHand: Card[];
  playerHands: PlayerHandState[];
  activeHandIndex: number;
  status: "playing" | "settled";
  result?: Settlement | "surrender";
  message: string;
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
        hasActed: false,
        isSurrendered: false
      }
    ],
    status: "playing",
    message: "Choose the best play."
  };
}

export function legalActionsForHand(hand: Card[], rules: TableRules, isSplitHand: boolean): PlayerAction[] {
  const actions: PlayerAction[] = ["hit", "stand"];
  if (hand.length === 2) actions.push("double");
  if (rules.surrenderAllowed && hand.length === 2 && !isSplitHand) actions.push("surrender");
  if (canSplit(hand)) actions.push("split");
  return actions;
}

export function applyPlayerAction(round: RoundState, action: PlayerAction, rules: TableRules): RoundState {
  if (round.status === "settled") return round;

  const activeHand = round.playerHands[round.activeHandIndex];
  if (!activeHand.legalActions.includes(action)) return round;

  if (action === "hit") {
    return hitActiveHand(round, rules);
  }

  if (action === "double") {
    const shoe = cloneShoe(round.shoe);
    const cards = [...activeHand.cards, drawCard(shoe)];
    const playerHands = replaceActiveHand(round, {
      ...activeHand,
      cards,
      bet: activeHand.bet * 2,
      legalActions: [],
      hasActed: true
    });

    if (isBust(cards)) {
      return settleRound({ ...round, shoe, playerHands }, rules, "Player busts after doubling.");
    }

    return settleRound({ ...round, shoe, playerHands }, rules, "Player doubles.");
  }

  if (action === "stand") {
    const playerHands = replaceActiveHand(round, {
      ...activeHand,
      legalActions: [],
      hasActed: true
    });
    return settleRound({ ...round, playerHands }, rules, "Player stands.");
  }

  if (action === "surrender") {
    const playerHands = replaceActiveHand(round, {
      ...activeHand,
      legalActions: [],
      hasActed: true,
      isSurrendered: true
    });
    return {
      ...round,
      playerHands,
      status: "settled",
      result: "surrender",
      message: "Player surrenders."
    };
  }

  return {
    ...round,
    message: "Split support is scaffolded but not wired yet."
  };
}

function hitActiveHand(round: RoundState, rules: TableRules): RoundState {
  const shoe = cloneShoe(round.shoe);
  const activeHand = round.playerHands[round.activeHandIndex];
  const cards = [...activeHand.cards, drawCard(shoe)];
  const playerHands = replaceActiveHand(round, {
    ...activeHand,
    cards,
    legalActions: isBust(cards) ? [] : legalActionsForHand(cards, rules, false),
    hasActed: true
  });

  if (isBust(cards)) {
    return settleRound({ ...round, shoe, playerHands }, rules, "Player busts.");
  }

  return {
    ...round,
    shoe,
    playerHands,
    message: "Choose the next play."
  };
}

function settleRound(round: RoundState, rules: TableRules, message: string): RoundState {
  const shoe = cloneShoe(round.shoe);
  const dealerHand = playDealerHand([...round.dealerHand], shoe, rules);
  const result = settleHand(round.playerHands[round.activeHandIndex].cards, dealerHand);

  return {
    ...round,
    shoe,
    dealerHand,
    status: "settled",
    result,
    message: `${message} ${resultMessage(result)}`
  };
}

function playDealerHand(dealerHand: Card[], shoe: Shoe, rules: TableRules) {
  while (shouldDealerDraw(dealerHand, rules)) {
    dealerHand.push(drawCard(shoe));
  }
  return dealerHand;
}

function shouldDealerDraw(dealerHand: Card[], rules: TableRules) {
  const total = bestHandValue(dealerHand);
  if (total < 17) return true;
  return total === 17 && rules.dealerHitsSoft17 && isSoftHand(dealerHand);
}

function resultMessage(result: Settlement) {
  return {
    blackjack: "Blackjack pays.",
    loss: "Dealer wins.",
    push: "Push.",
    win: "Player wins."
  }[result];
}

function replaceActiveHand(round: RoundState, hand: PlayerHandState) {
  return round.playerHands.map((existingHand, index) => (index === round.activeHandIndex ? hand : existingHand));
}

function cloneShoe(shoe: Shoe): Shoe {
  return {
    ...shoe,
    cards: [...shoe.cards]
  };
}

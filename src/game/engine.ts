import type { Card } from "./cards";
import { dealDrillHand, pickDrillCategory, type DrillCategory, type DrillSettings } from "./drill";
import { bestHandValue, canSplit, isBlackjack, isBust, isSoftHand } from "./hand";
import type { PlayerAction, TableRules } from "./rules";
import { settleHand, type Settlement } from "./settlement";
import { createShoe, drawCard, shouldReshuffle, type Shoe } from "./shoe";
import { getBasicStrategy } from "../strategy/basicStrategy";
import { rankToDealerUpcard, strategyCodeToAction, type StrategyCode, type StrategyInput } from "../strategy/strategyTypes";

export type HandResult = Settlement | "surrender";

export type StrategyPreview = {
  handIndex: number;
  input: StrategyInput;
  code: StrategyCode;
  recommendedAction: PlayerAction;
  /** Identifies the exact cards this decision was made on, since a hand's classification (total/pair) can repeat across draws — e.g. resplitting into another pair of 8s. */
  cards: Card[];
};

export type ActionEvaluation = StrategyPreview & {
  playerAction: PlayerAction;
  wasCorrect: boolean;
};

export type PlayerHandState = {
  cards: Card[];
  bet: number;
  legalActions: PlayerAction[];
  hasActed: boolean;
  isSurrendered: boolean;
  isSplitHand: boolean;
  result?: HandResult;
};

export type RoundState = {
  shoe: Shoe;
  dealerHand: Card[];
  playerHands: PlayerHandState[];
  activeHandIndex: number;
  status: "playing" | "settled";
  result?: HandResult;
  message: string;
  drillCategory?: DrillCategory;
};

export function nextShoeFor(round: RoundState, rules: TableRules): Shoe {
  return shouldReshuffle(round.shoe, rules.deckCount) ? createShoe(rules.deckCount) : round.shoe;
}

export function createInitialRound(rules: TableRules, previousShoe?: Shoe): RoundState {
  const shoe = cloneShoe(previousShoe ?? createShoe(rules.deckCount));
  const playerCards = [drawCard(shoe), drawCard(shoe)];
  const dealerHand = [drawCard(shoe), drawCard(shoe)];
  return finalizeInitialDeal(rules, shoe, playerCards, dealerHand);
}

export function createDrillRound(rules: TableRules, drillSettings: DrillSettings): RoundState {
  const category = pickDrillCategory(drillSettings, rules);
  const drilled = category ? dealDrillHand(category, rules) : null;
  const shoe = createShoe(rules.deckCount);

  if (!drilled) {
    const playerCards = [drawCard(shoe), drawCard(shoe)];
    const dealerHand = [drawCard(shoe), drawCard(shoe)];
    return finalizeInitialDeal(rules, shoe, playerCards, dealerHand);
  }

  return finalizeInitialDeal(rules, shoe, drilled.playerCards, drilled.dealerCards, category ?? undefined);
}

function finalizeInitialDeal(
  rules: TableRules,
  shoe: Shoe,
  playerCards: Card[],
  dealerHand: Card[],
  drillCategory?: DrillCategory
): RoundState {
  const round: RoundState = {
    shoe,
    dealerHand,
    activeHandIndex: 0,
    playerHands: [
      {
        cards: playerCards,
        bet: rules.defaultBet,
        legalActions: legalActionsForHand(playerCards, rules, false, 1),
        hasActed: false,
        isSurrendered: false,
        isSplitHand: false
      }
    ],
    status: "playing",
    message: "Choose the best play.",
    drillCategory
  };

  if (rules.dealerPeeksForBlackjack && isBlackjack(dealerHand)) {
    const playerHands = replaceActiveHand(round, {
      ...round.playerHands[0],
      legalActions: [],
      hasActed: true
    });
    return settleRound({ ...round, playerHands }, rules, "Dealer peeks and has blackjack.");
  }

  if (isBlackjack(playerCards)) {
    const playerHands = replaceActiveHand(round, {
      ...round.playerHands[0],
      legalActions: [],
      hasActed: true
    });
    return settleRound({ ...round, playerHands }, rules, "Player has blackjack.");
  }

  return round;
}

export function legalActionsForHand(
  hand: Card[],
  rules: TableRules,
  isSplitHand: boolean,
  handCount: number
): PlayerAction[] {
  const actions: PlayerAction[] = ["hit", "stand"];

  if (hand.length === 2 && (!isSplitHand || rules.doubleAfterSplit)) {
    actions.push("double");
  }

  if (rules.surrenderAllowed && hand.length === 2 && !isSplitHand) {
    actions.push("surrender");
  }

  if (canSplit(hand) && handCount < rules.maxSplitHands) {
    actions.push("split");
  }

  return actions;
}

/**
 * Derives the recommendation for whatever decision is currently pending, without regard to any
 * particular action the player might take. Returns null when there's no decision to make right now
 * (round settled, or the active hand has no legal actions).
 */
export function previewActiveHandStrategy(round: RoundState, rules: TableRules): StrategyPreview | null {
  if (round.status === "settled") return null;

  const activeHand = round.playerHands[round.activeHandIndex];
  if (!activeHand || activeHand.legalActions.length === 0) return null;

  const input = buildStrategyInput(activeHand, round.dealerHand[0]);
  const code = getBasicStrategy(input, rules);
  const recommendedAction = strategyCodeToAction(code, input);

  return { handIndex: round.activeHandIndex, input, code, recommendedAction, cards: activeHand.cards };
}

export function evaluateAction(round: RoundState, action: PlayerAction, rules: TableRules): ActionEvaluation | null {
  const activeHand = round.playerHands[round.activeHandIndex];
  if (round.status === "settled" || !activeHand?.legalActions.includes(action)) return null;

  const preview = previewActiveHandStrategy(round, rules);
  if (!preview) return null;

  return {
    ...preview,
    playerAction: action,
    wasCorrect: preview.recommendedAction === action
  };
}

export function buildStrategyInput(hand: PlayerHandState, dealerUpcard: Card): StrategyInput {
  const isPair = hand.cards.length === 2 && canSplit(hand.cards);
  return {
    playerTotal: bestHandValue(hand.cards),
    isSoft: isSoftHand(hand.cards),
    isPair,
    pairRank: isPair ? hand.cards[0].rank : undefined,
    dealerUpcard: rankToDealerUpcard(dealerUpcard.rank),
    canDouble: hand.legalActions.includes("double"),
    canSplit: hand.legalActions.includes("split"),
    canSurrender: hand.legalActions.includes("surrender")
  };
}

export function payoutForResult(result: HandResult, bet: number): number {
  if (result === "win") return bet;
  if (result === "loss") return -bet;
  if (result === "push") return 0;
  if (result === "blackjack") return Math.round(bet * 1.5);
  return -Math.round(bet / 2);
}

export function applyPlayerAction(round: RoundState, action: PlayerAction, rules: TableRules): RoundState {
  if (round.status === "settled") return round;

  const activeHand = round.playerHands[round.activeHandIndex];
  if (!activeHand.legalActions.includes(action)) return round;

  if (action === "hit") {
    return hitActiveHand(round, rules);
  }

  if (action === "double") {
    return doubleActiveHand(round, rules);
  }

  if (action === "stand") {
    const playerHands = replaceActiveHand(round, {
      ...activeHand,
      legalActions: [],
      hasActed: true
    });
    return advanceAfterCompletedHand({ ...round, playerHands }, rules, "Player stands.");
  }

  if (action === "surrender") {
    const playerHands = replaceActiveHand(round, {
      ...activeHand,
      legalActions: [],
      hasActed: true,
      isSurrendered: true,
      result: "surrender"
    });
    return advanceAfterCompletedHand({ ...round, playerHands }, rules, "Player surrenders.");
  }

  return splitActiveHand(round, rules);
}

function hitActiveHand(round: RoundState, rules: TableRules): RoundState {
  const shoe = cloneShoe(round.shoe);
  const activeHand = round.playerHands[round.activeHandIndex];
  const cards = [...activeHand.cards, drawCard(shoe)];
  const isHandBust = isBust(cards);
  const playerHands = replaceActiveHand(round, {
    ...activeHand,
    cards,
    legalActions: isHandBust ? [] : legalActionsForHand(cards, rules, activeHand.isSplitHand, round.playerHands.length),
    hasActed: true,
    result: isHandBust ? "loss" : undefined
  });

  if (isHandBust) {
    return advanceAfterCompletedHand({ ...round, shoe, playerHands }, rules, "Player busts.");
  }

  return {
    ...round,
    shoe,
    playerHands,
    message: "Choose the next play."
  };
}

function doubleActiveHand(round: RoundState, rules: TableRules): RoundState {
  const shoe = cloneShoe(round.shoe);
  const activeHand = round.playerHands[round.activeHandIndex];
  const cards = [...activeHand.cards, drawCard(shoe)];
  const isHandBust = isBust(cards);
  const playerHands = replaceActiveHand(round, {
    ...activeHand,
    cards,
    bet: activeHand.bet * 2,
    legalActions: [],
    hasActed: true,
    result: isHandBust ? "loss" : undefined
  });

  return advanceAfterCompletedHand(
    { ...round, shoe, playerHands },
    rules,
    isHandBust ? "Player busts after doubling." : "Player doubles."
  );
}

function splitActiveHand(round: RoundState, rules: TableRules): RoundState {
  const shoe = cloneShoe(round.shoe);
  const activeHand = round.playerHands[round.activeHandIndex];
  const [firstCard, secondCard] = activeHand.cards;
  const isSplittingAces = firstCard.rank === "A";
  const firstHandCards = [firstCard, drawCard(shoe)];
  const secondHandCards = [secondCard, drawCard(shoe)];
  const newHandCount = round.playerHands.length + 1;

  const firstHand: PlayerHandState = {
    ...activeHand,
    cards: firstHandCards,
    legalActions: isSplittingAces ? [] : legalActionsForHand(firstHandCards, rules, true, newHandCount),
    hasActed: isSplittingAces,
    isSurrendered: false,
    isSplitHand: true,
    result: undefined
  };

  const secondHand: PlayerHandState = {
    cards: secondHandCards,
    bet: activeHand.bet,
    legalActions: isSplittingAces ? [] : legalActionsForHand(secondHandCards, rules, true, newHandCount),
    hasActed: isSplittingAces,
    isSurrendered: false,
    isSplitHand: true
  };

  const splitRound: RoundState = {
    ...round,
    shoe,
    playerHands: [
      ...round.playerHands.slice(0, round.activeHandIndex),
      firstHand,
      secondHand,
      ...round.playerHands.slice(round.activeHandIndex + 1)
    ],
    message: `Hand ${round.activeHandIndex + 1} split. Play the first split hand.`
  };

  if (isSplittingAces) {
    return advanceAfterCompletedHand(splitRound, rules, "Split aces receive one card each.");
  }

  return splitRound;
}

function advanceAfterCompletedHand(round: RoundState, rules: TableRules, message: string): RoundState {
  const nextHandIndex = round.playerHands.findIndex((hand, index) => index > round.activeHandIndex && !hand.hasActed);

  if (nextHandIndex !== -1) {
    return {
      ...round,
      activeHandIndex: nextHandIndex,
      message: `${message} Play hand ${nextHandIndex + 1}.`
    };
  }

  return settleRound(round, rules, message);
}

function settleRound(round: RoundState, rules: TableRules, message: string): RoundState {
  const shoe = cloneShoe(round.shoe);
  const dealerMustPlay = round.playerHands.some((hand) => !hand.isSurrendered && !isBust(hand.cards));
  const dealerHand = dealerMustPlay ? playDealerHand([...round.dealerHand], shoe, rules) : round.dealerHand;
  const playerHands = round.playerHands.map((hand) => ({
    ...hand,
    legalActions: [],
    hasActed: true,
    result: hand.result ?? (hand.isSurrendered ? "surrender" : settleHand(hand.cards, dealerHand, hand.isSplitHand))
  }));
  const summary = playerHands.map((hand, index) => `Hand ${index + 1}: ${resultMessage(hand.result!)}`).join(" ");

  return {
    ...round,
    shoe,
    dealerHand,
    playerHands,
    status: "settled",
    result: playerHands[round.activeHandIndex]?.result,
    message: `${message} ${summary}`
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

function resultMessage(result: HandResult) {
  return {
    blackjack: "blackjack pays",
    loss: "dealer wins",
    push: "push",
    surrender: "surrender",
    win: "player wins"
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

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../game/cards";
import {
  applyPlayerAction,
  createInitialRound,
  evaluateAction,
  nextShoeFor,
  payoutForResult,
  previewActiveHandStrategy,
  type RoundState
} from "../game/engine";
import { defaultRules } from "../game/rules";
import * as shoeModule from "../game/shoe";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("split hand flow", () => {
  it("splits a pair into two playable hands and settles after both are complete", () => {
    const round: RoundState = {
      shoe: {
        cards: [card("5", "clubs"), card("6", "hearts")],
        penetration: 0.75
      },
      dealerHand: [card("10", "spades"), card("7", "diamonds")],
      playerHands: [
        {
          cards: [card("8", "spades"), card("8", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "surrender", "split"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: false
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Choose the best play."
    };

    const splitRound = applyPlayerAction(round, "split", defaultRules);

    expect(splitRound.playerHands).toHaveLength(2);
    expect(splitRound.playerHands[0].cards).toHaveLength(2);
    expect(splitRound.playerHands[1].cards).toHaveLength(2);
    expect(splitRound.activeHandIndex).toBe(0);
    expect(splitRound.status).toBe("playing");

    const secondHandRound = applyPlayerAction(splitRound, "stand", defaultRules);
    expect(secondHandRound.activeHandIndex).toBe(1);
    expect(secondHandRound.status).toBe("playing");

    const settledRound = applyPlayerAction(secondHandRound, "stand", defaultRules);
    expect(settledRound.status).toBe("settled");
    expect(settledRound.playerHands.every((hand) => hand.result)).toBe(true);
  });

  it("does not pay a split hand's 21 as a natural blackjack", () => {
    const round: RoundState = {
      shoe: {
        cards: [card("10", "diamonds")],
        penetration: 0.75
      },
      dealerHand: [card("6", "hearts"), card("5", "spades")],
      playerHands: [
        {
          cards: [card("A", "spades"), card("10", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: true
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Choose the best play."
    };

    const settledRound = applyPlayerAction(round, "stand", defaultRules);

    expect(settledRound.dealerHand.map((c) => c.rank)).toEqual(["6", "5", "10"]);
    expect(settledRound.playerHands[0].result).toBe("push");
  });
});

describe("natural blackjack", () => {
  it("settles immediately and offers no further actions", () => {
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("A", "spades"))
      .mockReturnValueOnce(card("K", "hearts"))
      .mockReturnValueOnce(card("10", "clubs"))
      .mockReturnValueOnce(card("7", "diamonds"));

    const round = createInitialRound(defaultRules);

    expect(round.status).toBe("settled");
    expect(round.playerHands[0].legalActions).toEqual([]);
    expect(round.playerHands[0].result).toBe("blackjack");
  });
});

describe("dealer peek", () => {
  it("settles immediately when the dealer peeks and has blackjack", () => {
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("9", "clubs"))
      .mockReturnValueOnce(card("7", "diamonds"))
      .mockReturnValueOnce(card("A", "spades"))
      .mockReturnValueOnce(card("K", "hearts"));

    const round = createInitialRound({ ...defaultRules, dealerPeeksForBlackjack: true });

    expect(round.status).toBe("settled");
    expect(round.playerHands[0].legalActions).toEqual([]);
    expect(round.playerHands[0].result).toBe("loss");
    expect(round.message).toContain("Dealer peeks");
  });

  it("does not settle immediately when peek is disabled, even with a dealer blackjack", () => {
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("9", "clubs"))
      .mockReturnValueOnce(card("7", "diamonds"))
      .mockReturnValueOnce(card("A", "spades"))
      .mockReturnValueOnce(card("K", "hearts"));

    const round = createInitialRound({ ...defaultRules, dealerPeeksForBlackjack: false });

    expect(round.status).toBe("playing");
    expect(round.playerHands[0].legalActions.length).toBeGreaterThan(0);
  });

  it("still pushes when both the dealer and player peek into a blackjack", () => {
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("A", "clubs"))
      .mockReturnValueOnce(card("K", "diamonds"))
      .mockReturnValueOnce(card("A", "spades"))
      .mockReturnValueOnce(card("Q", "hearts"));

    const round = createInitialRound({ ...defaultRules, dealerPeeksForBlackjack: true });

    expect(round.status).toBe("settled");
    expect(round.playerHands[0].result).toBe("push");
  });
});

describe("split aces", () => {
  it("deals one card to each hand and settles without offering further action", () => {
    const round: RoundState = {
      shoe: {
        cards: [card("6", "diamonds"), card("9", "clubs")],
        penetration: 0.75
      },
      dealerHand: [card("10", "hearts"), card("7", "spades")],
      playerHands: [
        {
          cards: [card("A", "spades"), card("A", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "split"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: false
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Choose the best play."
    };

    const settledRound = applyPlayerAction(round, "split", defaultRules);

    expect(settledRound.status).toBe("settled");
    expect(settledRound.playerHands).toHaveLength(2);
    expect(settledRound.playerHands[0].cards).toHaveLength(2);
    expect(settledRound.playerHands[1].cards).toHaveLength(2);
    expect(settledRound.playerHands[0].legalActions).toEqual([]);
    expect(settledRound.playerHands[1].legalActions).toEqual([]);
    expect(settledRound.message).toContain("Split aces receive one card each.");
  });
});

describe("evaluateAction", () => {
  const round: RoundState = {
    shoe: { cards: [], penetration: 0.75 },
    dealerHand: [card("A", "spades"), card("6", "hearts")],
    playerHands: [
      {
        cards: [card("3", "clubs"), card("7", "clubs")],
        bet: 25,
        legalActions: ["hit", "stand", "double", "surrender"],
        hasActed: false,
        isSurrendered: false,
        isSplitHand: false
      }
    ],
    activeHandIndex: 0,
    status: "playing",
    message: "Choose the best play."
  };

  it("flags an incorrect decision and names the recommended action", () => {
    const evaluation = evaluateAction(round, "stand", defaultRules);
    expect(evaluation).not.toBeNull();
    expect(evaluation!.wasCorrect).toBe(false);
    expect(evaluation!.recommendedAction).toBe("hit");
  });

  it("flags a correct decision", () => {
    const evaluation = evaluateAction(round, "hit", defaultRules);
    expect(evaluation).not.toBeNull();
    expect(evaluation!.wasCorrect).toBe(true);
  });

  it("returns null for an action that isn't currently legal", () => {
    const settledRound: RoundState = { ...round, status: "settled" };
    expect(evaluateAction(settledRound, "hit", defaultRules)).toBeNull();
  });
});

describe("previewActiveHandStrategy", () => {
  it("returns the recommendation for the pending decision", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts")],
      playerHands: [
        {
          cards: [card("K", "clubs"), card("6", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "surrender"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: false
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Choose the best play."
    };

    const preview = previewActiveHandStrategy(round, defaultRules);

    expect(preview).not.toBeNull();
    expect(preview!.handIndex).toBe(0);
    expect(preview!.input.playerTotal).toBe(16);
    expect(preview!.input.isSoft).toBe(false);
    expect(preview!.code).toBe("Rh");
    expect(preview!.recommendedAction).toBe("surrender");
  });

  it("returns null once the round is settled", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts")],
      playerHands: [
        {
          cards: [card("K", "clubs"), card("6", "clubs")],
          bet: 25,
          legalActions: [],
          hasActed: true,
          isSurrendered: false,
          isSplitHand: false,
          result: "loss"
        }
      ],
      activeHandIndex: 0,
      status: "settled",
      message: "Dealer wins."
    };

    expect(previewActiveHandStrategy(round, defaultRules)).toBeNull();
  });

  it("returns null when the active hand has no legal actions, even mid-round", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts")],
      playerHands: [
        {
          cards: [card("K", "clubs"), card("6", "clubs"), card("K", "hearts")],
          bet: 25,
          legalActions: [],
          hasActed: true,
          isSurrendered: false,
          isSplitHand: false,
          result: "loss"
        },
        {
          cards: [card("8", "spades"), card("8", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "split"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: true
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Player busts. Play hand 2."
    };

    expect(previewActiveHandStrategy(round, defaultRules)).toBeNull();
  });

  it("follows the active hand across a split", () => {
    const round: RoundState = {
      shoe: {
        cards: [card("5", "clubs"), card("6", "hearts")],
        penetration: 0.75
      },
      dealerHand: [card("10", "spades"), card("7", "diamonds")],
      playerHands: [
        {
          cards: [card("8", "spades"), card("8", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "surrender", "split"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: false
        }
      ],
      activeHandIndex: 0,
      status: "playing",
      message: "Choose the best play."
    };

    const splitRound = applyPlayerAction(round, "split", defaultRules);
    expect(previewActiveHandStrategy(splitRound, defaultRules)!.handIndex).toBe(0);

    const secondHandRound = applyPlayerAction(splitRound, "stand", defaultRules);
    const preview = previewActiveHandStrategy(secondHandRound, defaultRules);
    expect(preview).not.toBeNull();
    expect(preview!.handIndex).toBe(1);
  });
});

describe("payoutForResult", () => {
  it("wins pay the bet amount", () => {
    expect(payoutForResult("win", 25)).toBe(25);
  });

  it("losses cost the bet amount", () => {
    expect(payoutForResult("loss", 25)).toBe(-25);
  });

  it("pushes are neutral", () => {
    expect(payoutForResult("push", 25)).toBe(0);
  });

  it("blackjack pays 3:2, rounded", () => {
    expect(payoutForResult("blackjack", 25)).toBe(38);
  });

  it("surrender costs half the bet, rounded", () => {
    expect(payoutForResult("surrender", 25)).toBe(-13);
  });
});

describe("nextShoeFor", () => {
  it("reuses the current shoe when penetration has not been reached", () => {
    const round: RoundState = {
      shoe: { cards: new Array(300).fill(null).map(() => card("2", "clubs")), penetration: 0.75 },
      dealerHand: [],
      playerHands: [],
      activeHandIndex: 0,
      status: "settled",
      message: ""
    };

    expect(nextShoeFor(round, defaultRules)).toBe(round.shoe);
  });

  it("creates a fresh shoe once the penetration threshold is reached", () => {
    const round: RoundState = {
      shoe: { cards: [card("2", "clubs")], penetration: 0.75 },
      dealerHand: [],
      playerHands: [],
      activeHandIndex: 0,
      status: "settled",
      message: ""
    };

    const shoe = nextShoeFor(round, defaultRules);
    expect(shoe).not.toBe(round.shoe);
    expect(shoe.cards).toHaveLength(defaultRules.deckCount * 52);
  });
});

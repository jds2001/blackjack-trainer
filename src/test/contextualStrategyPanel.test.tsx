import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextualStrategyPanel } from "../components/ContextualStrategyPanel";
import type { Card } from "../game/cards";
import { previewActiveHandStrategy, type ActionEvaluation, type RoundState } from "../game/engine";
import { defaultRules } from "../game/rules";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function roundWithHand(overrides: Partial<RoundState["playerHands"][number]>, dealerUpcard: Card = card("10", "spades")): RoundState {
  return {
    shoe: { cards: [], penetration: 0.75 },
    dealerHand: [dealerUpcard, card("6", "hearts")],
    playerHands: [
      {
        cards: [card("K", "clubs"), card("6", "clubs")],
        bet: 25,
        legalActions: ["hit", "stand", "double", "surrender"],
        hasActed: false,
        isSurrendered: false,
        isSplitHand: false,
        ...overrides
      }
    ],
    activeHandIndex: 0,
    status: "playing",
    message: "Choose the best play."
  };
}

const noop = () => {};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContextualStrategyPanel — strategy help off", () => {
  it("hides the recommendation but still offers the full chart", () => {
    const round = roundWithHand({});
    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="off"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/strategy help is turned off/i)).toBeInTheDocument();
    expect(screen.queryByText("SURRENDER")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view full chart/i })).toBeInTheDocument();
  });

  it("still shows correctness feedback for the answered decision even though the recommendation stays hidden", () => {
    const round = roundWithHand({});
    const preview = previewActiveHandStrategy(round, defaultRules)!;
    const feedback: ActionEvaluation = { ...preview, playerAction: "stand", wasCorrect: false };

    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={feedback}
        strategyHelpMode="off"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/strategy help is turned off/i)).toBeInTheDocument();
    expect(screen.queryByText("SURRENDER")).not.toBeInTheDocument();
    expect(screen.getByText(/you chose stand/i)).toBeInTheDocument();
    expect(screen.getByText(/incorrect\./i)).toBeInTheDocument();
  });
});

describe("ContextualStrategyPanel — after answer", () => {
  it("hides the recommendation before the player has acted on this decision", () => {
    const round = roundWithHand({});
    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="afterAnswer"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/hard 16 vs dealer 10/i)).toBeInTheDocument();
    expect(screen.queryByText("SURRENDER")).not.toBeInTheDocument();
    expect(screen.getByText(/choose an action to reveal/i)).toBeInTheDocument();
  });

  it("reveals the recommendation, choice, and correctness after the player answers correctly", () => {
    const round = roundWithHand({});
    const preview = previewActiveHandStrategy(round, defaultRules)!;
    const feedback: ActionEvaluation = { ...preview, playerAction: preview.recommendedAction, wasCorrect: true };

    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={feedback}
        strategyHelpMode="afterAnswer"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText("SURRENDER")).toBeInTheDocument();
    expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    expect(screen.getByText(/you chose surrender/i)).toBeInTheDocument();
  });

  it("shows the incorrect outcome when the player's choice didn't match the recommendation", () => {
    const round = roundWithHand({});
    const preview = previewActiveHandStrategy(round, defaultRules)!;
    const feedback: ActionEvaluation = { ...preview, playerAction: "stand", wasCorrect: false };

    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={feedback}
        strategyHelpMode="afterAnswer"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/you chose stand/i)).toBeInTheDocument();
    expect(screen.getByText(/incorrect\./i)).toBeInTheDocument();
  });

  it("hides a stale answer once a new decision is pending on the same hand", () => {
    const firstDecisionRound = roundWithHand({ cards: [card("3", "clubs"), card("6", "clubs")] });
    const staleFeedback: ActionEvaluation = {
      ...previewActiveHandStrategy(firstDecisionRound, defaultRules)!,
      playerAction: "hit",
      wasCorrect: true
    };

    const nextDecisionRound = roundWithHand({
      cards: [card("3", "clubs"), card("6", "clubs"), card("K", "hearts")],
      legalActions: ["hit", "stand"]
    });

    render(
      <ContextualStrategyPanel
        round={nextDecisionRound}
        rules={defaultRules}
        feedback={staleFeedback}
        strategyHelpMode="afterAnswer"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/choose an action to reveal/i)).toBeInTheDocument();
    expect(screen.queryByText(/you chose/i)).not.toBeInTheDocument();
  });

  it("hides a stale answer for a resplit that reaches the same classification as the original pair", () => {
    const firstPairRound = roundWithHand(
      { cards: [card("8", "clubs"), card("8", "hearts")], legalActions: ["hit", "stand", "double", "split"] },
      card("6", "spades")
    );
    const staleFeedback: ActionEvaluation = {
      ...previewActiveHandStrategy(firstPairRound, defaultRules)!,
      playerAction: "split",
      wasCorrect: true
    };

    // After splitting, hand 0 is redealt and happens to draw another 8: pair of 8s again — same
    // total/isPair/pairRank as the original decision, but a genuinely new, unanswered one.
    const resplitRound: RoundState = {
      ...firstPairRound,
      playerHands: [
        {
          cards: [card("8", "clubs"), card("8", "diamonds")],
          bet: 25,
          legalActions: ["hit", "stand", "double", "split"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: true
        },
        {
          cards: [card("8", "hearts"), card("9", "spades")],
          bet: 25,
          legalActions: [],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: true
        }
      ]
    };

    render(
      <ContextualStrategyPanel
        round={resplitRound}
        rules={defaultRules}
        feedback={staleFeedback}
        strategyHelpMode="afterAnswer"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/choose an action to reveal/i)).toBeInTheDocument();
    expect(screen.queryByText(/you chose/i)).not.toBeInTheDocument();
  });
});

describe("ContextualStrategyPanel — always visible", () => {
  it("shows the recommendation before any action is taken", () => {
    const round = roundWithHand({});
    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="always"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByText("SURRENDER")).toBeInTheDocument();
    expect(screen.queryByText(/you chose/i)).not.toBeInTheDocument();
  });
});

describe("ContextualStrategyPanel — hand classification", () => {
  it("labels a hard total", () => {
    const round = roundWithHand({ cards: [card("K", "clubs"), card("6", "clubs")] });
    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );
    expect(screen.getByText(/hard 16 vs dealer 10/i)).toBeInTheDocument();
  });

  it("labels a soft total", () => {
    const round = roundWithHand({ cards: [card("A", "clubs"), card("7", "clubs")] }, card("6", "spades"));
    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );
    expect(screen.getByText(/soft 18 vs dealer 6/i)).toBeInTheDocument();
  });

  it("labels a pair", () => {
    const round = roundWithHand({ cards: [card("8", "clubs"), card("8", "hearts")] }, card("6", "spades"));
    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );
    expect(screen.getByText(/pair of 8s vs dealer 6/i)).toBeInTheDocument();
  });

  it("recommends stand for a hard 16 against a dealer 6", () => {
    const round = roundWithHand({ cards: [card("K", "clubs"), card("6", "clubs")] }, card("6", "spades"));
    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );
    expect(screen.getByText("STAND")).toBeInTheDocument();
  });
});

describe("ContextualStrategyPanel — current cell highlighting", () => {
  it("marks the current dealer-upcard cell as current via more than color", () => {
    const round = roundWithHand({});
    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );

    const current = screen.getByRole("listitem", { current: true });
    expect(current).toHaveTextContent("[Rh]");
    expect(current).toHaveAccessibleName(/dealer 10.*current/i);
  });
});

describe("ContextualStrategyPanel — split hands", () => {
  it("identifies which hand the recommendation applies to", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts")],
      playerHands: [
        {
          cards: [card("8", "spades"), card("8", "clubs"), card("10", "hearts")],
          bet: 25,
          legalActions: [],
          hasActed: true,
          isSurrendered: false,
          isSplitHand: true,
          result: "loss"
        },
        {
          cards: [card("8", "hearts"), card("3", "clubs")],
          bet: 25,
          legalActions: ["hit", "stand", "double"],
          hasActed: false,
          isSurrendered: false,
          isSplitHand: true
        }
      ],
      activeHandIndex: 1,
      status: "playing",
      message: "Play hand 2."
    };

    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );

    expect(screen.getByText("Hand 2 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/^Hand 1 of 2$/)).not.toBeInTheDocument();
  });
});

describe("ContextualStrategyPanel — no active decision", () => {
  it("does not show advice once the round is settled", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts"), card("5", "clubs")],
      playerHands: [
        {
          cards: [card("K", "clubs"), card("9", "clubs")],
          bet: 25,
          legalActions: [],
          hasActed: true,
          isSurrendered: false,
          isSplitHand: false,
          result: "win"
        }
      ],
      activeHandIndex: 0,
      status: "settled",
      message: "Player stands. Hand 1: player wins"
    };

    render(
      <ContextualStrategyPanel round={round} rules={defaultRules} feedback={null} strategyHelpMode="always" dealerRevealComplete onOpenChart={noop} />
    );

    expect(screen.getByText(/round complete/i)).toBeInTheDocument();
    expect(screen.queryByText(/SURRENDER|STAND|HIT|DOUBLE|SPLIT/)).not.toBeInTheDocument();
  });

  it("shows a distinct message while the dealer is still playing out their hand", () => {
    const round: RoundState = {
      shoe: { cards: [], penetration: 0.75 },
      dealerHand: [card("10", "spades"), card("6", "hearts"), card("5", "clubs")],
      playerHands: [
        {
          cards: [card("K", "clubs"), card("9", "clubs")],
          bet: 25,
          legalActions: [],
          hasActed: true,
          isSurrendered: false,
          isSplitHand: false,
          result: "win"
        }
      ],
      activeHandIndex: 0,
      status: "settled",
      message: "Player stands. Hand 1: player wins"
    };

    render(
      <ContextualStrategyPanel
        round={round}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="always"
        dealerRevealComplete={false}
        onOpenChart={noop}
      />
    );

    expect(screen.getByText(/dealer is playing/i)).toBeInTheDocument();
  });
});

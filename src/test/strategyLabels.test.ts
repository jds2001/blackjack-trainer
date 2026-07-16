import { describe, expect, it } from "vitest";
import type { Card } from "../game/cards";
import type { StrategyInput } from "../strategy/strategyTypes";
import { classifyStrategyInput, decisionKey, strategyCodeLegend, strategyTargetFor } from "../strategy/strategyLabels";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function baseInput(overrides: Partial<StrategyInput>): StrategyInput {
  return {
    playerTotal: 16,
    isSoft: false,
    isPair: false,
    dealerUpcard: "10",
    canDouble: true,
    canSplit: false,
    canSurrender: true,
    ...overrides
  };
}

describe("classifyStrategyInput", () => {
  it("classifies a hard total", () => {
    const result = classifyStrategyInput(baseInput({ playerTotal: 16, isSoft: false }));
    expect(result).toEqual({ section: "hardTotals", rowLabel: "Hard 16", displayLabel: "Hard 16" });
  });

  it("classifies a soft total", () => {
    const result = classifyStrategyInput(baseInput({ playerTotal: 18, isSoft: true }));
    expect(result).toEqual({ section: "softTotals", rowLabel: "Soft 18", displayLabel: "Soft 18" });
  });

  it("classifies a pair with a friendly rank name", () => {
    const result = classifyStrategyInput(baseInput({ playerTotal: 16, isPair: true, pairRank: "8" }));
    expect(result).toEqual({ section: "pairs", rowLabel: "8,8", displayLabel: "Pair of 8s" });
  });

  it("names face-card and ace pairs correctly while normalizing the row lookup", () => {
    const kings = classifyStrategyInput(baseInput({ isPair: true, pairRank: "K" }));
    expect(kings.displayLabel).toBe("Pair of Kings");
    expect(kings.rowLabel).toBe("10,10");

    const aces = classifyStrategyInput(baseInput({ isSoft: true, isPair: true, pairRank: "A", playerTotal: 12 }));
    expect(aces.displayLabel).toBe("Pair of Aces");
    expect(aces.rowLabel).toBe("A,A");
  });
});

describe("strategyTargetFor", () => {
  it("carries the dealer upcard alongside the classification", () => {
    const target = strategyTargetFor(baseInput({ dealerUpcard: "10" }));
    expect(target.upcard).toBe("10");
    expect(target.rowLabel).toBe("Hard 16");
  });
});

describe("decisionKey", () => {
  it("differs when the hand's cards change after a hit", () => {
    const before = decisionKey(0, [card("3", "clubs"), card("6", "hearts")]);
    const after = decisionKey(0, [card("3", "clubs"), card("6", "hearts"), card("2", "spades")]);
    expect(before).not.toBe(after);
  });

  it("differs across hands even with identical cards", () => {
    const cards = [card("8", "clubs"), card("8", "hearts")];
    const handZero = decisionKey(0, cards);
    const handOne = decisionKey(1, cards);
    expect(handZero).not.toBe(handOne);
  });

  it("matches for the same hand and the same cards", () => {
    const a = decisionKey(0, [card("K", "clubs"), card("6", "hearts")]);
    const b = decisionKey(0, [card("K", "clubs"), card("6", "hearts")]);
    expect(a).toBe(b);
  });

  it("differs for a resplit that reaches the same classification as the original pair", () => {
    // Splitting 8,8 and drawing another 8 on the first hand reproduces "pair of 8s" again — the
    // same total/isPair/pairRank as the original decision — but it's a genuinely new decision.
    const originalPair = decisionKey(0, [card("8", "clubs"), card("8", "hearts")]);
    const resplitPair = decisionKey(0, [card("8", "clubs"), card("8", "diamonds")]);
    expect(originalPair).not.toBe(resplitPair);
  });
});

describe("strategyCodeLegend", () => {
  it("covers every strategy code with a full-text label", () => {
    const codes = strategyCodeLegend.map((entry) => entry.code).sort();
    expect(codes).toEqual(["D", "Ds", "H", "P", "Rh", "Rs", "S"]);
    for (const entry of strategyCodeLegend) {
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });
});

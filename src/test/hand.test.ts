import { describe, expect, it } from "vitest";
import type { Card } from "../game/cards";
import { bestHandValue, handValues, isSoftHand } from "../game/hand";

describe("hand totals", () => {
  it("handles a soft ace without busting", () => {
    const hand: Card[] = [
      { rank: "A", suit: "spades" },
      { rank: "6", suit: "clubs" }
    ];

    expect(handValues(hand)).toEqual([7, 17]);
    expect(bestHandValue(hand)).toBe(17);
    expect(isSoftHand(hand)).toBe(true);
  });

  it("demotes aces when needed", () => {
    const hand: Card[] = [
      { rank: "A", suit: "spades" },
      { rank: "9", suit: "clubs" },
      { rank: "7", suit: "diamonds" }
    ];

    expect(bestHandValue(hand)).toBe(17);
    expect(isSoftHand(hand)).toBe(false);
  });

  it("is not soft when there is no ace, even with a low total", () => {
    const hand: Card[] = [
      { rank: "3", suit: "hearts" },
      { rank: "7", suit: "spades" }
    ];

    expect(bestHandValue(hand)).toBe(10);
    expect(isSoftHand(hand)).toBe(false);
  });
});

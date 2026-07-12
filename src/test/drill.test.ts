import { describe, expect, it } from "vitest";
import { createDrillRound } from "../game/engine";
import { dealDrillHand, pickDrillCategory, type DrillSettings } from "../game/drill";
import { bestHandValue, canSplit, isBlackjack, isSoftHand } from "../game/hand";
import { defaultRules } from "../game/rules";

describe("dealDrillHand", () => {
  it("deals a soft hand with a total between 13 and 20", () => {
    for (let i = 0; i < 50; i += 1) {
      const hand = dealDrillHand("soft", defaultRules)!;
      expect(hand).not.toBeNull();
      expect(isSoftHand(hand.playerCards)).toBe(true);
      const total = bestHandValue(hand.playerCards);
      expect(total).toBeGreaterThanOrEqual(13);
      expect(total).toBeLessThanOrEqual(20);
      expect(isBlackjack(hand.dealerCards)).toBe(false);
    }
  });

  it("deals a splittable pair", () => {
    for (let i = 0; i < 50; i += 1) {
      const hand = dealDrillHand("pair", defaultRules)!;
      expect(canSplit(hand.playerCards)).toBe(true);
      expect(isBlackjack(hand.dealerCards)).toBe(false);
    }
  });

  it("deals a non-pair hard 15 or 16 against a qualifying upcard", () => {
    for (let i = 0; i < 50; i += 1) {
      const hand = dealDrillHand("surrender", defaultRules)!;
      expect(hand).not.toBeNull();
      expect(canSplit(hand.playerCards)).toBe(false);
      const total = bestHandValue(hand.playerCards);
      expect([15, 16]).toContain(total);
      const upcard = hand.dealerCards[0].rank;
      if (total === 16) {
        expect(["9", "10", "A"]).toContain(upcard);
      } else {
        expect(upcard).toBe("10");
      }
      expect(isBlackjack(hand.dealerCards)).toBe(false);
    }
  });

  it("also surrenders hard 15 against an ace when the dealer hits soft 17", () => {
    const rules = { ...defaultRules, dealerHitsSoft17: true };
    let sawAceUpcardFor15 = false;
    for (let i = 0; i < 200; i += 1) {
      const hand = dealDrillHand("surrender", rules)!;
      const total = bestHandValue(hand.playerCards);
      if (total === 15 && hand.dealerCards[0].rank === "A") {
        sawAceUpcardFor15 = true;
        break;
      }
    }
    expect(sawAceUpcardFor15).toBe(true);
  });

  it("returns null when surrender isn't allowed", () => {
    const rules = { ...defaultRules, surrenderAllowed: false };
    expect(dealDrillHand("surrender", rules)).toBeNull();
  });
});

describe("pickDrillCategory", () => {
  it("returns null when drill mode is disabled", () => {
    const settings: DrillSettings = { enabled: false, weights: { soft: 100, pair: 0, surrender: 0 } };
    expect(pickDrillCategory(settings, defaultRules)).toBeNull();
  });

  it("returns null when every weight is zero", () => {
    const settings: DrillSettings = { enabled: true, weights: { soft: 0, pair: 0, surrender: 0 } };
    expect(pickDrillCategory(settings, defaultRules)).toBeNull();
  });

  it("always picks the only nonzero category", () => {
    const settings: DrillSettings = { enabled: true, weights: { soft: 100, pair: 0, surrender: 0 } };
    for (let i = 0; i < 20; i += 1) {
      expect(pickDrillCategory(settings, defaultRules)).toBe("soft");
    }
  });

  it("excludes surrender from consideration when surrender isn't allowed", () => {
    const settings: DrillSettings = { enabled: true, weights: { soft: 0, pair: 0, surrender: 100 } };
    const rules = { ...defaultRules, surrenderAllowed: false };
    expect(pickDrillCategory(settings, rules)).toBeNull();
  });

  it("scales proportionally instead of ever falling through when weights sum over 100", () => {
    const settings: DrillSettings = { enabled: true, weights: { soft: 100, pair: 100, surrender: 0 } };
    const results = new Set<string | null>();
    for (let i = 0; i < 50; i += 1) {
      results.add(pickDrillCategory(settings, defaultRules));
    }
    expect(results.has(null)).toBe(false);
    expect([...results].sort()).toEqual(["pair", "soft"]);
  });
});

describe("createDrillRound", () => {
  it("tags the resulting round with the drilled category", () => {
    const settings: DrillSettings = { enabled: true, weights: { soft: 100, pair: 0, surrender: 0 } };
    const round = createDrillRound(defaultRules, settings);
    expect(round.drillCategory).toBe("soft");
    expect(isSoftHand(round.playerHands[0].cards)).toBe(true);
  });

  it("leaves drillCategory unset when drill mode is disabled", () => {
    const settings: DrillSettings = { enabled: false, weights: { soft: 0, pair: 0, surrender: 0 } };
    const round = createDrillRound(defaultRules, settings);
    expect(round.drillCategory).toBeUndefined();
  });
});

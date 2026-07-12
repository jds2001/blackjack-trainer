import { describe, expect, it } from "vitest";
import { defaultRules } from "../game/rules";
import { getBasicStrategy } from "../strategy/basicStrategy";
import { strategyCodeToAction } from "../strategy/strategyTypes";

describe("basic strategy", () => {
  it("stands on hard 16 against dealer 6", () => {
    expect(getBasicStrategy({
      playerTotal: 16,
      isSoft: false,
      isPair: false,
      dealerUpcard: "6",
      canDouble: true,
      canSplit: false,
      canSurrender: true
    }, defaultRules)).toBe("S");
  });

  it("surrenders hard 16 against dealer 10 when surrender is allowed", () => {
    expect(getBasicStrategy({
      playerTotal: 16,
      isSoft: false,
      isPair: false,
      dealerUpcard: "10",
      canDouble: true,
      canSplit: false,
      canSurrender: true
    }, defaultRules)).toBe("Rh");
  });

  it("always splits aces", () => {
    expect(getBasicStrategy({
      playerTotal: 12,
      isSoft: true,
      isPair: true,
      pairRank: "A",
      dealerUpcard: "10",
      canDouble: true,
      canSplit: true,
      canSurrender: false
    }, defaultRules)).toBe("P");
  });

  it("never surrenders a soft total, even when surrender would apply to the same hard total", () => {
    expect(getBasicStrategy({
      playerTotal: 16,
      isSoft: true,
      isPair: false,
      dealerUpcard: "10",
      canDouble: true,
      canSplit: false,
      canSurrender: true
    }, defaultRules)).toBe("H");
  });

  it("hits hard 11 against a dealer ace when the dealer stands on soft 17", () => {
    expect(getBasicStrategy({
      playerTotal: 11,
      isSoft: false,
      isPair: false,
      dealerUpcard: "A",
      canDouble: true,
      canSplit: false,
      canSurrender: false
    }, { ...defaultRules, dealerHitsSoft17: false })).toBe("H");
  });

  it("doubles hard 11 against a dealer ace when the dealer hits on soft 17", () => {
    expect(getBasicStrategy({
      playerTotal: 11,
      isSoft: false,
      isPair: false,
      dealerUpcard: "A",
      canDouble: true,
      canSplit: false,
      canSurrender: false
    }, { ...defaultRules, dealerHitsSoft17: true })).toBe("D");
  });

  it("still doubles hard 11 against non-ace upcards regardless of the soft 17 rule", () => {
    expect(getBasicStrategy({
      playerTotal: 11,
      isSoft: false,
      isPair: false,
      dealerUpcard: "10",
      canDouble: true,
      canSplit: false,
      canSurrender: false
    }, { ...defaultRules, dealerHitsSoft17: false })).toBe("D");
  });
});

describe("strategyCodeToAction", () => {
  it("falls back to hit when a double isn't actually available", () => {
    expect(strategyCodeToAction("D", { canDouble: false, canSurrender: false })).toBe("hit");
  });

  it("falls back to stand when a double-or-stand code can't double", () => {
    expect(strategyCodeToAction("Ds", { canDouble: false, canSurrender: false })).toBe("stand");
  });

  it("falls back to hit when a surrender-or-hit code can't surrender", () => {
    expect(strategyCodeToAction("Rh", { canDouble: false, canSurrender: false })).toBe("hit");
  });

  it("surrenders when a surrender code is actually available", () => {
    expect(strategyCodeToAction("Rh", { canDouble: false, canSurrender: true })).toBe("surrender");
  });
});

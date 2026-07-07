import { describe, expect, it } from "vitest";
import { defaultRules } from "../game/rules";
import { getBasicStrategy } from "../strategy/basicStrategy";

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
});

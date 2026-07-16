import { describe, expect, it } from "vitest";
import { defaultRules } from "../game/rules";
import { dealerUpcards, generateRowForHand, generateStrategyTable, normalizePairRank, pairRowLabel } from "../strategy/strategyTables";

describe("generateRowForHand", () => {
  it("produces the same codes as the reference table for a matching hard-total row", () => {
    const tables = generateStrategyTable(defaultRules);
    const tableRow = tables.hardTotals.find((row) => row.hand === "Hard 16")!;

    const row = generateRowForHand(
      "Hard 16",
      { playerTotal: 16, isSoft: false, isPair: false, canDouble: true, canSplit: false, canSurrender: true },
      defaultRules
    );

    for (const upcard of dealerUpcards) {
      expect(row[upcard]).toBe(tableRow[upcard]);
    }
  });

  it("reflects real hand legality, not the generic table's assumptions", () => {
    const tables = generateStrategyTable(defaultRules);
    const genericRow = tables.hardTotals.find((row) => row.hand === "Hard 16")!;
    expect(genericRow["10"]).toBe("Rh");

    const rowWithoutSurrender = generateRowForHand(
      "Hard 16",
      { playerTotal: 16, isSoft: false, isPair: false, canDouble: true, canSplit: false, canSurrender: false },
      defaultRules
    );
    expect(rowWithoutSurrender["10"]).toBe("H");
  });
});

describe("normalizePairRank", () => {
  it("maps face cards onto the shared 10-value pair row", () => {
    expect(normalizePairRank("J")).toBe("10");
    expect(normalizePairRank("Q")).toBe("10");
    expect(normalizePairRank("K")).toBe("10");
    expect(normalizePairRank("10")).toBe("10");
    expect(normalizePairRank("8")).toBe("8");
  });

  it("matches an existing pairs table row after normalization", () => {
    const tables = generateStrategyTable(defaultRules);
    const label = pairRowLabel(normalizePairRank("K"));
    expect(tables.pairs.some((row) => row.hand === label)).toBe(true);
    expect(label).toBe("10,10");
  });
});

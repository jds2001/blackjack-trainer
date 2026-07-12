import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultRules } from "../game/rules";
import { createEmptyStats, loadStats, recordDecision, recordSettledRound, saveStats } from "../persistence/stats";

vi.mock("../persistence/storage", () => {
  const store = new Map<string, unknown>();
  return {
    loadJson: (key: string, fallback: unknown) => (store.has(key) ? store.get(key) : fallback),
    saveJson: (key: string, value: unknown) => {
      store.set(key, value);
    },
    __store: store
  };
});

beforeEach(async () => {
  const storage = (await import("../persistence/storage")) as unknown as { __store: Map<string, unknown> };
  storage.__store.clear();
});

describe("stats persistence", () => {
  it("falls back to empty stats when nothing has been saved", () => {
    expect(loadStats(defaultRules)).toEqual(createEmptyStats(defaultRules));
  });

  it("round-trips through storage", () => {
    const stats = recordSettledRound(recordDecision(createEmptyStats(defaultRules), true), 25);
    saveStats(stats);
    expect(loadStats(defaultRules)).toEqual(stats);
  });

  it("keys stats separately per rule configuration", () => {
    saveStats(recordDecision(createEmptyStats(defaultRules), true));
    const otherRules = { ...defaultRules, dealerHitsSoft17: true };
    expect(loadStats(otherRules)).toEqual(createEmptyStats(otherRules));
  });
});

describe("recordDecision", () => {
  it("tracks correct and incorrect decisions and recomputes accuracy", () => {
    let stats = createEmptyStats(defaultRules);
    stats = recordDecision(stats, true);
    stats = recordDecision(stats, false);
    stats = recordDecision(stats, true);

    expect(stats.decisions).toBe(3);
    expect(stats.correctDecisions).toBe(2);
    expect(stats.incorrectDecisions).toBe(1);
    expect(stats.accuracy).toBeCloseTo((2 / 3) * 100);
  });
});

describe("recordSettledRound", () => {
  it("adds the bankroll delta and increments hands completed", () => {
    const stats = createEmptyStats(defaultRules);
    const updated = recordSettledRound(stats, -25);

    expect(updated.handsCompleted).toBe(1);
    expect(updated.bankroll).toBe(defaultRules.startingBankroll - 25);
  });
});

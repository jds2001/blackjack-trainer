import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPreferences, savePreferences } from "../persistence/preferences";

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

describe("preferences persistence", () => {
  it("defaults strategy help to 'after answer' when nothing is stored", () => {
    expect(loadPreferences().strategyHelpMode).toBe("afterAnswer");
  });

  it("round-trips a saved strategy help mode", () => {
    savePreferences({ strategyHelpMode: "always" });
    expect(loadPreferences().strategyHelpMode).toBe("always");

    savePreferences({ strategyHelpMode: "off" });
    expect(loadPreferences().strategyHelpMode).toBe("off");
  });

  it("fills in missing fields from older persisted preferences", async () => {
    const storage = (await import("../persistence/storage")) as unknown as { __store: Map<string, unknown> };
    storage.__store.set("blackjack-trainer:preferences", {});
    expect(loadPreferences().strategyHelpMode).toBe("afterAnswer");
  });
});

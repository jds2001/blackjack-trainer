import { loadJson, saveJson } from "./storage";

export type StrategyHelpMode = "off" | "afterAnswer" | "always";

export type Preferences = {
  strategyHelpMode: StrategyHelpMode;
};

const PREFERENCES_STORAGE_KEY = "blackjack-trainer:preferences";

const defaultPreferences: Preferences = {
  strategyHelpMode: "afterAnswer"
};

export function loadPreferences(): Preferences {
  return { ...defaultPreferences, ...loadJson(PREFERENCES_STORAGE_KEY, defaultPreferences) };
}

export function savePreferences(preferences: Preferences): void {
  saveJson(PREFERENCES_STORAGE_KEY, preferences);
}

import { loadJson, saveJson } from "./storage";

export type StrategyHelpMode = "off" | "afterAnswer" | "always";
export type Theme = "light" | "dark";

export type Preferences = {
  strategyHelpMode: StrategyHelpMode;
  theme: Theme;
};

const PREFERENCES_STORAGE_KEY = "blackjack-trainer:preferences";

function systemPreferredTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function defaultPreferences(): Preferences {
  return {
    strategyHelpMode: "afterAnswer",
    theme: systemPreferredTheme()
  };
}

export function loadPreferences(): Preferences {
  const fallback = defaultPreferences();
  return { ...fallback, ...loadJson(PREFERENCES_STORAGE_KEY, fallback) };
}

export function savePreferences(patch: Partial<Preferences>): void {
  saveJson(PREFERENCES_STORAGE_KEY, { ...loadPreferences(), ...patch });
}

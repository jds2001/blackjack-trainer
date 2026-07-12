import { rulesKey, type TableRules } from "../game/rules";
import { loadJson, saveJson } from "./storage";

export type SessionStats = {
  configurationKey: string;
  handsCompleted: number;
  decisions: number;
  correctDecisions: number;
  incorrectDecisions: number;
  accuracy: number;
  bankroll: number;
};

const STATS_STORAGE_PREFIX = "blackjack-trainer:stats:";

export function createEmptyStats(rules: TableRules): SessionStats {
  return {
    configurationKey: rulesKey(rules),
    handsCompleted: 0,
    decisions: 0,
    correctDecisions: 0,
    incorrectDecisions: 0,
    accuracy: 0,
    bankroll: rules.startingBankroll
  };
}

export function loadStats(rules: TableRules): SessionStats {
  return loadJson(STATS_STORAGE_PREFIX + rulesKey(rules), createEmptyStats(rules));
}

export function saveStats(stats: SessionStats): void {
  saveJson(STATS_STORAGE_PREFIX + stats.configurationKey, stats);
}

export function recordDecision(stats: SessionStats, wasCorrect: boolean): SessionStats {
  const decisions = stats.decisions + 1;
  const correctDecisions = stats.correctDecisions + (wasCorrect ? 1 : 0);
  const incorrectDecisions = stats.incorrectDecisions + (wasCorrect ? 0 : 1);
  return {
    ...stats,
    decisions,
    correctDecisions,
    incorrectDecisions,
    accuracy: (correctDecisions / decisions) * 100
  };
}

export function recordSettledRound(stats: SessionStats, bankrollDelta: number): SessionStats {
  return {
    ...stats,
    handsCompleted: stats.handsCompleted + 1,
    bankroll: stats.bankroll + bankrollDelta
  };
}

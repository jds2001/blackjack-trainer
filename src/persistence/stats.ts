import { rulesKey, type TableRules } from "../game/rules";

export type SessionStats = {
  configurationKey: string;
  handsCompleted: number;
  decisions: number;
  correctDecisions: number;
  incorrectDecisions: number;
  accuracy: number;
  bankroll: number;
};

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

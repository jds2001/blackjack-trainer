import type { TableRules } from "../game/rules";
import type { StrategyCode, StrategyInput } from "./strategyTypes";

export function getBasicStrategy(input: StrategyInput, rules: TableRules): StrategyCode {
  if (input.isPair && input.pairRank) {
    return pairStrategy(input);
  }

  if (rules.surrenderAllowed && input.canSurrender) {
    const surrender = surrenderStrategy(input, rules);
    if (surrender) return surrender;
  }

  if (input.isSoft) {
    return softTotalStrategy(input);
  }

  return hardTotalStrategy(input);
}

function hardTotalStrategy(input: StrategyInput): StrategyCode {
  const upcard = upcardValue(input.dealerUpcard);
  const total = input.playerTotal;

  if (total >= 17) return "S";
  if (total >= 13 && upcard >= 2 && upcard <= 6) return "S";
  if (total === 12 && upcard >= 4 && upcard <= 6) return "S";
  if (total === 11) return "D";
  if (total === 10 && upcard <= 9) return "D";
  if (total === 9 && upcard >= 3 && upcard <= 6) return "D";
  return "H";
}

function softTotalStrategy(input: StrategyInput): StrategyCode {
  const upcard = upcardValue(input.dealerUpcard);
  const total = input.playerTotal;

  if (total >= 19) return "S";
  if (total === 18) {
    if (upcard >= 3 && upcard <= 6) return "Ds";
    if (upcard === 2 || upcard === 7 || upcard === 8) return "S";
    return "H";
  }
  if (total === 17 && upcard >= 3 && upcard <= 6) return "D";
  if ((total === 15 || total === 16) && upcard >= 4 && upcard <= 6) return "D";
  if ((total === 13 || total === 14) && upcard >= 5 && upcard <= 6) return "D";
  return "H";
}

function pairStrategy(input: StrategyInput): StrategyCode {
  const upcard = upcardValue(input.dealerUpcard);

  switch (input.pairRank) {
    case "A":
    case "8":
      return "P";
    case "10":
    case "J":
    case "Q":
    case "K":
      return "S";
    case "9":
      return upcard === 7 || upcard >= 10 ? "S" : "P";
    case "7":
      return upcard <= 7 ? "P" : "H";
    case "6":
      return upcard <= 6 ? "P" : "H";
    case "5":
      return upcard <= 9 ? "D" : "H";
    case "4":
      return upcard === 5 || upcard === 6 ? "P" : "H";
    case "3":
    case "2":
      return upcard <= 7 ? "P" : "H";
  }

  return "H";
}

function surrenderStrategy(input: StrategyInput, rules: TableRules): StrategyCode | null {
  const upcard = upcardValue(input.dealerUpcard);
  const total = input.playerTotal;

  if (total === 16 && upcard >= 9) return "Rh";
  if (total === 15 && upcard === 10) return "Rh";
  if (rules.dealerHitsSoft17 && total === 15 && input.dealerUpcard === "A") return "Rh";
  return null;
}

function upcardValue(upcard: StrategyInput["dealerUpcard"]) {
  return upcard === "A" ? 11 : Number(upcard);
}

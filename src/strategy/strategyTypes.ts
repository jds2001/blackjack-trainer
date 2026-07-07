import type { Rank } from "../game/cards";
import type { PlayerAction } from "../game/rules";

export type DealerUpcard = Exclude<Rank, "J" | "Q" | "K">;
export type StrategyCode = "H" | "S" | "D" | "Ds" | "P" | "Rh" | "Rs";

export type StrategyInput = {
  playerTotal: number;
  isSoft: boolean;
  isPair: boolean;
  pairRank?: Rank;
  dealerUpcard: DealerUpcard;
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
};

export function strategyCodeToAction(code: StrategyCode): PlayerAction {
  if (code === "S" || code === "Ds" || code === "Rs") return "stand";
  if (code === "D") return "double";
  if (code === "P") return "split";
  if (code === "Rh") return "surrender";
  return "hit";
}

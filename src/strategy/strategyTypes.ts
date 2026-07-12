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

export function strategyCodeToAction(
  code: StrategyCode,
  input: Pick<StrategyInput, "canDouble" | "canSurrender">
): PlayerAction {
  if (code === "S") return "stand";
  if (code === "Ds") return input.canDouble ? "double" : "stand";
  if (code === "D") return input.canDouble ? "double" : "hit";
  if (code === "P") return "split";
  if (code === "Rh") return input.canSurrender ? "surrender" : "hit";
  if (code === "Rs") return input.canSurrender ? "surrender" : "stand";
  return "hit";
}

export function rankToDealerUpcard(rank: Rank): DealerUpcard {
  if (rank === "J" || rank === "Q" || rank === "K") return "10";
  return rank;
}

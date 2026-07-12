import type { PlayerAction } from "../game/rules";

export const actionLabels: Record<PlayerAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender"
};

import type { Card } from "./cards";
import { bestHandValue, isBlackjack, isBust } from "./hand";

export type Settlement = "win" | "loss" | "push" | "blackjack";

export function settleHand(playerHand: Card[], dealerHand: Card[], playerIsSplitHand = false): Settlement {
  if (isBust(playerHand)) return "loss";
  if (isBust(dealerHand)) return "win";

  const playerHasBlackjack = !playerIsSplitHand && isBlackjack(playerHand);
  const dealerHasBlackjack = isBlackjack(dealerHand);
  if (playerHasBlackjack && !dealerHasBlackjack) return "blackjack";
  if (!playerHasBlackjack && dealerHasBlackjack) return "loss";

  const playerTotal = bestHandValue(playerHand);
  const dealerTotal = bestHandValue(dealerHand);
  if (playerTotal > dealerTotal) return "win";
  if (playerTotal < dealerTotal) return "loss";
  return "push";
}

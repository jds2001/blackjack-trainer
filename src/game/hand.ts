import { rankValue, type Card } from "./cards";

export function handValues(hand: Card[]) {
  const aceCount = hand.filter((card) => card.rank === "A").length;
  const rawTotal = hand.reduce((total, card) => total + rankValue(card.rank), 0);
  const values = new Set<number>();

  for (let softAces = 0; softAces <= aceCount; softAces += 1) {
    values.add(rawTotal - softAces * 10);
  }

  return [...values].sort((a, b) => a - b);
}

export function bestHandValue(hand: Card[]) {
  const values = handValues(hand);
  const playableValues = values.filter((value) => value <= 21);
  return playableValues.length > 0 ? playableValues[playableValues.length - 1] : values[0];
}

export function isBust(hand: Card[]) {
  return bestHandValue(hand) > 21;
}

export function isBlackjack(hand: Card[]) {
  return hand.length === 2 && bestHandValue(hand) === 21;
}

export function isSoftHand(hand: Card[]) {
  const hasAce = hand.some((card) => card.rank === "A");
  if (!hasAce) return false;

  const values = handValues(hand);
  const hardTotal = values[0];
  return bestHandValue(hand) > hardTotal;
}

export function canSplit(hand: Card[]) {
  return hand.length === 2 && rankValue(hand[0].rank) === rankValue(hand[1].rank);
}

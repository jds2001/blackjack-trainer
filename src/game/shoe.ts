import { createDeck, type Card } from "./cards";
import type { DeckCount } from "./rules";

export type Shoe = {
  cards: Card[];
  penetration: number;
};

export function createShoe(deckCount: DeckCount, penetration = 0.75): Shoe {
  const cards = Array.from({ length: deckCount }).flatMap(() => createDeck());
  return {
    cards: shuffle(cards),
    penetration
  };
}

export function drawCard(shoe: Shoe): Card {
  const card = shoe.cards.pop();
  if (!card) {
    throw new Error("Cannot draw from an empty shoe");
  }
  return card;
}

export function shouldReshuffle(shoe: Shoe, deckCount: DeckCount) {
  const originalCount = deckCount * 52;
  return shoe.cards.length / originalCount <= 1 - shoe.penetration;
}

function shuffle(cards: Card[]) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

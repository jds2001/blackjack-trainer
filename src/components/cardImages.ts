import type { Card } from "../game/cards";

const images = import.meta.glob("../assets/cards/*.png", { eager: true, query: "url", import: "default" }) as Record<
  string,
  string
>;

const suitLetter: Record<Card["suit"], string> = {
  clubs: "c",
  diamonds: "d",
  hearts: "h",
  spades: "s"
};

const rankCode: Record<Card["rank"], string> = {
  A: "a",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "j",
  Q: "q",
  K: "k"
};

export function cardImageUrl(card: Card): string | undefined {
  const code = `${rankCode[card.rank]}${suitLetter[card.suit]}`;
  return images[`../assets/cards/${code}.png`];
}

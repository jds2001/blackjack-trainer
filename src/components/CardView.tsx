import type { Card, Suit } from "../game/cards";
import { cardImageUrl } from "./cardImages";

type CardViewProps = {
  card?: Card;
  hidden?: boolean;
};

const suitSymbol: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

const redSuits: Suit[] = ["diamonds", "hearts"];

const warnedMissingCodes = new Set<string>();

export function CardView({ card, hidden = false }: CardViewProps) {
  if (hidden || !card) {
    return <span className="playing-card back" aria-label="Hidden card" />;
  }

  const url = cardImageUrl(card);
  if (!url) {
    const code = `${card.rank}${card.suit}`;
    if (!warnedMissingCodes.has(code)) {
      warnedMissingCodes.add(code);
      console.warn(
        `Missing card image for ${card.rank} of ${card.suit}. See README for how to add card art locally.`
      );
    }
    return (
      <span
        className={`playing-card placeholder ${redSuits.includes(card.suit) ? "red" : "black"}`}
        role="img"
        aria-label={`${card.rank} of ${card.suit} (card art not installed)`}
      >
        <span className="playing-card-rank">{card.rank}</span>
        <span className="playing-card-suit">{suitSymbol[card.suit]}</span>
      </span>
    );
  }

  return (
    <img
      className="playing-card"
      src={url}
      alt={`${card.rank} of ${card.suit}`}
    />
  );
}

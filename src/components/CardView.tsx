import type { Card } from "../game/cards";

type CardViewProps = {
  card?: Card;
  hidden?: boolean;
};

export function CardView({ card, hidden = false }: CardViewProps) {
  if (hidden || !card) {
    return <span className="playing-card back" aria-label="Hidden card" />;
  }

  const isRed = card.suit === "hearts" || card.suit === "diamonds";

  return (
    <span className={isRed ? "playing-card red" : "playing-card"}>
      <span>{card.rank}</span>
      <span>{suitSymbol(card.suit)}</span>
    </span>
  );
}

function suitSymbol(suit: Card["suit"]) {
  return {
    clubs: "C",
    diamonds: "D",
    hearts: "H",
    spades: "S"
  }[suit];
}

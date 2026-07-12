import type { Card } from "../game/cards";
import { cardImageUrl } from "./cardImages";

type CardViewProps = {
  card?: Card;
  hidden?: boolean;
};

export function CardView({ card, hidden = false }: CardViewProps) {
  if (hidden || !card) {
    return <span className="playing-card back" aria-label="Hidden card" />;
  }

  return (
    <img
      className="playing-card"
      src={cardImageUrl(card)}
      alt={`${card.rank} of ${card.suit}`}
    />
  );
}

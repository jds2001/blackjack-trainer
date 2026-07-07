import { CardView } from "./CardView";
import type { Card } from "../game/cards";
import { bestHandValue, isSoftHand } from "../game/hand";

type HandViewProps = {
  hand: Card[];
  revealHoleCard?: boolean;
};

export function HandView({ hand, revealHoleCard = true }: HandViewProps) {
  const visibleCards = revealHoleCard ? hand : hand.slice(0, 1);
  const hiddenCount = revealHoleCard ? 0 : Math.max(hand.length - 1, 0);

  return (
    <div className="hand">
      <div className="cards">
        {visibleCards.map((card, index) => (
          <CardView key={`${card.rank}-${card.suit}-${index}`} card={card} />
        ))}
        {Array.from({ length: hiddenCount }).map((_, index) => (
          <CardView key={`hidden-${index}`} hidden />
        ))}
      </div>
      {revealHoleCard && (
        <p className="hand-total">
          {bestHandValue(hand)}
          {isSoftHand(hand) ? " soft" : ""}
        </p>
      )}
    </div>
  );
}

import { CardView } from "./CardView";
import type { Card } from "../game/cards";
import { bestHandValue, isSoftHand } from "../game/hand";

type HandViewProps = {
  hand: Card[];
  revealHoleCard?: boolean;
  /** Limits how many cards from `hand` are shown, for animating cards in one at a time. Defaults to the full hand. */
  revealCount?: number;
};

export function HandView({ hand, revealHoleCard = true, revealCount }: HandViewProps) {
  const revealedHand = revealCount === undefined ? hand : hand.slice(0, revealCount);
  const visibleCards = revealHoleCard ? revealedHand : revealedHand.slice(0, 1);
  const hiddenCount = revealHoleCard ? 0 : Math.max(revealedHand.length - 1, 0);

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
          {bestHandValue(revealedHand)}
          {isSoftHand(revealedHand) ? " soft" : ""}
        </p>
      )}
    </div>
  );
}

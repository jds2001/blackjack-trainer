import type { PlayerAction } from "../game/rules";

const labels: Record<PlayerAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
  surrender: "Surrender"
};

type ActionButtonsProps = {
  legalActions: PlayerAction[];
  onAction: (action: PlayerAction) => void;
};

export function ActionButtons({ legalActions, onAction }: ActionButtonsProps) {
  return (
    <div className="action-row">
      {(Object.keys(labels) as PlayerAction[]).map((action) => (
        <button key={action} disabled={!legalActions.includes(action)} onClick={() => onAction(action)}>
          {labels[action]}
        </button>
      ))}
    </div>
  );
}

import type { PlayerAction } from "../game/rules";
import { actionLabels } from "./actionLabels";

type ActionButtonsProps = {
  legalActions: PlayerAction[];
  onAction: (action: PlayerAction) => void;
};

export function ActionButtons({ legalActions, onAction }: ActionButtonsProps) {
  return (
    <div className="action-row">
      {(Object.keys(actionLabels) as PlayerAction[]).map((action) => (
        <button key={action} disabled={!legalActions.includes(action)} onClick={() => onAction(action)}>
          {actionLabels[action]}
        </button>
      ))}
    </div>
  );
}

import { dealerUpcards, type StrategyTableRow } from "../strategy/strategyTables";
import { strategyCodeFullLabel } from "../strategy/strategyLabels";
import type { DealerUpcard } from "../strategy/strategyTypes";

type StrategyRowProps = {
  row: StrategyTableRow;
  currentUpcard: DealerUpcard;
};

export function StrategyRow({ row, currentUpcard }: StrategyRowProps) {
  return (
    <div className="strategy-row" role="list" aria-label="Recommended action against each dealer upcard">
      {dealerUpcards.map((upcard) => {
        const isCurrent = upcard === currentUpcard;
        const code = row[upcard];
        return (
          <div
            key={upcard}
            role="listitem"
            className={isCurrent ? "strategy-row-cell current" : "strategy-row-cell"}
            aria-current={isCurrent ? "true" : undefined}
            title={strategyCodeFullLabel(code)}
            aria-label={`Dealer ${upcard}: ${strategyCodeFullLabel(code)}${isCurrent ? " (current)" : ""}`}
          >
            <span className="strategy-row-upcard" aria-hidden="true">
              {upcard}
            </span>
            <span className="strategy-row-code" aria-hidden="true">
              {isCurrent ? `[${code}]` : code}
            </span>
          </div>
        );
      })}
    </div>
  );
}

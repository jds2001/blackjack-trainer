import { useEffect, useRef } from "react";
import { dealerUpcards, type StrategyTableRow } from "../strategy/strategyTables";
import { strategyCodeFullLabel } from "../strategy/strategyLabels";
import type { DealerUpcard } from "../strategy/strategyTypes";

type StrategyGridProps = {
  title: string;
  rows: StrategyTableRow[];
  /** The `hand` label of the row to highlight, e.g. "Hard 16" or "8,8". */
  highlightRowLabel?: string;
  highlightUpcard?: DealerUpcard;
};

export function StrategyGrid({ title, rows, highlightRowLabel, highlightUpcard }: StrategyGridProps) {
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const row = highlightRowLabel ? highlightRowRef.current : null;
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "center" });
    }
  }, [highlightRowLabel]);

  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="strategy-table-wrap">
        <table className="strategy-table">
          <thead>
            <tr>
              <th scope="col">Hand</th>
              {dealerUpcards.map((upcard) => (
                <th
                  key={upcard}
                  scope="col"
                  className={upcard === highlightUpcard ? "current-col" : undefined}
                  aria-current={upcard === highlightUpcard ? "true" : undefined}
                >
                  {upcard}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCurrentRow = row.hand === highlightRowLabel;
              return (
                <tr key={row.hand} ref={isCurrentRow ? highlightRowRef : undefined} className={isCurrentRow ? "current-row" : undefined}>
                  <th scope="row" aria-current={isCurrentRow ? "true" : undefined}>
                    {row.hand}
                  </th>
                  {dealerUpcards.map((upcard) => {
                    const isCurrentColumn = upcard === highlightUpcard;
                    const isCurrentCell = isCurrentRow && isCurrentColumn;
                    const code = row[upcard];
                    const classNames = [isCurrentColumn ? "current-col" : "", isCurrentCell ? "current-cell" : ""]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td
                        key={upcard}
                        className={classNames || undefined}
                        aria-current={isCurrentCell ? "true" : undefined}
                        title={strategyCodeFullLabel(code)}
                        aria-label={`${row.hand} vs dealer ${upcard}: ${strategyCodeFullLabel(code)}${
                          isCurrentCell ? " (current recommendation)" : ""
                        }`}
                      >
                        {isCurrentCell ? `[${code}]` : code}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

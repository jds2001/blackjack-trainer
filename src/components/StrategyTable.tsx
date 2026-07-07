import type { TableRules } from "../game/rules";
import { dealerUpcards, generateStrategyTable, type StrategyTableRow } from "../strategy/strategyTables";

type StrategyTableProps = {
  rules: TableRules;
};

export function StrategyTable({ rules }: StrategyTableProps) {
  const tables = generateStrategyTable(rules);

  return (
    <section className="strategy-view">
      <StrategyGrid title="Hard totals" rows={tables.hardTotals} />
      <StrategyGrid title="Soft totals" rows={tables.softTotals} />
      <StrategyGrid title="Pairs" rows={tables.pairs} />
    </section>
  );
}

function StrategyGrid({ title, rows }: { title: string; rows: StrategyTableRow[] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="strategy-table-wrap">
        <table className="strategy-table">
          <thead>
            <tr>
              <th>Hand</th>
              {dealerUpcards.map((upcard) => (
                <th key={upcard}>{upcard}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.hand}>
                <th>{row.hand}</th>
                {dealerUpcards.map((upcard) => (
                  <td key={upcard}>{row[upcard]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

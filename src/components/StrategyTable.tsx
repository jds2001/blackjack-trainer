import type { TableRules } from "../game/rules";
import { generateStrategyTable } from "../strategy/strategyTables";
import { StrategyGrid } from "./StrategyGrid";

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

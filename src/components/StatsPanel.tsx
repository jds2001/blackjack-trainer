import type { SessionStats } from "../persistence/stats";

type StatsPanelProps = {
  stats: SessionStats;
};

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <section className="panel">
      <h2>Stats</h2>
      <div className="stat-grid">
        <Stat label="Hands" value={stats.handsCompleted} />
        <Stat label="Decisions" value={stats.decisions} />
        <Stat label="Correct" value={stats.correctDecisions} />
        <Stat label="Incorrect" value={stats.incorrectDecisions} />
        <Stat label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
        <Stat label="Bankroll" value={`$${stats.bankroll}`} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

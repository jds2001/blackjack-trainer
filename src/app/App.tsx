import { BookOpen, ChartNoAxesColumn, Settings, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionButtons } from "../components/ActionButtons";
import { HandView } from "../components/HandView";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatsPanel } from "../components/StatsPanel";
import { StrategyTable } from "../components/StrategyTable";
import { createInitialRound } from "../game/engine";
import { defaultRules, type TableRules } from "../game/rules";
import { createEmptyStats } from "../persistence/stats";

type View = "practice" | "strategy" | "stats" | "settings";

export function App() {
  const [activeView, setActiveView] = useState<View>("practice");
  const [rules, setRules] = useState<TableRules>(defaultRules);
  const [round] = useState(() => createInitialRound(defaultRules));
  const stats = useMemo(() => createEmptyStats(rules), [rules]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Basic strategy trainer</p>
          <h1>Blackjack Trainer</h1>
        </div>
        <nav className="nav-tabs" aria-label="Primary">
          <button className={activeView === "practice" ? "active" : ""} onClick={() => setActiveView("practice")}>
            Practice
          </button>
          <button className={activeView === "strategy" ? "active" : ""} onClick={() => setActiveView("strategy")}>
            <BookOpen size={16} /> Tables
          </button>
          <button className={activeView === "stats" ? "active" : ""} onClick={() => setActiveView("stats")}>
            <ChartNoAxesColumn size={16} /> Stats
          </button>
          <button className={activeView === "settings" ? "active" : ""} onClick={() => setActiveView("settings")}>
            <Settings size={16} /> Settings
          </button>
        </nav>
      </header>

      {activeView === "practice" && (
        <section className="practice-layout">
          <div className="table-surface">
            <div className="table-header">
              <div>
                <p className="label">Dealer</p>
                <HandView hand={round.dealerHand} revealHoleCard={false} />
              </div>
              <button className="icon-button" aria-label="Audio enabled">
                <Volume2 size={18} />
              </button>
            </div>

            <div>
              <p className="label">Player</p>
              <HandView hand={round.playerHands[0].cards} />
            </div>

            <ActionButtons legalActions={round.playerHands[0].legalActions} onAction={() => undefined} />
          </div>

          <aside className="side-panel">
            <h2>Current rules</h2>
            <dl>
              <dt>Decks</dt>
              <dd>{rules.deckCount}</dd>
              <dt>Dealer soft 17</dt>
              <dd>{rules.dealerHitsSoft17 ? "Hits" : "Stands"}</dd>
              <dt>Surrender</dt>
              <dd>{rules.surrenderAllowed ? "Allowed" : "Off"}</dd>
              <dt>Double after split</dt>
              <dd>{rules.doubleAfterSplit ? "Allowed" : "Off"}</dd>
            </dl>
          </aside>
        </section>
      )}

      {activeView === "strategy" && <StrategyTable rules={rules} />}
      {activeView === "stats" && <StatsPanel stats={stats} />}
      {activeView === "settings" && <SettingsPanel rules={rules} onChange={setRules} />}
    </main>
  );
}

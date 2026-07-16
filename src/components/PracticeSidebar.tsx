import { useState } from "react";
import type { ActionEvaluation, RoundState } from "../game/engine";
import type { TableRules } from "../game/rules";
import type { StrategyHelpMode } from "../persistence/preferences";
import type { StrategyTarget } from "../strategy/strategyLabels";
import { ContextualStrategyPanel } from "./ContextualStrategyPanel";

type SidebarTab = "strategy" | "rules";

type PracticeSidebarProps = {
  round: RoundState;
  rules: TableRules;
  feedback: ActionEvaluation | null;
  strategyHelpMode: StrategyHelpMode;
  dealerRevealComplete: boolean;
  onOpenChart: (target: StrategyTarget | null) => void;
};

export function PracticeSidebar({ round, rules, feedback, strategyHelpMode, dealerRevealComplete, onOpenChart }: PracticeSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>(strategyHelpMode === "off" ? "rules" : "strategy");

  return (
    <aside className="side-panel">
      <div className="nav-tabs" role="tablist" aria-label="Practice sidebar">
        <button
          type="button"
          role="tab"
          id="sidebar-tab-strategy"
          aria-selected={tab === "strategy"}
          aria-controls="sidebar-panel-strategy"
          className={tab === "strategy" ? "active" : ""}
          onClick={() => setTab("strategy")}
        >
          Strategy
        </button>
        <button
          type="button"
          role="tab"
          id="sidebar-tab-rules"
          aria-selected={tab === "rules"}
          aria-controls="sidebar-panel-rules"
          className={tab === "rules" ? "active" : ""}
          onClick={() => setTab("rules")}
        >
          Rules
        </button>
      </div>

      <div role="tabpanel" id="sidebar-panel-strategy" aria-labelledby="sidebar-tab-strategy" hidden={tab !== "strategy"}>
        <ContextualStrategyPanel
          round={round}
          rules={rules}
          feedback={feedback}
          strategyHelpMode={strategyHelpMode}
          dealerRevealComplete={dealerRevealComplete}
          onOpenChart={onOpenChart}
        />
      </div>

      <div role="tabpanel" id="sidebar-panel-rules" aria-labelledby="sidebar-tab-rules" hidden={tab !== "rules"}>
        <h2>Current rules</h2>
        <dl>
          <dt>Decks</dt>
          <dd>{rules.deckCount}</dd>
          <dt>Dealer soft 17</dt>
          <dd>{rules.dealerHitsSoft17 ? "Hits" : "Stands"}</dd>
          <dt>Dealer peeks</dt>
          <dd>{rules.dealerPeeksForBlackjack ? "Yes" : "No"}</dd>
          <dt>Surrender</dt>
          <dd>{rules.surrenderAllowed ? "Allowed" : "Off"}</dd>
          <dt>Double after split</dt>
          <dd>{rules.doubleAfterSplit ? "Allowed" : "Off"}</dd>
        </dl>
      </div>
    </aside>
  );
}

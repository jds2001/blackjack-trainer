import { previewActiveHandStrategy, type ActionEvaluation, type RoundState } from "../game/engine";
import type { TableRules } from "../game/rules";
import type { StrategyHelpMode } from "../persistence/preferences";
import { generateRowForHand } from "../strategy/strategyTables";
import { actionFullLabel, decisionKey, strategyCodeLegend, strategyTargetFor, type StrategyTarget } from "../strategy/strategyLabels";
import { StrategyRow } from "./StrategyRow";

type ContextualStrategyPanelProps = {
  round: RoundState;
  rules: TableRules;
  feedback: ActionEvaluation | null;
  strategyHelpMode: StrategyHelpMode;
  dealerRevealComplete: boolean;
  onOpenChart: (target: StrategyTarget | null) => void;
};

export function ContextualStrategyPanel({
  round,
  rules,
  feedback,
  strategyHelpMode,
  dealerRevealComplete,
  onOpenChart
}: ContextualStrategyPanelProps) {
  const preview = previewActiveHandStrategy(round, rules);
  const answeredCurrentDecision =
    preview !== null && feedback !== null && decisionKey(feedback.handIndex, feedback.cards) === decisionKey(preview.handIndex, preview.cards);

  // previewActiveHandStrategy returns null once the round settles, even when that settling was
  // the direct result of the decision just answered (e.g. a stand/double/surrender that ends the
  // hand). Fall back to the feedback itself so the recap for that final decision still renders
  // instead of the "round complete" empty state.
  const showSettledRecap = preview === null && round.status === "settled" && feedback !== null;
  const displayed = preview ?? (showSettledRecap ? feedback : null);
  const target = displayed ? strategyTargetFor(displayed.input) : null;

  return (
    <div className="strategy-panel">
      <p className="label">Strategy</p>
      {renderBody()}
      {feedback && (answeredCurrentDecision || showSettledRecap) && (
        <p className={feedback.wasCorrect ? "decision-feedback correct" : "decision-feedback incorrect"}>
          You chose {actionFullLabel(feedback.playerAction)}. Correct play: {actionFullLabel(feedback.recommendedAction)}.{" "}
          {feedback.wasCorrect ? "Correct!" : "Incorrect."}
        </p>
      )}
      <button className="strategy-chart-link" onClick={() => onOpenChart(target)}>
        View full chart
      </button>
    </div>
  );

  function renderBody() {
    if (strategyHelpMode === "off") {
      return <p className="strategy-hint">Strategy help is turned off. Turn it on in Settings, or check the full chart anytime.</p>;
    }

    if (!displayed || !target) {
      return <p className="strategy-hint">{emptyStateMessage()}</p>;
    }

    const handLabel = round.playerHands.length > 1 ? `Hand ${displayed.handIndex + 1} of ${round.playerHands.length}` : null;
    const revealed = strategyHelpMode === "always" || answeredCurrentDecision || showSettledRecap;

    return (
      // Keyed on the decision itself so a new hit/split re-mounts this block and replays the
      // entrance animation below — the dealer's upcard (and so the highlighted column) never
      // moves within a hand, so without this the row updating in place reads as "nothing happened".
      <div className="strategy-decision" key={decisionKey(displayed.handIndex, displayed.cards)}>
        {handLabel && <p className="strategy-hand-index">{handLabel}</p>}
        <p className="strategy-hand-line">
          {target.displayLabel} vs dealer {target.upcard}
        </p>

        {revealed ? (
          <>
            <p className="strategy-recommendation">{actionFullLabel(displayed.recommendedAction).toUpperCase()}</p>
            <StrategyRow row={generateRowForHand(target.rowLabel, displayed.input, rules)} currentUpcard={target.upcard} />
            <Legend />
          </>
        ) : (
          <p className="strategy-hint">Choose an action to reveal the recommended play.</p>
        )}
      </div>
    );
  }

  function emptyStateMessage() {
    if (round.status !== "settled") return "No decision available for this hand right now.";
    return dealerRevealComplete ? "Round complete. Deal a new hand to see strategy help." : "Dealer is playing…";
  }
}

function Legend() {
  return (
    <dl className="strategy-legend" aria-label="Abbreviation legend">
      {strategyCodeLegend.map(({ code, label }) => (
        <div className="strategy-legend-item" key={code}>
          <dt>{code}</dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  );
}

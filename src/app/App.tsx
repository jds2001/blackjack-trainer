import { BookOpen, ChartNoAxesColumn, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionButtons } from "../components/ActionButtons";
import { actionLabels } from "../components/actionLabels";
import { DrillSettingsPanel } from "../components/DrillSettingsPanel";
import { HandView } from "../components/HandView";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatsPanel } from "../components/StatsPanel";
import { StrategyTable } from "../components/StrategyTable";
import type { Card } from "../game/cards";
import { defaultDrillSettings, type DrillCategory, type DrillSettings } from "../game/drill";
import {
  applyPlayerAction,
  createDrillRound,
  createInitialRound,
  evaluateAction,
  nextShoeFor,
  payoutForResult,
  type ActionEvaluation,
  type HandResult,
  type RoundState
} from "../game/engine";
import { bestHandValue, isSoftHand } from "../game/hand";
import { defaultRules, type PlayerAction, type TableRules } from "../game/rules";
import { loadStats, recordDecision, recordSettledRound, saveStats, type SessionStats } from "../persistence/stats";
import { speak } from "../audio/speech";

type View = "practice" | "strategy" | "stats" | "settings";

const DEALER_CARD_DELAY_MS = 700;

export function App() {
  const [activeView, setActiveView] = useState<View>("practice");
  const [rules, setRules] = useState<TableRules>(defaultRules);
  const [round, setRound] = useState(() => createInitialRound(defaultRules));
  const [stats, setStats] = useState<SessionStats>(() => {
    const initialStats = loadStats(defaultRules);
    return round.status === "settled" ? tallySettledRound(initialStats, round) : initialStats;
  });
  const [feedback, setFeedback] = useState<ActionEvaluation | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [betAmount, setBetAmount] = useState(defaultRules.defaultBet);
  const [drillSettings, setDrillSettings] = useState<DrillSettings>(defaultDrillSettings);
  const [dealerRevealCount, setDealerRevealCount] = useState(round.dealerHand.length);
  const [pendingResultSpeech, setPendingResultSpeech] = useState<string | null>(null);

  useEffect(() => {
    if (round.status !== "settled") {
      setDealerRevealCount(round.dealerHand.length);
      return;
    }

    const finalCount = round.dealerHand.length;
    const startCount = Math.min(2, finalCount);
    setDealerRevealCount(startCount);
    if (finalCount <= startCount) return;

    let revealed = startCount;
    const timeouts: number[] = [];
    const revealNextCard = () => {
      timeouts.push(
        window.setTimeout(() => {
          revealed += 1;
          setDealerRevealCount(revealed);
          if (revealed < finalCount) revealNextCard();
        }, DEALER_CARD_DELAY_MS)
      );
    };
    revealNextCard();

    return () => timeouts.forEach((id) => window.clearTimeout(id));
  }, [round]);

  const dealerRevealComplete = dealerRevealCount >= round.dealerHand.length;

  useEffect(() => {
    if (pendingResultSpeech && dealerRevealComplete) {
      speak(pendingResultSpeech, audioEnabled);
      setPendingResultSpeech(null);
    }
  }, [pendingResultSpeech, dealerRevealComplete, audioEnabled]);

  function handleBetChange(value: number) {
    setBetAmount(clampBet(value, stats.bankroll));
  }

  function dealNewRound(effectiveRules: TableRules, previousRound: RoundState): RoundState {
    const rulesWithBet = { ...effectiveRules, defaultBet: betAmount };
    return drillSettings.enabled
      ? createDrillRound(rulesWithBet, drillSettings)
      : createInitialRound(rulesWithBet, nextShoeFor(previousRound, effectiveRules));
  }

  function updateStats(updater: (current: SessionStats) => SessionStats) {
    setStats((current) => {
      const updated = updater(current);
      saveStats(updated);
      return updated;
    });
  }

  function handleRulesChange(nextRules: TableRules) {
    setRules(nextRules);
    setStats(loadStats(nextRules));
    setFeedback(null);
    const newRound = dealNewRound(nextRules, round);
    setRound(newRound);
    if (newRound.status === "settled") {
      updateStats((current) => tallySettledRound(current, newRound));
      speak(newRound.message, audioEnabled);
    } else {
      speak(announceHandTotal(newRound.playerHands[0].cards), audioEnabled);
    }
  }

  function handleAction(action: PlayerAction) {
    const evaluation = evaluateAction(round, action, rules);
    const wasPlaying = round.status !== "settled";
    const nextRound = applyPlayerAction(round, action, rules);
    setRound(nextRound);
    setFeedback(evaluation);

    if (evaluation) {
      updateStats((current) => recordDecision(current, evaluation.wasCorrect));
    }
    if (wasPlaying && nextRound.status === "settled") {
      updateStats((current) => tallySettledRound(current, nextRound));
    }

    const speechParts: string[] = [];
    if (action === "hit" || action === "double" || action === "split") {
      const actedHand = nextRound.playerHands[round.activeHandIndex];
      if (actedHand) {
        speechParts.push(announceHandTotal(actedHand.cards));
      }
    }
    if (evaluation) {
      speechParts.push(evaluation.wasCorrect ? "Correct." : `Incorrect. Basic strategy says ${actionLabels[evaluation.recommendedAction]}.`);
    }
    if (wasPlaying && nextRound.status === "settled") {
      setPendingResultSpeech(nextRound.message);
    }
    if (speechParts.length > 0) {
      speak(speechParts.join(" "), audioEnabled);
    }
  }

  function dealNextRound() {
    const newRound = dealNewRound(rules, round);
    setRound(newRound);
    setFeedback(null);
    if (newRound.status === "settled") {
      updateStats((current) => tallySettledRound(current, newRound));
      speak(newRound.message, audioEnabled);
    } else {
      speak(announceHandTotal(newRound.playerHands[0].cards), audioEnabled);
    }
  }

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
                <HandView
                  hand={round.dealerHand}
                  revealHoleCard={round.status === "settled"}
                  revealCount={dealerRevealCount}
                />
              </div>
              <div className="table-header-controls">
                <p className="bankroll-display">
                  <span className="label">Bankroll</span>
                  <span className="bankroll-value">${stats.bankroll}</span>
                </p>
                <button
                  className="icon-button"
                  aria-label={audioEnabled ? "Disable audio" : "Enable audio"}
                  aria-pressed={audioEnabled}
                  onClick={() => setAudioEnabled((enabled) => !enabled)}
                >
                  {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>
            </div>

            <div className="player-hands">
              {round.playerHands.map((hand, index) => (
                <div
                  className={index === round.activeHandIndex && round.status === "playing" ? "player-hand active" : "player-hand"}
                  key={index}
                >
                  <div className="hand-heading">
                    <p className="label">Player hand {index + 1}</p>
                    <span>${hand.bet}</span>
                  </div>
                  <HandView hand={hand.cards} />
                  {hand.result && dealerRevealComplete && <p className="hand-result">{formatResult(hand.result)}</p>}
                </div>
              ))}
            </div>

            <p className="round-message">
              {round.status === "playing" || dealerRevealComplete ? round.message : "Dealer is playing…"}
            </p>

            {round.drillCategory && <p className="drill-badge">Drilling: {drillCategoryLabel(round.drillCategory)}</p>}

            {feedback && (
              <p className={feedback.wasCorrect ? "decision-feedback correct" : "decision-feedback incorrect"}>
                {feedback.wasCorrect
                  ? "Correct play."
                  : `Not quite — basic strategy says ${actionLabels[feedback.recommendedAction]}.`}
              </p>
            )}

            {round.status === "playing" ? (
              <ActionButtons legalActions={round.playerHands[round.activeHandIndex].legalActions} onAction={handleAction} />
            ) : dealerRevealComplete ? (
              <div className="deal-row">
                <label className="bet-control">
                  Next bet
                  <input
                    type="number"
                    min={1}
                    max={stats.bankroll}
                    value={betAmount}
                    onChange={(event) => handleBetChange(Number(event.target.value))}
                  />
                </label>
                <button className="primary-button" onClick={dealNextRound}>
                  Deal next hand
                </button>
              </div>
            ) : null}
          </div>

          <aside className="side-panel">
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
          </aside>
        </section>
      )}

      {activeView === "strategy" && <StrategyTable rules={rules} />}
      {activeView === "stats" && <StatsPanel stats={stats} />}
      {activeView === "settings" && (
        <>
          <SettingsPanel rules={rules} onChange={handleRulesChange} />
          <DrillSettingsPanel drillSettings={drillSettings} rules={rules} onChange={setDrillSettings} />
        </>
      )}
    </main>
  );
}

function clampBet(value: number, bankroll: number): number {
  if (Number.isNaN(value)) return 1;
  const max = Math.max(bankroll, 1);
  return Math.min(Math.max(Math.round(value), 1), max);
}

function announceHandTotal(cards: Card[]): string {
  const total = bestHandValue(cards);
  return isSoftHand(cards) ? `Soft ${total}.` : `${total}.`;
}

function tallySettledRound(stats: SessionStats, settledRound: RoundState): SessionStats {
  const bankrollDelta = settledRound.playerHands.reduce(
    (total, hand) => total + payoutForResult(hand.result!, hand.bet),
    0
  );
  return recordSettledRound(stats, bankrollDelta);
}

function drillCategoryLabel(category: DrillCategory) {
  return {
    soft: "soft hands",
    pair: "pairs",
    surrender: "surrender-eligible hands"
  }[category];
}

function formatResult(result: HandResult) {
  return {
    blackjack: "Blackjack",
    loss: "Loss",
    push: "Push",
    surrender: "Surrender",
    win: "Win"
  }[result];
}

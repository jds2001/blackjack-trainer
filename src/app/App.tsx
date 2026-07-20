import { BookOpen, ChartNoAxesColumn, Moon, Settings, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionButtons } from "../components/ActionButtons";
import { actionLabels } from "../components/actionLabels";
import { DrillSettingsPanel } from "../components/DrillSettingsPanel";
import { HandView } from "../components/HandView";
import { PracticeSidebar } from "../components/PracticeSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatsPanel } from "../components/StatsPanel";
import { StrategyChartDrawer } from "../components/StrategyChartDrawer";
import { StrategyHelpSettingsPanel } from "../components/StrategyHelpSettingsPanel";
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
import { loadPreferences, savePreferences, type StrategyHelpMode, type Theme } from "../persistence/preferences";
import { loadStats, recordDecision, recordSettledRound, saveStats, type SessionStats } from "../persistence/stats";
import type { StrategyTarget } from "../strategy/strategyLabels";
import { speak } from "../audio/speech";

type View = "practice" | "strategy" | "stats" | "settings";

const DEALER_CARD_DELAY_MS = 700;

/**
 * `speak()` calls `speechSynthesis.cancel()` before every utterance, so any two calls landing in
 * the same render/commit race each other and can silently drop both. `immediate` and `deferred`
 * are merged (never overwritten) by every producer and flushed as a single combined utterance
 * whenever they're ready, so simultaneous producers can never fire the speech API twice.
 */
type PendingSpeech = { immediate: string | null; deferred: string | null };
const noPendingSpeech: PendingSpeech = { immediate: null, deferred: null };

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
  const [pendingSpeech, setPendingSpeech] = useState<PendingSpeech>(noPendingSpeech);
  const [strategyHelpMode, setStrategyHelpMode] = useState<StrategyHelpMode>(() => loadPreferences().strategyHelpMode);
  const [theme, setTheme] = useState<Theme>(() => loadPreferences().theme);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartTarget, setChartTarget] = useState<StrategyTarget | null>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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

  // The sole call site for the speech API: joins whichever parts are ready this render into one
  // utterance. `deferred` parts wait for dealerRevealComplete; anything already ready when they're
  // queued (e.g. a hand-ending action that leaves the dealer's hand unchanged) is spoken together.
  useEffect(() => {
    const parts: string[] = [];
    if (pendingSpeech.immediate) parts.push(pendingSpeech.immediate);
    if (pendingSpeech.deferred && dealerRevealComplete) parts.push(pendingSpeech.deferred);
    if (parts.length === 0) return;

    speak(parts.join(" "), audioEnabled);
    setPendingSpeech((current) => ({
      immediate: null,
      deferred: dealerRevealComplete ? null : current.deferred
    }));
  }, [pendingSpeech, dealerRevealComplete, audioEnabled]);

  function speakNow(text: string) {
    setPendingSpeech((current) => ({ ...current, immediate: current.immediate ? `${current.immediate} ${text}` : text }));
  }

  function speakOnReveal(text: string) {
    setPendingSpeech((current) => ({ ...current, deferred: current.deferred ? `${current.deferred} ${text}` : text }));
  }

  // The very first hand is dealt by the useState initializer above, not dealNextRound(), so it
  // otherwise never gets announced. Runs once, on mount, mirroring dealNextRound()'s own announcement.
  // The ref guard (not just an empty dep array) matters here: StrictMode double-invokes mount
  // effects in development, and this one has no natural "undo" the way a subscribe/cleanup pair does.
  const hasAnnouncedInitialDeal = useRef(false);
  useEffect(() => {
    if (hasAnnouncedInitialDeal.current) return;
    hasAnnouncedInitialDeal.current = true;

    if (round.status === "settled") {
      speakOnReveal(round.message);
    } else {
      speakNow(announceHandTotal(round.playerHands[0].cards));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBetChange(value: number) {
    setBetAmount(clampBet(value, stats.bankroll));
  }

  function handleStrategyHelpModeChange(mode: StrategyHelpMode) {
    setStrategyHelpMode(mode);
    savePreferences({ strategyHelpMode: mode });
  }

  function handleThemeToggle() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    savePreferences({ theme: nextTheme });
  }

  function openStrategyChart(target: StrategyTarget | null) {
    setChartTarget(target);
    setChartOpen(true);
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

    const justSettled = wasPlaying && nextRound.status === "settled";
    if (justSettled) {
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
    if (speechParts.length > 0) {
      speakNow(speechParts.join(" "));
    }

    if (justSettled) {
      speakOnReveal(nextRound.message);
    }
  }

  function dealNextRound() {
    const newRound = dealNewRound(rules, round);
    setRound(newRound);
    setFeedback(null);
    if (newRound.status === "settled") {
      updateStats((current) => tallySettledRound(current, newRound));
      speakOnReveal(newRound.message);
    } else {
      speakNow(announceHandTotal(newRound.playerHands[0].cards));
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
                <button
                  className="icon-button"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  aria-pressed={theme === "dark"}
                  onClick={handleThemeToggle}
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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

          <PracticeSidebar
            round={round}
            rules={rules}
            feedback={feedback}
            strategyHelpMode={strategyHelpMode}
            dealerRevealComplete={dealerRevealComplete}
            onOpenChart={openStrategyChart}
          />
        </section>
      )}

      {activeView === "strategy" && <StrategyTable rules={rules} />}
      {activeView === "stats" && <StatsPanel stats={stats} />}
      {activeView === "settings" && (
        <>
          <SettingsPanel rules={rules} onChange={handleRulesChange} />
          <DrillSettingsPanel drillSettings={drillSettings} rules={rules} onChange={setDrillSettings} />
          <StrategyHelpSettingsPanel value={strategyHelpMode} onChange={handleStrategyHelpModeChange} />
          <section className="panel">
            <h2>Troubleshooting</h2>
            <p className="drill-description">
              If spoken feedback isn't working,{" "}
              <a href={`${import.meta.env.BASE_URL}speech-test.html`} target="_blank" rel="noopener noreferrer">
                open the speech diagnostics page
              </a>{" "}
              to check your browser's text-to-speech support independently of the app.
            </p>
          </section>
        </>
      )}

      <StrategyChartDrawer open={chartOpen} onClose={() => setChartOpen(false)} rules={rules} target={chartTarget} />
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

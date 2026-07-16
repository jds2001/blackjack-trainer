import { X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { TableRules } from "../game/rules";
import type { StrategyTarget } from "../strategy/strategyLabels";
import { generateStrategyTable, type StrategySection } from "../strategy/strategyTables";
import { StrategyGrid } from "./StrategyGrid";

type StrategyChartDrawerProps = {
  open: boolean;
  onClose: () => void;
  rules: TableRules;
  target: StrategyTarget | null;
};

const sectionTabs: { section: StrategySection; label: string }[] = [
  { section: "hardTotals", label: "Hard" },
  { section: "softTotals", label: "Soft" },
  { section: "pairs", label: "Pairs" }
];

const sectionTitles: Record<StrategySection, string> = {
  hardTotals: "Hard totals",
  softTotals: "Soft totals",
  pairs: "Pairs"
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function StrategyChartDrawer({ open, onClose, rules, target }: StrategyChartDrawerProps) {
  const [activeSection, setActiveSection] = useState<StrategySection>(target?.section ?? "hardTotals");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setActiveSection(target?.section ?? "hardTotals");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>(".drawer-close")?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    };
  }, [open, target]);

  if (!open) return null;

  const tables = generateStrategyTable(rules);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.offsetParent !== null
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="strategy-chart-title"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="drawer-header">
          <h2 id="strategy-chart-title">Full strategy chart</h2>
          <button type="button" className="icon-button drawer-close" aria-label="Close strategy chart" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="nav-tabs" role="tablist" aria-label="Strategy chart section">
          {sectionTabs.map((tab) => (
            <button
              type="button"
              key={tab.section}
              role="tab"
              id={`chart-tab-${tab.section}`}
              aria-selected={activeSection === tab.section}
              aria-controls={`chart-panel-${tab.section}`}
              className={activeSection === tab.section ? "active" : ""}
              onClick={() => setActiveSection(tab.section)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {sectionTabs.map((tab) => (
            <div
              key={tab.section}
              role="tabpanel"
              id={`chart-panel-${tab.section}`}
              aria-labelledby={`chart-tab-${tab.section}`}
              hidden={activeSection !== tab.section}
            >
              <StrategyGrid
                title={sectionTitles[tab.section]}
                rows={tables[tab.section]}
                highlightRowLabel={target && target.section === tab.section ? target.rowLabel : undefined}
                highlightUpcard={target?.upcard}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

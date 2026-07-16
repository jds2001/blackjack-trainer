import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { StrategyChartDrawer } from "../components/StrategyChartDrawer";
import { defaultRules } from "../game/rules";
import type { StrategyTarget } from "../strategy/strategyLabels";

function Harness({ target }: { target: StrategyTarget | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open chart</button>
      <StrategyChartDrawer open={open} onClose={() => setOpen(false)} rules={defaultRules} target={target} />
    </div>
  );
}

const pairTarget: StrategyTarget = { section: "pairs", rowLabel: "8,8", displayLabel: "Pair of 8s", upcard: "6" };

describe("StrategyChartDrawer", () => {
  it("does not render when closed", () => {
    render(<StrategyChartDrawer open={false} onClose={() => {}} rules={defaultRules} target={null} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens directly to the tab matching the active hand and highlights its row", () => {
    render(<Harness target={pairTarget} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const pairsTab = screen.getByRole("tab", { name: "Pairs" });
    expect(pairsTab).toHaveAttribute("aria-selected", "true");

    const hardTab = screen.getByRole("tab", { name: "Hard" });
    expect(hardTab).toHaveAttribute("aria-selected", "false");

    const highlightedCell = screen.getByRole("cell", { current: true });
    expect(highlightedCell).toHaveTextContent("[P]");
  });

  it("defaults to the hard-totals tab when there is no active-hand target", () => {
    render(<Harness target={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));
    expect(screen.getByRole("tab", { name: "Hard" })).toHaveAttribute("aria-selected", "true");
  });

  it("closes via the explicit close button and restores focus to the opener", () => {
    render(<Harness target={null} />);
    const opener = screen.getByRole("button", { name: "Open chart" });
    // jsdom doesn't move focus on a plain click the way a real browser does, so focus explicitly
    // to simulate opening the drawer from a focused control.
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByRole("button", { name: /close strategy chart/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes when clicking the overlay outside the panel", () => {
    render(<Harness target={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog.parentElement!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close when clicking inside the panel", () => {
    render(<Harness target={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));

    fireEvent.click(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<Harness target={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prevents background scrolling while open", () => {
    render(<Harness target={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Open chart" }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: /close strategy chart/i }));
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

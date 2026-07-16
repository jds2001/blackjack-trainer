import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PracticeSidebar } from "../components/PracticeSidebar";
import type { Card } from "../game/cards";
import type { RoundState } from "../game/engine";
import { defaultRules } from "../game/rules";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function makeRound(): RoundState {
  return {
    shoe: { cards: [], penetration: 0.75 },
    dealerHand: [card("10", "spades"), card("6", "hearts")],
    playerHands: [
      {
        cards: [card("K", "clubs"), card("6", "clubs")],
        bet: 25,
        legalActions: ["hit", "stand", "double", "surrender"],
        hasActed: false,
        isSurrendered: false,
        isSplitHand: false
      }
    ],
    activeHandIndex: 0,
    status: "playing",
    message: "Choose the best play."
  };
}

const noop = () => {};

describe("PracticeSidebar", () => {
  it("defaults to the Strategy tab when strategy help is enabled", () => {
    render(
      <PracticeSidebar
        round={makeRound()}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="always"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    expect(screen.getByRole("tab", { name: "Strategy" })).toHaveAttribute("aria-selected", "true");
  });

  it("defaults to the Rules tab when strategy help is off", () => {
    render(
      <PracticeSidebar round={makeRound()} rules={defaultRules} feedback={null} strategyHelpMode="off" dealerRevealComplete onOpenChart={noop} />
    );

    expect(screen.getByRole("tab", { name: "Rules" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows the current game rules, unchanged, on the Rules tab", () => {
    render(
      <PracticeSidebar
        round={makeRound()}
        rules={{ ...defaultRules, dealerHitsSoft17: true, surrenderAllowed: false }}
        feedback={null}
        strategyHelpMode="always"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Rules" }));

    expect(screen.getByText("Current rules")).toBeInTheDocument();
    expect(screen.getByText("Hits")).toBeInTheDocument();
    const surrenderRow = screen.getByText("Surrender").nextElementSibling;
    expect(surrenderRow).toHaveTextContent("Off");
  });

  it("switches between tabs on click", () => {
    render(
      <PracticeSidebar
        round={makeRound()}
        rules={defaultRules}
        feedback={null}
        strategyHelpMode="always"
        dealerRevealComplete
        onOpenChart={noop}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Rules" }));
    expect(screen.getByRole("tab", { name: "Rules" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Strategy" })).toHaveAttribute("aria-selected", "false");
  });
});

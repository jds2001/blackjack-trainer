import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";
import type { Card } from "../game/cards";
import * as shoeModule from "../game/shoe";

function card(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

vi.mock("../persistence/storage", () => {
  const store = new Map<string, unknown>();
  return {
    loadJson: (key: string, fallback: unknown) => (store.has(key) ? store.get(key) : fallback),
    saveJson: (key: string, value: unknown) => {
      store.set(key, value);
    }
  };
});

function tableSurface() {
  return document.querySelector(".table-surface") as HTMLElement;
}

function cardAltTexts() {
  return within(tableSurface())
    .getAllByRole("img")
    .map((img) => img.getAttribute("alt"));
}

beforeEach(() => {
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => [{ name: "Test Voice" }],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
    .fn()
    .mockImplementation((text: string) => ({ text }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App — announcing the initial deal", () => {
  it("announces the hand total for the very first hand dealt on mount", () => {
    // The first round is dealt by the useState initializer, not dealNextRound(), so it needs its
    // own announcement — it was previously silent on page load until the player took an action.
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("A", "clubs"))
      .mockReturnValueOnce(card("8", "diamonds"))
      .mockReturnValueOnce(card("10", "spades"))
      .mockReturnValueOnce(card("6", "hearts"));

    render(<App />);

    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0][0] as { text: string }).text).toMatch(/soft 19/i);
  });

  it("still announces it only once under StrictMode, which double-invokes mount effects in development", () => {
    // main.tsx renders <App/> inside <StrictMode>, which runs mount effects twice on purpose (as a
    // bug-detection measure) in development — real usage always goes through this, not a plain render.
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("A", "clubs"))
      .mockReturnValueOnce(card("8", "diamonds"))
      .mockReturnValueOnce(card("10", "spades"))
      .mockReturnValueOnce(card("6", "hearts"));

    render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    expect(speak).toHaveBeenCalledTimes(1);
    // A weaker assertion (call count alone) misses this: StrictMode's two invocations can still
    // land in the same batched pendingSpeech update, producing one call with the text doubled up
    // inside it (e.g. "Soft 19. Soft 19.") — audibly identical to being announced twice.
    const spokenText = (speak.mock.calls[0][0] as { text: string }).text;
    expect(spokenText.match(/soft 19/gi)).toHaveLength(1);
  });
});

describe("App — changing table rules", () => {
  it("does not deal a new hand or speak when a rule is changed mid-session", () => {
    render(<App />);

    const cardsBefore = cardAltTexts();
    const messageBefore = document.querySelector(".round-message")?.textContent;

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    speak.mockClear();

    const dealerSoft17Select = screen.getByLabelText(/dealer soft 17/i);
    const nextValue = (dealerSoft17Select as HTMLSelectElement).value === "hit" ? "stand" : "hit";
    fireEvent.change(dealerSoft17Select, { target: { value: nextValue } });

    expect(speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^practice$/i }));

    expect(cardAltTexts()).toEqual(cardsBefore);
    expect(document.querySelector(".round-message")?.textContent).toBe(messageBefore);
  });
});

describe("App — speech on a hit that busts", () => {
  it("speaks the hand total, correctness, and result as a single utterance instead of two competing ones", () => {
    vi.spyOn(shoeModule, "drawCard")
      .mockReturnValueOnce(card("K", "clubs"))
      .mockReturnValueOnce(card("6", "clubs"))
      .mockReturnValueOnce(card("10", "spades"))
      .mockReturnValueOnce(card("6", "hearts"))
      .mockReturnValueOnce(card("10", "hearts"));

    render(<App />);

    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    speak.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /^hit$/i }));

    // A second, near-simultaneous speak() call (e.g. a deferred pendingResultSpeech firing in the
    // same tick) would call speechSynthesis.cancel() again and can silently drop both utterances —
    // this is the "no speech synthesis on this hand" bug for hands that end in an immediate bust.
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0][0] as { text: string };
    expect(utterance.text).toMatch(/26/);
    expect(utterance.text).toMatch(/correct/i);
    expect(utterance.text).toMatch(/busts/i);
  });
});

describe("App — speech when the dealer must draw before settling", () => {
  it("speaks immediate feedback right away and the outcome later, as two separate utterances", () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(shoeModule, "drawCard")
        .mockReturnValueOnce(card("10", "clubs"))
        .mockReturnValueOnce(card("7", "diamonds"))
        .mockReturnValueOnce(card("5", "spades"))
        .mockReturnValueOnce(card("4", "hearts"))
        .mockReturnValueOnce(card("10", "spades"));

      render(<App />);

      const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
      speak.mockClear();

      fireEvent.click(screen.getByRole("button", { name: /^stand$/i }));

      expect(speak).toHaveBeenCalledTimes(1);
      expect((speak.mock.calls[0][0] as { text: string }).text).toMatch(/correct/i);

      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(speak).toHaveBeenCalledTimes(2);
      expect((speak.mock.calls[1][0] as { text: string }).text).toMatch(/dealer wins|player wins|push/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("App — speech across a fresh deal", () => {
  it("does not carry a stale pending utterance from the previous round into the next one", () => {
    vi.spyOn(shoeModule, "drawCard")
      // First round: player hits into a bust with nothing left for the dealer to draw.
      .mockReturnValueOnce(card("K", "clubs"))
      .mockReturnValueOnce(card("6", "clubs"))
      .mockReturnValueOnce(card("10", "spades"))
      .mockReturnValueOnce(card("6", "hearts"))
      .mockReturnValueOnce(card("10", "hearts"))
      // Second round: a fresh two-card deal, still mid-hand (no settle).
      .mockReturnValueOnce(card("9", "clubs"))
      .mockReturnValueOnce(card("2", "diamonds"))
      .mockReturnValueOnce(card("7", "spades"))
      .mockReturnValueOnce(card("3", "hearts"));

    render(<App />);

    const speak = window.speechSynthesis.speak as ReturnType<typeof vi.fn>;
    speak.mockClear(); // the initial deal's own mount-time announcement isn't what this test covers

    fireEvent.click(screen.getByRole("button", { name: /^hit$/i }));
    expect(speak).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /deal next hand/i }));

    // The prior round's outcome speech already fired above; dealing again must not re-speak it
    // or leave it queued to combine unexpectedly with the new hand's announcement.
    expect(speak).toHaveBeenCalledTimes(2);
    expect((speak.mock.calls[1][0] as { text: string }).text).not.toMatch(/busts/i);
  });
});

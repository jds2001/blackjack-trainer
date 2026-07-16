import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../app/App";

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
    speak: vi.fn()
  };
});

afterEach(() => {
  vi.restoreAllMocks();
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

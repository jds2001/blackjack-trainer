import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeSpeechSynthesis(initialVoices: unknown[]) {
  let voices = initialVoices;
  let voicesChangedHandler: (() => void) | null = null;
  return {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => voices,
    addEventListener: (event: string, handler: () => void) => {
      if (event === "voiceschanged") voicesChangedHandler = handler;
    },
    removeEventListener: (event: string, handler: () => void) => {
      if (event === "voiceschanged" && voicesChangedHandler === handler) voicesChangedHandler = null;
    },
    setVoices(next: unknown[]) {
      voices = next;
    },
    fireVoicesChanged() {
      voicesChangedHandler?.();
    }
  };
}

beforeEach(() => {
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = vi
    .fn()
    .mockImplementation((text: string) => ({ text }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe("speak", () => {
  it("speaks immediately when voices are already loaded", async () => {
    const synth = makeSpeechSynthesis([{ name: "Voice" }]);
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    const { speak } = await import("../audio/speech");

    speak("hello", true);

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0][0] as { text: string }).text).toBe("hello");
  });

  it("waits for voiceschanged before speaking the very first utterance when no voices are loaded yet", async () => {
    // This is the "doesn't speak on first page load, works after that" bug: the voice list loads
    // asynchronously, and calling speak() before it's ready must not just silently misbehave.
    const synth = makeSpeechSynthesis([]);
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    const { speak } = await import("../audio/speech");

    speak("hello", true);
    expect(synth.speak).not.toHaveBeenCalled();

    synth.setVoices([{ name: "Voice" }]);
    synth.fireVoicesChanged();
    await Promise.resolve();

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0][0] as { text: string }).text).toBe("hello");
  });

  it("falls back to speaking after a timeout if voiceschanged never fires", async () => {
    vi.useFakeTimers();
    const synth = makeSpeechSynthesis([]);
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    const { speak } = await import("../audio/speech");

    speak("hello", true);
    expect(synth.speak).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("does not call the speech API at all when disabled", async () => {
    const synth = makeSpeechSynthesis([{ name: "Voice" }]);
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = synth;
    const { speak } = await import("../audio/speech");

    speak("hello", false);

    expect(synth.speak).not.toHaveBeenCalled();
    expect(synth.cancel).not.toHaveBeenCalled();
  });
});

// Chromium has a long-standing bug where a SpeechSynthesisUtterance with no other reference to it
// can be garbage-collected mid-utterance, silently killing the speech with no error event. Holding
// a module-level reference until the browser reports it finished/errored keeps it alive.
// https://bugs.chromium.org/p/chromium/issues/detail?id=509488
let currentUtterance: SpeechSynthesisUtterance | null = null;

// The voice list loads asynchronously after the page loads. A speak() call issued before any
// voices are available is the classic cause of "doesn't work on first load, works after that" —
// wait for `voiceschanged` (once, ever) before letting the very first utterance through. Voices
// are normally already loaded by the time speak() is called, so this stays synchronous then.
let voicesReady: Promise<void> | null = null;

function waitForVoices(): Promise<void> {
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    // Some environments never fire voiceschanged (e.g. no voices installed) — don't hang forever.
    window.setTimeout(resolve, 1000);
  });

  return voicesReady;
}

export function speak(message: string, enabled: boolean): void {
  if (!enabled || !("speechSynthesis" in window)) return;

  if (window.speechSynthesis.getVoices().length === 0) {
    waitForVoices().then(() => doSpeak(message));
    return;
  }

  doSpeak(message);
}

function doSpeak(message: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  const release = () => {
    if (currentUtterance === utterance) currentUtterance = null;
  };
  utterance.onend = release;
  utterance.onerror = release;
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

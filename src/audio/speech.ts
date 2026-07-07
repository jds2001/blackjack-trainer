export function speak(message: string, enabled: boolean) {
  if (!enabled || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
}

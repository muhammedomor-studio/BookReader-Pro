export class TTSEngine {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private utterance: SpeechSynthesisUtterance | null = null;
  public isSpeaking = false;
  public rate = 1.0;

  public speak(text: string, onEnd?: () => void): void {
    this.stop();
    if (!text.trim()) return;

    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = this.rate;
    this.utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };
    this.utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(this.utterance);
    this.isSpeaking = true;
  }

  public pauseResume(): void {
    if (this.synth.speaking) {
      if (this.synth.paused) {
        this.synth.resume();
      } else {
        this.synth.pause();
      }
    }
  }

  public stop(): void {
    if (this.synth) this.synth.cancel();
    this.isSpeaking = false;
  }
}
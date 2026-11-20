/**
 * Offline Audio Manager using local synthesized WAV assets.
 */

export class SoundManager {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.cache = new Map();
  }

  play(name) {
    const settings = this.getSettings();
    if (!settings?.audioEnabled) return;
    if (typeof Audio === 'undefined') return;
    try {
      let audio = this.cache.get(name);
      if (!audio) {
        audio = new Audio(`/assets/audio/${name}.wav`);
        this.cache.set(name, audio);
      }
      audio.volume = Math.max(0, Math.min(1, settings.soundVolume ?? 0.7));
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Ignore autoplay restrictions before user gesture
    }
  }
}

/**
 * Reliable Pause/Resume Timer Engine
 * Established rules:
 * 1. Stops when the page becomes hidden (visibilitychange).
 * 2. Stops when the player exits or pauses.
 * 3. Resumes from remaining time on return.
 * 4. Operation Deadline is removed.
 * 5. Crash recovery never creates an unfair timeout.
 * 6. Uncertain time data never causes an automatic penalty.
 */

export class TaskTimer {
  constructor(initialRemainingSec, onTick, onExpire) {
    this.remainingSec = Math.max(1, Math.floor(Number.isFinite(initialRemainingSec) ? initialRemainingSec : 120));
    this.elapsedSec = 0;
    this.running = false;
    this.pausedByVisibility = false;
    this.pausedByUser = false;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this._intervalId = null;
    this._lastTickMs = null;
  }

  start() {
    if (this.running || this.pausedByUser || this.pausedByVisibility) return;
    if (this.remainingSec <= 0) return;
    this.running = true;
    this._lastTickMs = Date.now();
    this._intervalId = setInterval(() => this._step(), 250);
  }

  _step() {
    if (!this.running) return;
    const now = Date.now();
    const deltaMs = now - (this._lastTickMs ?? now);
    // Guard against system sleep / crash jump: cap single step at 2 seconds
    if (deltaMs >= 1000) {
      const safeSteps = Math.min(2, Math.floor(deltaMs / 1000));
      this._lastTickMs = now;
      this.remainingSec = Math.max(0, this.remainingSec - safeSteps);
      this.elapsedSec += safeSteps;
      if (this.onTick) this.onTick(this.remainingSec, this.elapsedSec);
      if (this.remainingSec <= 0) {
        this.stop();
        if (this.onExpire) this.onExpire();
      }
    }
  }

  pauseUser() {
    this.pausedByUser = true;
    this._haltInterval();
  }

  resumeUser() {
    this.pausedByUser = false;
    if (!this.pausedByVisibility) this.start();
  }

  handleVisibilityChange(isHidden) {
    if (isHidden) {
      this.pausedByVisibility = true;
      this._haltInterval();
    } else {
      this.pausedByVisibility = false;
      if (!this.pausedByUser) this.start();
    }
  }

  _haltInterval() {
    this.running = false;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._lastTickMs = null;
  }

  stop() {
    this._haltInterval();
  }
}

/**
 * Independent PauseManager (TDS v2.2.1 Mandatory MVP Feature)
 * Coordinates Pause/Resume across Exploration loop, TaskTimer, Input, and Audio.
 * Separate from ActivityRuntimeState and CampaignState.
 */

export class PauseManager {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.state = {
      isPaused: false,
      pausedAtScreen: null,
      reason: null,
      saveError: null,
    };
    this._hooks = {
      onPauseTimer: null,
      onResumeTimer: null,
      onPauseAudio: null,
      onResumeAudio: null,
    };
  }

  registerHooks(hooks) {
    this._hooks = { ...this._hooks, ...hooks };
  }

  pause(screenId, reason = 'user_esc') {
    if (this.state.isPaused) return false; // prevent nested pauses
    this.state.isPaused = true;
    this.state.pausedAtScreen = screenId;
    this.state.reason = reason;
    this.state.saveError = null;

    this._hooks.onPauseTimer?.();
    this._hooks.onPauseAudio?.();
    this.eventBus?.emit('GAME_PAUSED', { screenId, reason });
    return true;
  }

  resume() {
    if (!this.state.isPaused) return false;
    const prevScreen = this.state.pausedAtScreen;
    this.state.isPaused = false;
    this.state.pausedAtScreen = null;
    this.state.reason = null;
    this.state.saveError = null;

    this._hooks.onResumeAudio?.();
    this._hooks.onResumeTimer?.();
    this.eventBus?.emit('GAME_RESUMED', { screenId: prevScreen });
    return true;
  }

  async safeSaveAndTransition(saveFn, onSuccess) {
    this.state.saveError = null;
    try {
      await saveFn();
      this.state.isPaused = false;
      this.state.pausedAtScreen = null;
      this.state.reason = null;
      onSuccess();
      return { ok: true };
    } catch (err) {
      this.state.saveError = err?.message || 'ذخیره‌سازی با خطا مواجه شد.';
      return { ok: false, error: this.state.saveError };
    }
  }
}

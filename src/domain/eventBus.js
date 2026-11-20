/**
 * Isolated EventBus for decoupled engine-to-UI/Audio/Autosave notifications.
 * Never serves as the source of truth for game state.
 */

export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(eventName, handler) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    this._listeners.get(eventName)?.delete(handler);
  }

  emit(eventName, payload) {
    const handlers = this._listeners.get(eventName);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Listener error on "${eventName}":`, err);
      }
    }
  }
}

import { migrateSaveSlotToV22 as migrateSaveSlotIfNeeded } from './migration.js';
import {
  computeChecksum,
  validateProfile,
  validateSaveSlot,
} from './saveSchema.js';

/**
 * Local Offline Persistence Layer
 * Primary: IndexedDB (when in browser) + atomic localStorage mirror.
 * Fallback: In-memory store for Node automated tests.
 */

const DB_NAME = 'operation_cipher_v2';
const DB_VERSION = 1;
const LS_PROFILES_KEY = 'cipher_v2_profiles';
const LS_SAVES_KEY = 'cipher_v2_saves';
const LS_SETTINGS_KEY = 'cipher_v2_settings';

export class LocalStorageAdapter {
  constructor() {
    this._memory = new Map();
  }

  _hasLocalStorage() {
    try {
      return typeof globalThis.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  _readRaw(key) {
    if (this._hasLocalStorage()) {
      return globalThis.localStorage.getItem(key);
    }
    return this._memory.get(key) ?? null;
  }

  _writeRaw(key, value) {
    if (this._hasLocalStorage()) {
      globalThis.localStorage.setItem(key, value);
    } else {
      this._memory.set(key, value);
    }
  }

  async _syncToIndexedDB(storeName, key, data) {
    if (typeof globalThis.indexedDB === 'undefined') return;
    try {
      await new Promise((resolve, reject) => {
        const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles');
          if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).put(data, key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // IndexedDB failure is non-fatal because localStorage atomic mirror succeeded
    }
  }

  loadProfiles() {
    try {
      const raw = this._readRaw(LS_PROFILES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((p) => validateProfile(p).valid);
    } catch {
      return [];
    }
  }

  saveProfiles(profiles) {
    const valid = profiles.filter((p) => validateProfile(p).valid);
    this._writeRaw(LS_PROFILES_KEY, JSON.stringify(valid));
    this._syncToIndexedDB('profiles', 'all', valid);
    return valid;
  }

  loadSaveSlots() {
    const validSlots = [];
    const corruptedSlots = [];
    try {
      const raw = this._readRaw(LS_SAVES_KEY);
      if (!raw) return { validSlots, corruptedSlots };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return { validSlots: [], corruptedSlots: [{ slotId: 'root', error: 'ساختار فهرست ذخیره‌ها آسیب دیده است.' }] };
      }
      for (const item of parsed) {
        const check = validateSaveSlot(item);
        if (check.valid) {
          validSlots.push(item);
        } else {
          corruptedSlots.push({ slotId: item?.slotId || 'unknown', error: check.error, raw: item });
        }
      }
    } catch (err) {
      corruptedSlots.push({ slotId: 'parse', error: 'خطا در خواندن JSON ذخیره‌ها.' });
    }
    return { validSlots, corruptedSlots };
  }

  writeSaveSlot(slot) {
    const cleanState = JSON.parse(JSON.stringify(slot.state));
    const prepared = {
      ...slot,
      savedAt: new Date().toISOString(),
      checksum: computeChecksum(cleanState),
      state: cleanState,
    };
    const check = validateSaveSlot(prepared);
    if (!check.valid) {
      throw new Error(check.error);
    }
    const { validSlots } = this.loadSaveSlots();
    const idx = validSlots.findIndex((s) => s.slotId === prepared.slotId);
    if (idx >= 0) validSlots[idx] = prepared;
    else validSlots.push(prepared);

    this._writeRaw(LS_SAVES_KEY, JSON.stringify(validSlots));
    this._syncToIndexedDB('saves', 'all', validSlots);
    return prepared;
  }

  renameSaveSlot(slotId, newName) {
    const { validSlots } = this.loadSaveSlots();
    const target = validSlots.find((s) => s.slotId === slotId);
    if (!target) return false;
    target.name = newName.trim() || target.name;
    this._writeRaw(LS_SAVES_KEY, JSON.stringify(validSlots));
    this._syncToIndexedDB('saves', 'all', validSlots);
    return true;
  }

  deleteSaveSlot(slotId) {
    const { validSlots } = this.loadSaveSlots();
    const filtered = validSlots.filter((s) => s.slotId !== slotId);
    this._writeRaw(LS_SAVES_KEY, JSON.stringify(filtered));
    this._syncToIndexedDB('saves', 'all', filtered);
    return filtered;
  }

  loadSettings() {
    const defaults = {
      extraTime: false,
      highContrastMath: false,
      reducedMotion: false,
      audioEnabled: true,
      soundVolume: 0.7,
    };
    try {
      const raw = this._readRaw(LS_SETTINGS_KEY);
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }

  saveSettings(settings) {
    this._writeRaw(LS_SETTINGS_KEY, JSON.stringify(settings));
    this._syncToIndexedDB('settings', 'user', settings);
    return settings;
  }

  exportBackupJSON() {
    const profiles = this.loadProfiles();
    const { validSlots } = this.loadSaveSlots();
    const settings = this.loadSettings();
    const payload = {
      app: 'OPERATION: CIPHER',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      profiles,
      saves: validSlots,
      settings,
    };
    return JSON.stringify(payload, null, 2);
  }

  importBackupJSON(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { ok: false, error: 'فایل پشتیبان ساختار JSON معتبر ندارد.' };
    }
    if (!parsed || parsed.app !== 'OPERATION: CIPHER' || !Array.isArray(parsed.profiles) || !Array.isArray(parsed.saves)) {
      return { ok: false, error: 'فرمت فایل پشتیبان با OPERATION: CIPHER سازگار نیست.' };
    }

    const validProfiles = parsed.profiles.filter((p) => validateProfile(p).valid);
    const validSaves = [];
    for (const s of parsed.saves) {
      const migrated = migrateSaveSlotIfNeeded(s);
      if (migrated && validateSaveSlot(migrated).valid) {
        validSaves.push(migrated);
      }
    }

    this.saveProfiles(validProfiles);
    this._writeRaw(LS_SAVES_KEY, JSON.stringify(validSaves));
    if (parsed.settings) this.saveSettings(parsed.settings);
    return {
      ok: true,
      profilesImported: validProfiles.length,
      savesImported: validSaves.length,
    };
  }
}

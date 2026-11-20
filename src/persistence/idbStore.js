import { migrateSaveSlotToV22 } from './migration.js';
import {
  APP_VERSION,
  IDB_DB_VERSION,
  SAVE_SCHEMA_VERSION,
  computeChecksum,
  validateProfile,
  validateSaveSlot,
} from './saveSchema.js';

/**
 * Authoritative Offline Persistence Layer (TDS v2.2.1)
 * Primary: IndexedDB ('operation_cipher_db', v2) with 4 stores:
 *   - profiles
 *   - saves
 *   - backups (rotating auto_backup_<profileId> in atomic IDB transaction)
 *   - settings
 * Fallback: localStorage ONLY when IndexedDB is unavailable (never claimed atomic across both).
 */

const DB_NAME = 'operation_cipher_db';
const LS_PROFILES_KEY = 'cipher_v2_profiles';
const LS_SAVES_KEY = 'cipher_v2_saves';
const LS_BACKUPS_KEY = 'cipher_v2_backups';
const LS_SETTINGS_KEY = 'cipher_v2_settings';

export class IDBStore {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.db = null;
    this.useFallback = false;
    this._memory = new Map();
    this._cache = {
      profiles: [],
      saves: [],
      backups: [],
      settings: {
        extraTime: false,
        highContrastMath: false,
        reducedMotion: false,
        audioEnabled: true,
        soundVolume: 0.7,
      },
    };
  }

  _emitSaveError(code, message) {
    this.eventBus?.emit('SAVE_ERROR', { code, message });
  }

  _hasLocalStorage() {
    try {
      return typeof globalThis.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  _readLS(key) {
    if (this._hasLocalStorage()) return globalThis.localStorage.getItem(key);
    return this._memory.get(key) ?? null;
  }

  _writeLS(key, val) {
    try {
      if (this._hasLocalStorage()) globalThis.localStorage.setItem(key, val);
      else this._memory.set(key, val);
    } catch (err) {
      this._emitSaveError(err?.name || 'STORAGE_ERROR', 'فضای ذخیره‌سازی محلی پر شده یا در دسترس نیست.');
      throw err;
    }
  }

  async init() {
    if (typeof globalThis.indexedDB === 'undefined') {
      this.useFallback = true;
      this._hydrateFromFallback();
      return;
    }

    try {
      this.db = await new Promise((resolve, reject) => {
        const req = globalThis.indexedDB.open(DB_NAME, IDB_DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', { keyPath: 'slotId' });
          if (!db.objectStoreNames.contains('backups')) db.createObjectStore('backups', { keyPath: 'slotId' });
          if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await this._hydrateFromIDB();
    } catch (err) {
      console.warn('[IDBStore] IndexedDB unavailable, falling back to localStorage:', err);
      this.useFallback = true;
      this._hydrateFromFallback();
    }
  }

  async _idbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async _idbGetKey(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async _hydrateFromIDB() {
    const rawProfiles = await this._idbGetAll('profiles');
    this._cache.profiles = rawProfiles.filter((p) => validateProfile(p).valid);

    const rawSaves = await this._idbGetAll('saves');
    const migratedSaves = rawSaves.map((s) => (s.schemaVersion === SAVE_SCHEMA_VERSION ? s : migrateSaveSlotToV22(s))).filter(Boolean);
    this._cache.saves = migratedSaves;

    const rawBackups = await this._idbGetAll('backups');
    this._cache.backups = rawBackups;

    const st = await this._idbGetKey('settings', 'user_settings');
    if (st) this._cache.settings = { ...this._cache.settings, ...st };

    // Migrate legacy v2.0 localStorage data into IndexedDB once if IDB is empty
    if (this._cache.profiles.length === 0 && this._hasLocalStorage()) {
      const lsProf = this._readLS(LS_PROFILES_KEY);
      const lsSave = this._readLS(LS_SAVES_KEY);
      if (lsProf) {
        try {
          const parsedP = JSON.parse(lsProf);
          if (Array.isArray(parsedP) && parsedP.length > 0) {
            await this.saveProfiles(parsedP);
          }
        } catch {}
      }
      if (lsSave) {
        try {
          const parsedS = JSON.parse(lsSave);
          if (Array.isArray(parsedS)) {
            for (const item of parsedS) {
              const mig = migrateSaveSlotToV22(item);
              if (mig && validateSaveSlot(mig).valid) {
                await this.writeSaveSlot(mig);
              }
            }
          }
        } catch {}
      }
    }
  }

  _hydrateFromFallback() {
    try {
      const p = JSON.parse(this._readLS(LS_PROFILES_KEY) || '[]');
      this._cache.profiles = Array.isArray(p) ? p.filter((x) => validateProfile(x).valid) : [];
    } catch { this._cache.profiles = []; }

    try {
      const s = JSON.parse(this._readLS(LS_SAVES_KEY) || '[]');
      this._cache.saves = Array.isArray(s) ? s : [];
    } catch { this._cache.saves = []; }

    try {
      const b = JSON.parse(this._readLS(LS_BACKUPS_KEY) || '[]');
      this._cache.backups = Array.isArray(b) ? b : [];
    } catch { this._cache.backups = []; }

    try {
      const st = JSON.parse(this._readLS(LS_SETTINGS_KEY) || '{}');
      this._cache.settings = { ...this._cache.settings, ...st };
    } catch {}
  }

  loadProfiles() {
    return [...this._cache.profiles];
  }

  async saveProfiles(profiles) {
    const valid = profiles.filter((p) => validateProfile(p).valid);
    this._cache.profiles = valid;
    if (this.useFallback || !this.db) {
      this._writeLS(LS_PROFILES_KEY, JSON.stringify(valid));
      return valid;
    }
    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');
        store.clear();
        for (const p of valid) store.put(p);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
    } catch (err) {
      this._emitSaveError(err?.name || 'IDB_WRITE_ERROR', 'خطا در ذخیره پرونده فرمانده.');
      throw err;
    }
    return valid;
  }

  loadSaveSlots() {
    const validSlots = [];
    const corruptedSlots = [];
    for (const item of this._cache.saves) {
      const check = validateSaveSlot(item);
      if (check.valid) validSlots.push(item);
      else corruptedSlots.push({ slotId: item?.slotId || 'unknown', error: check.error, raw: item });
    }
    return { validSlots, corruptedSlots };
  }

  loadBackupsForProfile(profileId) {
    return this._cache.backups.filter((b) => b.profileId === profileId && validateSaveSlot(b).valid);
  }

  async writeSaveSlot(slot) {
    const cleanState = JSON.parse(JSON.stringify(slot.state || slot.campaignState));
    cleanState.version = SAVE_SCHEMA_VERSION;
    const prepared = {
      ...slot,
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      checksum: computeChecksum(cleanState),
      state: cleanState,
    };
    const check = validateSaveSlot(prepared);
    if (!check.valid) throw new Error(check.error);

    // Atomic backup rotation: if overwriting autosave, rotate previous autosave into backups
    const isAuto = Boolean(prepared.isAutoSave || prepared.kind === 'auto');
    const prevAuto = isAuto ? this._cache.saves.find((s) => s.slotId === prepared.slotId && validateSaveSlot(s).valid) : null;
    let rotatedBackup = null;
    if (prevAuto) {
      rotatedBackup = {
        ...prevAuto,
        slotId: `auto_backup_${prepared.profileId}`,
        kind: 'auto_backup',
        name: `پشتیبان چرخشی (${prevAuto.name})`,
      };
    }

    if (this.useFallback || !this.db) {
      const nextSaves = this._cache.saves.filter((s) => s.slotId !== prepared.slotId);
      nextSaves.push(prepared);
      this._cache.saves = nextSaves;
      if (rotatedBackup) {
        this._cache.backups = [
          ...this._cache.backups.filter((b) => b.slotId !== rotatedBackup.slotId),
          rotatedBackup,
        ];
        this._writeLS(LS_BACKUPS_KEY, JSON.stringify(this._cache.backups));
      }
      this._writeLS(LS_SAVES_KEY, JSON.stringify(this._cache.saves));
      return prepared;
    }

    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['saves', 'backups'], 'readwrite');
        if (rotatedBackup) {
          tx.objectStore('backups').put(rotatedBackup);
        }
        tx.objectStore('saves').put(prepared);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      });
      this._cache.saves = [...this._cache.saves.filter((s) => s.slotId !== prepared.slotId), prepared];
      if (rotatedBackup) {
        this._cache.backups = [...this._cache.backups.filter((b) => b.slotId !== rotatedBackup.slotId), rotatedBackup];
      }
      return prepared;
    } catch (err) {
      this._emitSaveError(err?.name || 'IDB_WRITE_ERROR', 'خطا در ذخیره‌سازی اتمیک بازی.');
      throw err;
    }
  }

  async renameSaveSlot(slotId, newName) {
    const target = this._cache.saves.find((s) => s.slotId === slotId);
    if (!target) return false;
    target.name = newName.trim() || target.name;
    return this.writeSaveSlot(target);
  }

  async deleteSaveSlot(slotId) {
    this._cache.saves = this._cache.saves.filter((s) => s.slotId !== slotId);
    if (this.useFallback || !this.db) {
      this._writeLS(LS_SAVES_KEY, JSON.stringify(this._cache.saves));
      return this._cache.saves;
    }
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction('saves', 'readwrite');
      tx.objectStore('saves').delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return this._cache.saves;
  }

  loadSettings() {
    return { ...this._cache.settings };
  }

  async saveSettings(settings) {
    this._cache.settings = { ...settings };
    if (this.useFallback || !this.db) {
      this._writeLS(LS_SETTINGS_KEY, JSON.stringify(this._cache.settings));
      return this._cache.settings;
    }
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put(this._cache.settings, 'user_settings');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return this._cache.settings;
  }

  exportBackupJSON() {
    const { validSlots } = this.loadSaveSlots();
    return JSON.stringify(
      {
        app: 'OPERATION: CIPHER',
        version: APP_VERSION,
        schemaVersion: SAVE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        profiles: this.loadProfiles(),
        saves: validSlots,
        backups: this._cache.backups,
        settings: this.loadSettings(),
      },
      null,
      2
    );
  }

  async importBackupJSON(jsonString) {
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
    await this.saveProfiles(validProfiles);

    let savesImported = 0;
    for (const s of parsed.saves) {
      const migrated = migrateSaveSlotToV22(s);
      if (migrated && validateSaveSlot(migrated).valid) {
        await this.writeSaveSlot(migrated);
        savesImported++;
      }
    }
    if (parsed.settings) await this.saveSettings(parsed.settings);
    return { ok: true, profilesImported: validProfiles.length, savesImported };
  }
}

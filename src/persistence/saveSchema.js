import { GAME_VERSION } from '../domain/version.js';
/**
 * Versioned Save Schema & Mandatory Structural/Semantic Validation (v2.2.0)
 * Note: FNV-1a checksum detects accidental corruption/truncation, not cryptographic tampering.
 */

export const SAVE_SCHEMA_VERSION = '2.2.0';
export const APP_VERSION = GAME_VERSION;
export const IDB_DB_VERSION = 2;

export function computeChecksum(payloadObj) {
  const json = JSON.stringify(payloadObj);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function validateProfile(p) {
  if (!p || typeof p !== 'object') return { valid: false, error: 'ساختار پرونده نامعتبر است.' };
  if (typeof p.id !== 'string' || !p.id.trim()) return { valid: false, error: 'شناسه پرونده نامعتبر است.' };
  if (typeof p.displayName !== 'string' || !p.displayName.trim()) {
    return { valid: false, error: 'نام نمایشی پرونده وجود ندارد.' };
  }
  if (!p.appearance || typeof p.appearance.appearanceIndex !== 'number') {
    return { valid: false, error: 'اطلاعات ظاهری شخصیت ناقص است.' };
  }
  if (!Array.isArray(p.learningHistory)) {
    return { valid: false, error: 'تاریخچه یادگیری نامعتبر است.' };
  }
  return { valid: true };
}

export function validateCampaignState(s) {
  if (!s || typeof s !== 'object') return { valid: false, error: 'وضعیت بازی نامعتبر است.' };
  if (typeof s.profileId !== 'string' || !s.profileId) return { valid: false, error: 'شناسه پرونده در ذخیره موجود نیست.' };
  if (typeof s.campaignId !== 'string' || !s.campaignId) return { valid: false, error: 'شناسه کارزار نامعتبر است.' };
  if (!['easy', 'normal', 'hard', 'expert'].includes(s.difficulty)) {
    return { valid: false, error: 'درجه سختی کارزار نامعتبر است.' };
  }
  if (typeof s.stability !== 'number' || Number.isNaN(s.stability) || s.stability < 0 || s.stability > 100) {
    return { valid: false, error: 'مقدار پایداری خارج از بازه مجاز است.' };
  }
  if (typeof s.operationalCredits !== 'number' || Number.isNaN(s.operationalCredits) || s.operationalCredits < 0) {
    return { valid: false, error: 'اعتبار عملیاتی نامعتبر است.' };
  }
  if (!s.board || !Array.isArray(s.board.placedIds) || !Array.isArray(s.board.connections)) {
    return { valid: false, error: 'ساختار تخته شواهد آسیب دیده است.' };
  }
  if (!Array.isArray(s.team) || s.team.length === 0) {
    return { valid: false, error: 'اطلاعات تیم عملیاتی ناقص است.' };
  }
  if (s.activeTask && Array.isArray(s.activeTask.choiceOrder)) {
    const sorted = [...s.activeTask.choiceOrder].sort((a, b) => a - b);
    if (sorted.join(',') !== '0,1,2,3') {
      return { valid: false, error: 'ترتیب گزینه‌های سوال نامعتبر است.' };
    }
  }
  return { valid: true };
}

export function validateSaveSlot(slot) {
  if (!slot || typeof slot !== 'object') return { valid: false, error: 'فایل ذخیره خالی یا نامعتبر است.' };
  if (typeof slot.slotId !== 'string' || !slot.slotId) return { valid: false, error: 'شناسه جایگاه ذخیره نامعتبر است.' };
  const stateObj = slot.campaignState || slot.state;
  const stateCheck = validateCampaignState(stateObj);
  if (!stateCheck.valid) return stateCheck;

  // Mandatory checksum enforcement
  if (typeof slot.checksum !== 'string' || slot.checksum.length === 0) {
    return { valid: false, error: 'امضای صحت (Checksum) فایل ذخیره وجود ندارد.' };
  }
  const expected = computeChecksum(stateObj);
  if (slot.checksum !== expected) {
    return { valid: false, error: 'کنترل صحت (Checksum) فایل ذخیره با خطا مواجه شد؛ داده ممکن است آسیب دیده باشد.' };
  }
  return { valid: true };
}

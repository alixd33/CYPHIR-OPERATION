import { validateSaveSlot } from '../persistence/saveSchema.js';

/**
 * Recovery & Retry Manager
 * Handles corrupt save quarantine, fallback to valid checkpoints, and stage retry rules.
 */

export function evaluateFailureLevel(stability) {
  if (stability <= 0) return 'critical';
  if (stability <= 35) return 'serious';
  if (stability <= 65) return 'minor';
  return 'none';
}

export function recoverBestSaveForProfile(storage, profileId) {
  const { validSlots, corruptedSlots } = storage.loadSaveSlots();
  const profileSaves = validSlots
    .filter((s) => s.profileId === profileId)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  if (profileSaves.length > 0) {
    return {
      recovered: true,
      slot: profileSaves[0],
      corruptedCount: corruptedSlots.length,
      message:
        corruptedSlots.length > 0
          ? `تعداد ${corruptedSlots.length} ذخیره آسیب‌دیده نادیده گرفته شد و آخرین ذخیره سالم بازیابی شد.`
          : 'آخرین ذخیره سالم بازیابی شد.',
    };
  }

  return {
    recovered: false,
    slot: null,
    corruptedCount: corruptedSlots.length,
    message:
      corruptedSlots.length > 0
        ? 'ذخیره‌های یافت‌شده آسیب‌دیده بودند و فایل سالم جایگزینی وجود نداشت.'
        : 'هیچ ذخیره‌ای برای این پرونده یافت نشد.',
  };
}

export function validateRawSaveOrRecover(rawSlot, fallbackCheckpoint) {
  const check = validateSaveSlot(rawSlot);
  if (check.valid) {
    return { ok: true, slot: rawSlot, recoveredFromFallback: false };
  }
  if (fallbackCheckpoint && validateSaveSlot(fallbackCheckpoint).valid) {
    return {
      ok: true,
      slot: fallbackCheckpoint,
      recoveredFromFallback: true,
      warning: `ذخیره اصلی آسیب دیده بود (${check.error}). بازی به آخرین نقطه بازبینی سالم بازگردانده شد.`,
    };
  }
  return { ok: false, error: check.error };
}

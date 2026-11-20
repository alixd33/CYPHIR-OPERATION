/**
 * 3-Dimensional Difficulty Progression & Campaign Difficulty Modifiers
 * Dimensions:
 * 1. Mathematical difficulty (1..5)
 * 2. Operational complexity (1..5)
 * 3. Narrative complexity (1..5)
 * Learning accessibility is strictly independent from campaign difficulty.
 */

export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    label: 'آسان',
    description: 'پشتیبانی کامل، آسیب پایداری کمتر در خطاها و زمان بیشتر برای تحلیل.',
    stabilityPenaltyOnWrong: 12,
    timeScale: 1.4,
    startingOC: 120,
  },
  normal: {
    id: 'normal',
    label: 'عادی',
    description: 'تعادل استاندارد میان فشار عملیاتی، تحلیل ریاضی و مدیریت تیم.',
    stabilityPenaltyOnWrong: 20,
    timeScale: 1.0,
    startingOC: 100,
  },
  hard: {
    id: 'hard',
    label: 'سخت',
    description: 'حاشیه خطای محدودتر، هزینه پایداری بیشتر و فشار زمانی بالاتر.',
    stabilityPenaltyOnWrong: 28,
    timeScale: 0.85,
    startingOC: 90,
  },
  expert: {
    id: 'expert',
    label: 'حرفه‌ای',
    description: 'شرایط بحرانی تمام‌عیار برای فرماندهان باتجربه CIPHER.',
    stabilityPenaltyOnWrong: 35,
    timeScale: 0.75,
    startingOC: 80,
  },
};

export function compute3DDifficultyScore(dims) {
  const m = dims?.mathematical ?? 1;
  const o = dims?.operational ?? 1;
  const n = dims?.narrative ?? 1;
  return Number(((m * 0.4 + o * 0.3 + n * 0.3)).toFixed(2));
}

export function getEffectiveTimeLimit(baseSec, campaignDifficulty, accessibility) {
  const preset = DIFFICULTY_PRESETS[campaignDifficulty] ?? DIFFICULTY_PRESETS.normal;
  const accScale = accessibility?.extraTime ? 1.5 : 1.0;
  return Math.round(baseSec * preset.timeScale * accScale);
}

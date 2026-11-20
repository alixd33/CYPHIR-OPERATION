/**
 * Centralized Persian Terminology Dictionary & Numeral Enforcement
 * Enforces English numerals (0-9) across all UI, narrative, and math content.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toEnglishDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

export const TERMS = {
  // Proper Names (kept in English per policy)
  GAME_TITLE: 'OPERATION: CIPHER',
  ORG_NAME: 'CIPHER',
  ADVERSARY_NAME: 'THE VEIL',
  MAIN_CASE_NAME: 'SILENT ARCHIVE',

  // Core Structure
  PROFILE: 'پرونده فرمانده',
  CAMPAIGN: 'کارزار',
  CHAPTER: 'فصل',
  OPERATION: 'عملیات',
  STAGE: 'مرحله',
  TASK: 'ماموریت تحلیلی',

  // HQ Locations
  LOCATIONS: {
    operations: 'اتاق عملیات',
    analysis: 'اتاق تحلیل',
    evidence: 'اتاق شواهد',
    lab: 'آزمایشگاه دیجیتال',
    team: 'اتاق تیم',
    equipment: 'اتاق تجهیزات',
    archive: 'بایگانی',
    rest: 'فضای استراحت',
    director: 'دفتر مدیر',
  },

  // Economy & Status
  OC_LABEL: 'اعتبار عملیاتی',
  OC_SHORT: 'OC',
  TC_LABEL: 'اعتبار زمانی',
  TC_SHORT: 'TC',
  STABILITY_LABEL: 'پایداری عملیات',
  PERFORMANCE_LABEL: 'امتیاز عملکرد',
  LEARNING_LABEL: 'پیشرفت یادگیری',

  // Evidence Categories
  EVIDENCE_CATEGORY: {
    confirmed_fact: 'واقعیت تاییدشده',
    interpretation: 'برداشت تحلیلی',
    unverified_hypothesis: 'فرضیه تاییدنشده',
  },

  // Difficulty
  DIFFICULTY: {
    easy: 'آسان',
    normal: 'عادی',
    hard: 'سخت',
    expert: 'حرفه‌ای',
  },

  // Navigation & Menus
  MENU: {
    NEW_GAME: 'شروع بازی جدید',
    CONTINUE: 'ادامه عملیات',
    PROFILES: 'مدیریت پرونده‌ها',
    SETTINGS: 'تنظیمات',
    CREDITS: 'سازندگان',
    EXIT: 'خروج',
  },

  // Help System
  HELP: {
    HINT_1: 'مفهوم یا فرمول پایه',
    HINT_2: 'راهنمای شروع یا ادامه حل',
    HINT_3: 'نمایش راه حل کامل',
    ELIM_1: 'حذف 1 گزینه نادرست',
    ELIM_2: 'حذف 2 گزینه نادرست',
  },
};

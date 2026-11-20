/**
 * Economy & Help Cost System
 * Keeps Performance Score, Operational Credits (OC), Temporal Credits (TC),
 * and Learning Progress strictly separate.
 */

export const HELP_COSTS = {
  hint_1: 10,
  hint_2: 18,
  hint_3: 30,
  elim_1: 12,
  elim_2: 22,
};

export const INITIAL_OC = 100;
export const INITIAL_TC = 2; // Reserved for future Decision Rollback

export function canAffordHelp(state, helpType) {
  const cost = HELP_COSTS[helpType] ?? 0;
  return state.operationalCredits >= cost;
}

export function grantUniqueReward(state, rewardId, amountOC, amountTC = 0) {
  if (state.claimedRewardIds.includes(rewardId)) {
    return { granted: false, state };
  }
  const next = {
    ...state,
    operationalCredits: state.operationalCredits + amountOC,
    temporalCredits: state.temporalCredits + amountTC,
    claimedRewardIds: [...state.claimedRewardIds, rewardId],
  };
  return { granted: true, state: next };
}

export function spendOCForHelp(state, helpType) {
  const cost = HELP_COSTS[helpType];
  if (cost === undefined) {
    return { ok: false, reason: 'نوع راهنما نامعتبر است.' };
  }
  if (state.operationalCredits < cost) {
    return {
      ok: false,
      reason: `اعتبار عملیاتی کافی نیست. نیاز: ${cost} OC — موجودی فعلی: ${state.operationalCredits} OC`,
    };
  }
  // Help usage MUST NOT change Stability
  return {
    ok: true,
    cost,
    nextOC: state.operationalCredits - cost,
  };
}

export function computeLearningProgress(profile) {
  const total = profile.totalAttempted || 0;
  const correct = profile.totalCorrect || 0;
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const chaptersMastered = {};
  for (const entry of profile.learningHistory || []) {
    if (!chaptersMastered[entry.chapter]) {
      chaptersMastered[entry.chapter] = { attempted: 0, correct: 0 };
    }
    chaptersMastered[entry.chapter].attempted += 1;
    if (entry.isCorrect) chaptersMastered[entry.chapter].correct += 1;
  }
  return {
    totalAttempted: total,
    totalCorrect: correct,
    accuracyPct,
    chaptersMastered,
  };
}

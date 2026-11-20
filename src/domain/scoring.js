/**
 * Configurable Performance Scoring Model
 * Evaluates Accuracy, Independence, Consistency, Difficulty, and Efficiency.
 * Never rewards speed at the expense of mathematical accuracy.
 */

export const SCORING_CONFIG = {
  baseCorrectPoints: 100,
  incorrectPoints: 0,
  difficultyMultiplier: {
    easy: 0.9,
    normal: 1.0,
    hard: 1.2,
    expert: 1.4,
  },
  hintPenalty: {
    1: 12,
    2: 20,
    3: 45,
  },
  elimPenaltyPerOption: 15,
  streakBonusPerStep: 15,
  maxStreakBonus: 60,
  efficiencyBonusMax: 20, // Awarded only when accurate & within suggested time
};

export function calculateTaskPerformance({
  isCorrect,
  campaignDifficulty = 'normal',
  questionDifficulty = 1, // 1..3
  hintsUsed = [],
  eliminatedCount = 0,
  consecutiveCorrect = 0,
  timeSpentSec = 0,
  suggestedTimeSec = 120,
}) {
  if (!isCorrect) {
    return {
      points: SCORING_CONFIG.incorrectPoints,
      breakdown: {
        accuracy: 0,
        independence: 0,
        consistency: 0,
        efficiency: 0,
      },
    };
  }

  const diffMult = SCORING_CONFIG.difficultyMultiplier[campaignDifficulty] ?? 1.0;
  const qMult = 1 + (questionDifficulty - 1) * 0.15;
  const accuracy = Math.round(SCORING_CONFIG.baseCorrectPoints * diffMult * qMult);

  let penalty = 0;
  for (const h of hintsUsed) {
    penalty += SCORING_CONFIG.hintPenalty[h] ?? 0;
  }
  penalty += eliminatedCount * SCORING_CONFIG.elimPenaltyPerOption;
  const independence = Math.max(-accuracy + 20, -penalty);

  const consistency = Math.min(
    SCORING_CONFIG.maxStreakBonus,
    consecutiveCorrect * SCORING_CONFIG.streakBonusPerStep
  );

  // Efficiency only rewards reasonable pacing when answer is ALREADY correct
  const efficiency =
    timeSpentSec > 0 && timeSpentSec <= suggestedTimeSec
      ? SCORING_CONFIG.efficiencyBonusMax
      : Math.round(SCORING_CONFIG.efficiencyBonusMax * 0.4);

  const points = Math.max(15, accuracy + independence + consistency + efficiency);
  return {
    points,
    breakdown: { accuracy, independence, consistency, efficiency },
  };
}

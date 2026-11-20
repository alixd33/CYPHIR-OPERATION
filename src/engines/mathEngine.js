import { DIFFICULTY_PRESETS, getEffectiveTimeLimit } from '../domain/difficulty.js';
import { HELP_COSTS, grantUniqueReward } from '../domain/economy.js';
import { calculateTaskPerformance } from '../domain/scoring.js';

/**
 * Independent MathEngine (TDS v2.2.1)
 * Decoupled from story, scenes, UI, and QuestionBank storage.
 * - Manages choiceOrder[displayIdx] = originalIdx (persisted in TaskAttemptState)
 * - Elimination contract: elim_1 -> 3 remaining, elim_2 -> 2 remaining
 * - Supports MCQ (MVP) and Numeric/OpenEnded evaluator hooks (Future)
 */

function seededChoicePermutation(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    const j = (h >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class MathEngine {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
  }

  createTaskAttempt(question, taskId, difficulty, settings, existingAttempt = null) {
    if (existingAttempt && existingAttempt.questionId === question.id) {
      return existingAttempt;
    }
    const timeLimit = getEffectiveTimeLimit(question.suggestedTimeSec, difficulty, settings);
    const choiceOrder = seededChoicePermutation(`${question.id}:${taskId}`);
    const attempt = {
      taskId,
      questionId: question.id,
      choiceOrder, // choiceOrder[displayIndex] = originalIndex
      selectedIndex: null, // stored as originalIndex
      submitted: false,
      isCorrect: null,
      eliminatedIndices: [], // stored as originalIndex
      unlockedHints: [],
      remainingSec: timeLimit,
      elapsedSec: 0,
    };
    this.eventBus?.emit('MATH_TASK_STARTED', { taskId, questionId: question.id });
    return attempt;
  }

  getHelpCost(helpType, teamModifiers) {
    const base = HELP_COSTS[helpType];
    if (base === undefined) return null;
    const discount = teamModifiers?.hintDiscountOC ?? 0;
    return Math.max(1, base - discount);
  }

  applyHelp(campaignState, taskState, question, helpType, teamModifiers) {
    if (!taskState || taskState.submitted) {
      return { ok: false, reason: 'پاسخ این ماموریت قبلاً ثبت شده است.' };
    }
    const cost = this.getHelpCost(helpType, teamModifiers);
    if (cost === null) return { ok: false, reason: 'نوع راهنما نامعتبر است.' };

    if (helpType.startsWith('hint_')) {
      const level = Number(helpType.split('_')[1]);
      if (taskState.unlockedHints.includes(level)) {
        return { ok: true, cost: 0, alreadyUnlocked: true };
      }
      if (campaignState.operationalCredits < cost) {
        return { ok: false, reason: `اعتبار عملیاتی کافی نیست (${cost} OC لازم است).` };
      }
      taskState.unlockedHints.push(level);
      campaignState.operationalCredits -= cost;
      campaignState.helpLog.push({
        taskId: taskState.taskId,
        questionId: question.id,
        type: helpType,
        costOC: cost,
        timestamp: new Date().toISOString(),
      });
      this.eventBus?.emit('MATH_HINT_USED', { taskId: taskState.taskId, level, costOC: cost });
      return { ok: true, cost };
    }

    if (helpType === 'elim_1' || helpType === 'elim_2') {
      const countToElim = helpType === 'elim_1' ? 1 : 2;
      const availableWrong = [0, 1, 2, 3].filter(
        (origIdx) => origIdx !== question.correctIndex && !taskState.eliminatedIndices.includes(origIdx)
      );
      const remainingAfter = 4 - (taskState.eliminatedIndices.length + countToElim);
      if (availableWrong.length < countToElim || remainingAfter < 2) {
        return { ok: false, reason: 'حداقل 2 گزینه باید باقی بمانند.' };
      }
      if (campaignState.operationalCredits < cost) {
        return { ok: false, reason: `اعتبار عملیاتی کافی نیست (${cost} OC لازم است).` };
      }
      // Deterministic non-predictable pick using choiceOrder
      const orderedWrong = taskState.choiceOrder.filter((origIdx) => availableWrong.includes(origIdx));
      for (let i = 0; i < countToElim; i++) {
        taskState.eliminatedIndices.push(orderedWrong[i]);
      }
      campaignState.operationalCredits -= cost;
      campaignState.helpLog.push({
        taskId: taskState.taskId,
        questionId: question.id,
        type: helpType,
        costOC: cost,
        timestamp: new Date().toISOString(),
      });
      this.eventBus?.emit('MATH_OPTION_ELIMINATED', {
        taskId: taskState.taskId,
        remainingCount: 4 - taskState.eliminatedIndices.length,
        costOC: cost,
      });
      return { ok: true, cost, remainingCount: 4 - taskState.eliminatedIndices.length };
    }

    return { ok: false, reason: 'عملیات کمکی ناشناخته است.' };
  }

  submitAnswer(campaignState, profile, taskState, question, selectedOriginalIndex, teamModifiers, consecutiveCorrect) {
    if (!taskState || taskState.submitted) {
      return { ok: false, reason: 'پاسخ قبلاً ثبت شده است.' };
    }
    const mode = question.evaluationMode || 'mcq';
    let isCorrect = false;
    if (mode === 'mcq') {
      isCorrect = selectedOriginalIndex === question.correctIndex;
    } else if (mode === 'numeric' && question.numericPayload) {
      const num = Number(selectedOriginalIndex);
      isCorrect = Number.isFinite(num) && Math.abs(num - question.numericPayload.expectedValue) <= (question.numericPayload.tolerance ?? 0.001);
    }

    taskState.selectedIndex = selectedOriginalIndex;
    taskState.submitted = true;
    taskState.isCorrect = isCorrect;

    if (profile) {
      profile.totalAttempted += 1;
      if (isCorrect) profile.totalCorrect += 1;
      profile.learningHistory.push({
        attemptId: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        questionId: question.id,
        evaluationMode: mode,
        chapter: question.chapter,
        topic: question.topic,
        selectedIndex: selectedOriginalIndex,
        correctIndex: question.correctIndex,
        isCorrect,
        hintsUsed: [...taskState.unlockedHints],
        eliminatedCount: taskState.eliminatedIndices.length,
        timeSpentSec: taskState.elapsedSec,
        timestamp: new Date().toISOString(),
      });
      profile.updatedAt = new Date().toISOString();
    }

    let nextStreak = consecutiveCorrect;
    let rewardGrantedOC = 0;

    if (isCorrect) {
      nextStreak += 1;
      const perf = calculateTaskPerformance({
        isCorrect: true,
        campaignDifficulty: campaignState.difficulty,
        questionDifficulty: question.difficulty.mathematical,
        hintsUsed: taskState.unlockedHints,
        eliminatedCount: taskState.eliminatedIndices.length,
        consecutiveCorrect: nextStreak,
        timeSpentSec: taskState.elapsedSec,
        suggestedTimeSec: question.suggestedTimeSec,
      });
      campaignState.performanceScore = Math.min(999999, campaignState.performanceScore + perf.points);
      const res = grantUniqueReward(campaignState, `reward-${question.id}`, question.rewardOC);
      if (res.granted) {
        campaignState.operationalCredits = Math.min(9999, res.state.operationalCredits);
        campaignState.claimedRewardIds = res.state.claimedRewardIds;
        rewardGrantedOC = question.rewardOC;
      }
    } else {
      nextStreak = 0;
      const preset = DIFFICULTY_PRESETS[campaignState.difficulty] ?? DIFFICULTY_PRESETS.normal;
      const shield = teamModifiers?.stabilityShield ?? 0;
      const damage = Math.max(5, preset.stabilityPenaltyOnWrong - shield);
      campaignState.stability = Math.max(0, campaignState.stability - damage);
    }

    this.eventBus?.emit('MATH_ANSWER_SUBMITTED', {
      questionId: question.id,
      isCorrect,
      rewardOC: rewardGrantedOC,
      stability: campaignState.stability,
    });

    return {
      ok: true,
      isCorrect,
      correctIndex: question.correctIndex,
      rewardGrantedOC,
      nextStreak,
      stability: campaignState.stability,
    };
  }
}

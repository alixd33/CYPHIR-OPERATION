import { DIFFICULTY_PRESETS } from '../domain/difficulty.js';
import { INITIAL_OC, INITIAL_TC } from '../domain/economy.js';
import { EventBus } from '../domain/eventBus.js';
import { ExplorationEngine } from '../engines/explorationEngine.js';
import { InvestigationEngine } from '../engines/investigationEngine.js';
import { MathEngine } from '../engines/mathEngine.js';
import { OperationDirector } from '../engines/operationDirector.js';
import { PauseManager } from '../engines/pauseManager.js';
import { SAVE_SCHEMA_VERSION } from '../persistence/saveSchema.js';
import { evaluateFailureLevel } from '../recovery/recoveryManager.js';
import { getQuestionById, getRetryVariant } from '../questions/grade9Bank.js';
import { CHAPTER_1_CASE } from '../content/cases/chapter1SilentArchive.js';
import { CAMPAIGN_SILENT_ARCHIVE, INITIAL_TEAM } from '../story/campaignSilentArchive.js';

/**
 * Unified GameEngine Facade (TDS v2.2.1)
 * Coordinates EventBus, MathEngine, InvestigationEngine, ExplorationEngine,
 * OperationDirector, PauseManager, and IDBStore.
 */

export class GameEngine {
  constructor(storage) {
    this.storage = storage;
    this.eventBus = new EventBus();
    this.mathEngine = new MathEngine(this.eventBus);
    this.investigationEngine = new InvestigationEngine(this.eventBus);
    this.explorationEngine = new ExplorationEngine(this.eventBus);
    this.operationDirector = new OperationDirector(this.eventBus);
    this.pauseManager = new PauseManager(this.eventBus);

    this.explorationEngine.registerScenes(CHAPTER_1_CASE.scenes);

    this.profiles = [];
    this.settings = this.storage.loadSettings();
    this.activeProfile = null;
    this.state = null;
    this.consecutiveCorrect = 0;
    this.lastEvaluation = null;
  }

  async init() {
    if (typeof this.storage.init === 'function') {
      await this.storage.init();
    }
    this.profiles = this.storage.loadProfiles();
    this.settings = this.storage.loadSettings();
  }

  // ---------- PROFILES ----------
  createProfile(displayName, appearanceIndex, outfitIndex, codename = 'فرمانده') {
    const cleanName = (displayName || '').trim();
    if (!cleanName) throw new Error('نام پرونده نمی‌تواند خالی باشد.');
    const now = new Date().toISOString();
    const profile = {
      id: `prof-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      displayName: cleanName,
      appearance: {
        appearanceIndex: Math.max(0, Math.min(5, appearanceIndex)),
        outfitIndex: Math.max(0, Math.min(3, outfitIndex)),
        codename: (codename || 'فرمانده').trim(),
      },
      createdAt: now,
      updatedAt: now,
      learningHistory: [],
      totalCorrect: 0,
      totalAttempted: 0,
    };
    this.profiles.push(profile);
    this.storage.saveProfiles(this.profiles);
    this.activeProfile = profile;
    return profile;
  }

  selectProfile(profileId) {
    const found = this.profiles.find((p) => p.id === profileId);
    if (!found) return null;
    this.activeProfile = found;
    return found;
  }

  deleteProfile(profileId) {
    this.profiles = this.profiles.filter((p) => p.id !== profileId);
    this.storage.saveProfiles(this.profiles);
    const { validSlots } = this.storage.loadSaveSlots();
    for (const s of validSlots) {
      if (s.profileId === profileId) this.storage.deleteSaveSlot(s.slotId);
    }
    if (this.activeProfile?.id === profileId) {
      this.activeProfile = null;
      this.state = null;
    }
  }

  // ---------- CAMPAIGN ----------
  startNewCampaign(difficulty = 'normal') {
    if (!this.activeProfile) throw new Error('ابتدا یک پرونده انتخاب کنید.');
    const preset = DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.normal;
    this.consecutiveCorrect = 0;
    this.lastEvaluation = null;

    this.state = {
      version: SAVE_SCHEMA_VERSION,
      profileId: this.activeProfile.id,
      campaignId: CAMPAIGN_SILENT_ARCHIVE.id,
      difficulty,
      currentChapter: 1,
      currentOperation: 1,
      currentStageIndex: 0,
      currentTaskIndex: 0,
      stability: 100,
      operationalCredits: preset.startingOC ?? INITIAL_OC,
      temporalCredits: INITIAL_TC,
      performanceScore: 0,
      claimedRewardIds: [],
      appliedConsequenceIds: [],
      consequenceLog: [],
      worldFlags: {},
      currentSceneId: 'cipher_hq',
      playerPosition: { ...CHAPTER_1_CASE.scenes.cipher_hq.spawn },
      inspectedObjectIds: [],
      activityStates: {},
      evidenceStates: {},
      unlockedEvidenceIds: [],
      completedStageIds: [],
      completedOperationIds: [],
      stageRetryCounts: {},
      activeTask: null,
      activeTaskContext: null, // { evidenceId, segId, activityId } when triggered from exploration
      helpLog: [],
      team: JSON.parse(JSON.stringify(INITIAL_TEAM)),
      board: {
        placedIds: ['HYP-01', 'HYP-02'],
        positions: {
          'HYP-01': { x: 380, y: 50 },
          'HYP-02': { x: 380, y: 230 },
        },
        connections: [],
        hypotheses: JSON.parse(JSON.stringify(CHAPTER_1_CASE.initialHypotheses)),
      },
      boardVisual: { zoom: 1, pan: { x: 0, y: 0 }, selectedCardId: null },
      decisionHistory: [],
      endingId: null,
      failureLevel: 'none',
      lastUpdated: new Date().toISOString(),
    };

    this.operationDirector.initActivityStates(CHAPTER_1_CASE, this.state);
    this.explorationEngine.loadScene(this.state, 'cipher_hq');
    this.autoSave('شروع کارزار جدید');
    return this.state;
  }

  getTeamModifiers() {
    if (!this.state) return { synergyScore: 0, hintDiscountOC: 0, stabilityShield: 0 };
    const assigned = this.state.team.filter((m) => m.assignedToStage && m.available);
    const avgAnalysis = assigned.length > 0 ? assigned.reduce((a, m) => a + m.attributes.analysis, 0) / assigned.length : 50;
    const avgTech = assigned.length > 0 ? assigned.reduce((a, m) => a + m.attributes.technical, 0) / assigned.length : 50;
    const synergyScore = Math.round((avgAnalysis + avgTech) / 2);
    return {
      synergyScore,
      hintDiscountOC: assigned.length >= 2 && synergyScore >= 75 ? 2 : 0,
      stabilityShield: assigned.some((m) => m.attributes.composure >= 80) ? 3 : 0,
    };
  }

  toggleTeamAssignment(memberId) {
    if (!this.state) return;
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member || !member.available) return;
    member.assignedToStage = !member.assignedToStage;
    this.autoSave();
  }

  restTeamMember(memberId) {
    if (!this.state) return;
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) return;
    member.fatigue = Math.max(0, member.fatigue - 20);
    member.stress = Math.max(0, member.stress - 20);
    this.autoSave();
  }

  // ---------- EXPLORATION & EVIDENCE INTERACTION ----------
  discoverEvidenceById(evidenceId, sceneId = this.state?.currentSceneId || 'cipher_hq') {
    if (!this.state) return null;
    const def = CHAPTER_1_CASE.evidenceCatalog.find((e) => e.id === evidenceId);
    if (!def) return null;
    const res = this.investigationEngine.addEvidence(this.state, def, sceneId);
    this.operationDirector.refreshAvailability(CHAPTER_1_CASE, this.state);
    this.autoSave();
    return res;
  }

  startExplorationMathTask(objectItem) {
    if (!this.state) return null;
    if (objectItem.targetId) {
      this.discoverEvidenceById(objectItem.targetId, this.state.currentSceneId);
    }
    const q = getQuestionById(objectItem.mathTaskId);
    if (!q) return null;
    this.state.activeTaskContext = {
      evidenceId: objectItem.targetId,
      segId: objectItem.segId,
      activityId: objectItem.activityId,
      returnSceneId: this.state.currentSceneId,
    };
    this.state.activeTask = this.mathEngine.createTaskAttempt(
      q,
      `${objectItem.id}:${q.id}`,
      this.state.difficulty,
      this.settings,
      this.state.activeTask
    );
    this.autoSave();
    return { question: q, taskState: this.state.activeTask };
  }

  // ---------- LEGACY/CHAPTER STAGE TASKS ----------
  getCurrentStage() {
    if (!this.state) return null;
    return CAMPAIGN_SILENT_ARCHIVE.operation.stages[this.state.currentStageIndex] || null;
  }

  beginOrResumeTask() {
    if (this.state?.activeTask && this.state?.activeTaskContext) {
      const q = getQuestionById(this.state.activeTask.questionId);
      return { question: q, taskState: this.state.activeTask };
    }
    const stage = this.getCurrentStage();
    if (!stage) return null;
    const baseQId = stage.taskQuestionIds[this.state.currentTaskIndex];
    const retryCount = this.state.stageRetryCounts[stage.id] || 0;
    const question = retryCount > 0 ? getRetryVariant(baseQId) : getQuestionById(baseQId);
    const taskId = `${stage.id}-T${this.state.currentTaskIndex + 1}`;
    this.state.activeTask = this.mathEngine.createTaskAttempt(
      question,
      taskId,
      this.state.difficulty,
      this.settings,
      this.state.activeTask
    );
    this.autoSave();
    return { question, taskState: this.state.activeTask };
  }

  useHelp(helpType) {
    if (!this.state || !this.state.activeTask) return { ok: false, reason: 'ماموریت فعالی وجود ندارد.' };
    const q = getQuestionById(this.state.activeTask.questionId);
    const mod = this.getTeamModifiers();
    const res = this.mathEngine.applyHelp(this.state, this.state.activeTask, q, helpType, mod);
    if (res.ok) this.autoSave();
    return res;
  }

  submitTaskAnswer(selectedOriginalIndex) {
    if (!this.state || !this.state.activeTask) return null;
    const q = getQuestionById(this.state.activeTask.questionId);
    const mod = this.getTeamModifiers();
    const res = this.mathEngine.submitAnswer(
      this.state,
      this.activeProfile,
      this.state.activeTask,
      q,
      selectedOriginalIndex,
      mod,
      this.consecutiveCorrect
    );
    if (!res.ok) return null;

    this.consecutiveCorrect = res.nextStreak;
    this.state.failureLevel = evaluateFailureLevel(this.state.stability);
    if (this.activeProfile) this.storage.saveProfiles(this.profiles);

    // If solved from exploration object, unlock evidence segment & activity consequence
    if (res.isCorrect && this.state.activeTaskContext) {
      const ctx = this.state.activeTaskContext;
      if (ctx.evidenceId && ctx.segId) {
        this.investigationEngine.unlockSegment(this.state, ctx.evidenceId, ctx.segId);
      }
      if (ctx.activityId) {
        this.operationDirector.completeNode(CHAPTER_1_CASE, this.state, ctx.activityId);
      }
    }

    for (const m of this.state.team) {
      if (m.assignedToStage) {
        m.fatigue = Math.min(100, m.fatigue + 5);
        m.stress = Math.min(100, m.stress + (res.isCorrect ? 2 : 8));
      }
    }

    this.autoSave();
    return {
      isCorrect: res.isCorrect,
      correctIndex: res.correctIndex,
      stability: this.state.stability,
      failureLevel: this.state.failureLevel,
    };
  }

  advanceAfterSolution() {
    if (!this.state) return { outcome: 'none' };
    if (this.state.stability <= 0) {
      this.state.failureLevel = 'critical';
      this.autoSave();
      return { outcome: 'critical_failure' };
    }
    if (this.state.activeTaskContext) {
      const retScene = this.state.activeTaskContext.returnSceneId || 'server_room_7';
      this.state.activeTask = null;
      this.state.activeTaskContext = null;
      this.autoSave();
      return { outcome: 'return_to_scene', sceneId: retScene };
    }
    const stage = this.getCurrentStage();
    this.state.activeTask = null;
    if (this.state.currentTaskIndex + 1 < stage.taskQuestionIds.length) {
      this.state.currentTaskIndex += 1;
      this.autoSave();
      return { outcome: 'next_task' };
    }
    if (!this.state.completedStageIds.includes(stage.id)) {
      this.state.completedStageIds.push(stage.id);
    }
    this.saveCheckpoint(`نقطه بازبینی: پایان ${stage.title}`);
    if (this.state.currentStageIndex + 1 < CAMPAIGN_SILENT_ARCHIVE.operation.stages.length) {
      this.state.currentStageIndex += 1;
      this.state.currentTaskIndex = 0;
      this.autoSave();
      return { outcome: 'stage_complete' };
    }
    return { outcome: 'operation_complete' };
  }

  retryCurrentStage() {
    if (!this.state) return;
    const stage = this.getCurrentStage();
    if (stage) {
      this.state.stageRetryCounts[stage.id] = (this.state.stageRetryCounts[stage.id] || 0) + 1;
    }
    this.state.currentTaskIndex = 0;
    this.state.activeTask = null;
    this.state.activeTaskContext = null;
    this.state.stability = 100;
    this.state.failureLevel = 'none';
    this.consecutiveCorrect = 0;
    this.autoSave('تلاش مجدد');
  }

  // ---------- INVESTIGATION & FINAL DECISION ----------
  moveBoardItem(itemId, x, y) {
    if (!this.state) return;
    this.state.board.positions[itemId] = { x: Math.round(x), y: Math.round(y) };
    this.autoSave();
  }

  addBoardConnection(fromId, toId, relation = 'supports') {
    if (!this.state) return { ok: false };
    const res = this.investigationEngine.linkItems(this.state, fromId, toId, relation);
    if (res.ok) this.autoSave();
    return res;
  }

  removeBoardConnection(connId) {
    if (!this.state) return;
    this.investigationEngine.unlink(this.state, connId);
    this.autoSave();
  }

  createHypothesis(title, summary) {
    if (!this.state) return { ok: false };
    const res = this.investigationEngine.createHypothesis(this.state, title, summary);
    if (res.ok) this.autoSave();
    return res;
  }

  editHypothesis(hypId, title, summary) {
    if (!this.state) return { ok: false };
    const res = this.investigationEngine.editHypothesis(this.state, hypId, title, summary);
    if (res.ok) this.autoSave();
    return res;
  }

  deleteHypothesis(hypId) {
    if (!this.state) return { ok: false };
    const res = this.investigationEngine.deleteHypothesis(this.state, hypId);
    if (res.ok) this.autoSave();
    return res;
  }

  submitFinalInvestigationDecision(selectedHypothesisId) {
    if (!this.state) return null;
    const evalRes = this.investigationEngine.evaluate(
      this.state,
      CHAPTER_1_CASE.deductionRules,
      selectedHypothesisId
    );
    this.lastEvaluation = evalRes;
    this.state.decisionHistory.push({
      nodeId: 'ACT-1-DECISION',
      choiceId: selectedHypothesisId,
      quality: evalRes.quality,
      matchedPathId: evalRes.matchedPathId,
      timestamp: new Date().toISOString(),
    });

    this.operationDirector.completeNode(CHAPTER_1_CASE, this.state, 'ACT-1-DECISION');
    this.operationDirector.markRemainingSkipped(CHAPTER_1_CASE, this.state);

    if (evalRes.quality === 'optimal') {
      this.operationDirector.applyConsequence(CHAPTER_1_CASE, this.state, 'CON-ENDING-OPTIMAL');
    } else if (evalRes.quality === 'valid_alternative') {
      this.operationDirector.applyConsequence(CHAPTER_1_CASE, this.state, 'CON-ENDING-ALTERNATIVE');
    } else {
      this.operationDirector.applyConsequence(CHAPTER_1_CASE, this.state, 'CON-ENDING-FLAWED');
    }

    if (!this.state.completedStageIds.includes('stage-1')) {
      this.state.completedStageIds.push('stage-1');
    }
    this.saveCheckpoint('پایان گزارش چپتر 1');
    this.autoSave('ثبت گزارش نهایی');
    return evalRes;
  }

  // ---------- SAVE & CHECKPOINTS ----------
  autoSave(label = 'ذخیره خودکار') {
    if (!this.state || !this.activeProfile) return null;
    return this.storage.writeSaveSlot({
      slotId: `autosave-${this.activeProfile.id}`,
      name: label,
      kind: 'auto',
      isAutoSave: true,
      isCheckpoint: false,
      profileId: this.activeProfile.id,
      profileName: this.activeProfile.displayName,
      campaignTitle: CAMPAIGN_SILENT_ARCHIVE.title,
      stageLabel: this.state.currentSceneId === 'server_room_7' ? 'اتاق سرور 7' : 'مقر CIPHER',
      state: this.state,
    });
  }

  saveCheckpoint(name) {
    if (!this.state || !this.activeProfile) return null;
    return this.storage.writeSaveSlot({
      slotId: `chk-${this.activeProfile.id}-ch${this.state.currentChapter}`,
      name,
      kind: 'checkpoint',
      isAutoSave: false,
      isCheckpoint: true,
      profileId: this.activeProfile.id,
      profileName: this.activeProfile.displayName,
      campaignTitle: CAMPAIGN_SILENT_ARCHIVE.title,
      stageLabel: 'چپتر 1',
      state: this.state,
    });
  }

  saveManualSlot(name, overwriteSlotId = null) {
    if (!this.state || !this.activeProfile) return null;
    return this.storage.writeSaveSlot({
      slotId: overwriteSlotId || `manual-${Date.now()}`,
      name: name.trim() || 'ذخیره دستی',
      kind: 'manual',
      isAutoSave: false,
      isCheckpoint: false,
      profileId: this.activeProfile.id,
      profileName: this.activeProfile.displayName,
      campaignTitle: CAMPAIGN_SILENT_ARCHIVE.title,
      stageLabel: this.state.currentSceneId === 'server_room_7' ? 'اتاق سرور 7' : 'مقر CIPHER',
      state: this.state,
    });
  }

  loadFromSlot(slot) {
    const stateObj = slot?.state || slot?.campaignState;
    if (!slot || !stateObj) return false;
    this.selectProfile(slot.profileId);
    this.state = JSON.parse(JSON.stringify(stateObj));
    this.explorationEngine.loadScene(this.state, this.state.currentSceneId || 'cipher_hq', this.state.playerPosition);
    return true;
  }
}

import { SAVE_SCHEMA_VERSION, computeChecksum } from './saveSchema.js';

/**
 * Safe Schema Migration: v2.0.0 -> v2.2.0
 * Preserves all profiles, learning history, resources, evidence, and board arrangements.
 */

export function migrateSaveSlotToV22(slot) {
  if (!slot || typeof slot !== 'object') return null;
  const rawState = slot.campaignState || slot.state;
  if (!rawState || typeof rawState !== 'object') return null;

  const migratedState = {
    ...rawState,
    version: SAVE_SCHEMA_VERSION,
    temporalCredits: typeof rawState.temporalCredits === 'number' ? rawState.temporalCredits : 2,
    claimedRewardIds: Array.isArray(rawState.claimedRewardIds) ? rawState.claimedRewardIds : [],
    appliedConsequenceIds: Array.isArray(rawState.appliedConsequenceIds) ? rawState.appliedConsequenceIds : [],
    worldFlags: rawState.worldFlags && typeof rawState.worldFlags === 'object' ? rawState.worldFlags : {},
    currentSceneId: rawState.currentSceneId || 'cipher_hq',
    playerPosition: rawState.playerPosition || { x: 11 * 32, y: 6.5 * 32, dir: 0 },
    inspectedObjectIds: Array.isArray(rawState.inspectedObjectIds) ? rawState.inspectedObjectIds : [],
    activityStates: rawState.activityStates && typeof rawState.activityStates === 'object' ? rawState.activityStates : {},
    evidenceStates: rawState.evidenceStates && typeof rawState.evidenceStates === 'object' ? rawState.evidenceStates : {},
    decisionHistory: Array.isArray(rawState.decisionHistory) ? rawState.decisionHistory : [],
    consequenceLog: Array.isArray(rawState.consequenceLog) ? rawState.consequenceLog : [],
    stageRetryCounts: rawState.stageRetryCounts || {},
    helpLog: Array.isArray(rawState.helpLog) ? rawState.helpLog : [],
    boardVisual: rawState.boardVisual || { zoom: 1, pan: { x: 0, y: 0 }, selectedCardId: null },
  };

  if (migratedState.activeTask && !Array.isArray(migratedState.activeTask.choiceOrder)) {
    migratedState.activeTask.choiceOrder = [0, 1, 2, 3];
  }

  return {
    slotId: slot.slotId,
    name: slot.name || 'ذخیره بازیابی‌شده',
    kind: slot.kind || (slot.isAutoSave ? 'auto' : slot.isCheckpoint ? 'checkpoint' : 'manual'),
    isAutoSave: Boolean(slot.isAutoSave || slot.kind === 'auto'),
    isCheckpoint: Boolean(slot.isCheckpoint || slot.kind === 'checkpoint'),
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: slot.savedAt || new Date().toISOString(),
    profileId: slot.profileId || migratedState.profileId,
    profileName: slot.profileName || 'فرمانده',
    campaignTitle: slot.campaignTitle || 'پرونده بایگانی خاموش',
    stageLabel: slot.stageLabel || 'چپتر 1',
    checksum: computeChecksum(migratedState),
    state: migratedState,
  };
}

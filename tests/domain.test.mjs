import test from 'node:test';
import assert from 'node:assert/strict';

import { ALLOWED_CHAPTERS, QUESTION_BANK, getRetryVariant } from '../src/questions/grade9Bank.js';
import { renderRichText } from '../src/domain/mathRenderer.js';
import { toEnglishDigits } from '../src/domain/terminology.js';
import { calculateTaskPerformance } from '../src/domain/scoring.js';
import { TaskTimer } from '../src/domain/timer.js';
import { LocalStorageAdapter } from '../src/persistence/storage.js';
import { validateSaveSlot } from '../src/persistence/saveSchema.js';
import { recoverBestSaveForProfile, validateRawSaveOrRecover } from '../src/recovery/recoveryManager.js';
import { GameEngine } from '../src/systems/gameEngine.js';

test('Grade 9 Question Bank: 30 verified questions strictly within allowed chapters (1,2,4,5,7)', () => {
  assert.equal(QUESTION_BANK.length, 30);
  const ids = new Set();
  for (const q of QUESTION_BANK) {
    assert.ok(!ids.has(q.id), `Duplicate ID: ${q.id}`);
    ids.add(q.id);
    assert.ok(ALLOWED_CHAPTERS.includes(q.chapter), `Disallowed chapter ${q.chapter} in ${q.id}`);
    assert.equal(q.choices.length, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3);
    assert.equal(q.validationStatus, 'verified');
    assert.ok(q.solutionSteps.length >= 2);
    assert.ok(q.commonMistake.length > 5);
  }
});

test('Math Renderer & English Numerals: isolates math in LTR and converts Persian digits', () => {
  assert.equal(toEnglishDigits('مرحله ۱۲ و امتیاز ۳۴۵'), 'مرحله 12 و امتیاز 345');
  const html = renderRichText('مقدار $\\frac{x^2 - 4}{\\sqrt{9}}$ برابر $2$ است.');
  assert.ok(html.includes('dir="ltr"'));
  assert.ok(html.includes('m-frac'));
  assert.ok(html.includes('m-root'));
});

test('Scoring Model: never rewards speed over mathematical accuracy', () => {
  const wrongFast = calculateTaskPerformance({ isCorrect: false, timeSpentSec: 5, suggestedTimeSec: 120 });
  const rightSlow = calculateTaskPerformance({ isCorrect: true, timeSpentSec: 200, suggestedTimeSec: 120 });
  assert.equal(wrongFast.points, 0);
  assert.ok(rightSlow.points > 0);
});

test('GameEngine: profile, campaign, help (no stability loss), submission, solution, and retry variants', () => {
  const storage = new LocalStorageAdapter();
  const engine = new GameEngine(storage);

  const prof = engine.createProfile('آرشام', 1, 2, 'فرمانده');
  assert.equal(prof.displayName, 'آرشام');

  engine.startNewCampaign('normal');
  assert.equal(engine.state.operationalCredits, 100);
  assert.equal(engine.state.stability, 100);

  const { question } = engine.beginOrResumeTask();
  assert.equal(question.id, 'Q-C1-T1');

  // Use Hint 1: OC decreases, Stability stays 100
  const helpRes = engine.useHelp('hint_1');
  assert.equal(helpRes.ok, true);
  assert.equal(engine.state.stability, 100);
  assert.ok(engine.state.operationalCredits < 100);

  // Submit correct answer
  const sub = engine.submitTaskAnswer(question.correctIndex);
  assert.equal(sub.isCorrect, true);
  assert.ok(engine.activeProfile.totalCorrect === 1);

  // Retry stage uses variant question and resets stability to 100
  engine.state.stability = 40;
  engine.retryCurrentStage();
  assert.equal(engine.state.stability, 100);
  const retryTask = engine.beginOrResumeTask();
  assert.equal(retryTask.question.id, getRetryVariant('Q-C1-T1').id);
  assert.notEqual(retryTask.question.id, 'Q-C1-T1');
});

test('Evidence Board: drag positions, connections, and hypotheses persist across reloads', () => {
  const storage = new LocalStorageAdapter();
  const engine = new GameEngine(storage);
  engine.createProfile('سارا', 0, 0);
  engine.startNewCampaign('normal');

  engine.moveBoardItem('EV-01', 210, 145);
  const hypRes = engine.createHypothesis('فرضیه آزمایشی', 'تست اتصال');
  const conn = engine.addBoardConnection('EV-01', hypRes.hypothesis.id, 'supports');
  assert.ok(conn);

  const { validSlots } = storage.loadSaveSlots();
  assert.ok(validSlots.length >= 1);
  const engine2 = new GameEngine(storage);
  engine2.loadFromSlot(validSlots[0]);
  assert.deepEqual(engine2.state.board.positions['EV-01'], { x: 210, y: 145 });
  assert.equal(engine2.state.board.connections.length, 1);
});

test('Timer: pauses on visibility hidden and resumes from remaining time', () => {
  const timer = new TaskTimer(100, null, null);
  timer.start();
  assert.equal(timer.running, true);
  timer.handleVisibilityChange(true);
  assert.equal(timer.running, false);
  assert.equal(timer.remainingSec, 100);
  timer.handleVisibilityChange(false);
  assert.equal(timer.running, true);
  timer.stop();
});

test('Save Validation & Corrupt Save Recovery + Backup Export/Import', () => {
  const storage = new LocalStorageAdapter();
  const engine = new GameEngine(storage);
  const prof = engine.createProfile('کیان', 2, 1);
  engine.startNewCampaign('hard');
  const validCheckpoint = engine.saveCheckpoint('نقطه بازبینی سالم');

  // Tamper with a copy to simulate corruption
  const tampered = JSON.parse(JSON.stringify(validCheckpoint));
  tampered.state.operationalCredits = 999999;
  assert.equal(validateSaveSlot(tampered).valid, false);

  const recovered = validateRawSaveOrRecover(tampered, validCheckpoint);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.recoveredFromFallback, true);
  assert.equal(recovered.slot.state.operationalCredits, validCheckpoint.state.operationalCredits);

  // Backup export & import
  const backupJson = storage.exportBackupJSON();
  const storage2 = new LocalStorageAdapter();
  const imp = storage2.importBackupJSON(backupJson);
  assert.equal(imp.ok, true);
  assert.equal(imp.profilesImported, 1);
  const rec2 = recoverBestSaveForProfile(storage2, prof.id);
  assert.equal(rec2.recovered, true);
});

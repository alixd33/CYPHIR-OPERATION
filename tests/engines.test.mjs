import test from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/domain/eventBus.js';
import { QUESTION_BANK } from '../src/questions/grade9Bank.js';
import { MathEngine } from '../src/engines/mathEngine.js';
import { ExplorationEngine } from '../src/engines/explorationEngine.js';
import { OperationDirector } from '../src/engines/operationDirector.js';
import { PauseManager } from '../src/engines/pauseManager.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { IDBStore } from '../src/persistence/idbStore.js';
import { migrateSaveSlotToV22 } from '../src/persistence/migration.js';
import { SAVE_SCHEMA_VERSION, validateSaveSlot } from '../src/persistence/saveSchema.js';
import { GameEngine } from '../src/systems/gameEngine.js';

test('grade9Bank: balanced correctIndex distribution (20% to 30% per option)', () => {
  const counts = [0, 0, 0, 0];
  for (const q of QUESTION_BANK) counts[q.correctIndex] += 1;
  for (let i = 0; i < 4; i++) {
    const pct = (counts[i] / QUESTION_BANK.length) * 100;
    assert.ok(pct >= 20 && pct <= 30, `Option ${i} has ${pct.toFixed(1)}% (expected 20%-30%)`);
  }
});

test('MathEngine: choiceOrder permutation, elim_1 (3 left), elim_2 (2 left), and persistence', () => {
  const bus = new EventBus();
  const me = new MathEngine(bus);
  const q = QUESTION_BANK[0];
  const attempt = me.createTaskAttempt(q, 'T1', 'normal', { extraTime: false });
  assert.deepEqual([...attempt.choiceOrder].sort(), [0, 1, 2, 3]);

  const state = { operationalCredits: 100, stability: 100, performanceScore: 0, helpLog: [] };
  const e1 = me.applyHelp(state, attempt, q, 'elim_1', { hintDiscountOC: 0 });
  assert.equal(e1.ok, true);
  assert.equal(e1.remainingCount, 3);
  assert.ok(!attempt.eliminatedIndices.includes(q.correctIndex));

  const e2 = me.applyHelp(state, attempt, q, 'elim_1', { hintDiscountOC: 0 });
  assert.equal(e2.ok, true);
  assert.equal(e2.remainingCount, 2);

  const e3 = me.applyHelp(state, attempt, q, 'elim_1', { hintDiscountOC: 0 });
  assert.equal(e3.ok, false);
});

test('InvestigationEngine: Path A (optimal), Path B (alternative without EV-06), Flawed, and User Hypothesis edit/soft-delete', async () => {
  const storage = new IDBStore();
  await storage.init();
  const engine = new GameEngine(storage);
  await engine.init();
  engine.createProfile('تست مسیر', 0, 0);

  // Path A: Optimal (EV-01 + EV-06 supporting HYP-02, EV-06 contradicting HYP-01)
  engine.startNewCampaign('normal');
  engine.discoverEvidenceById('EV-01');
  engine.investigationEngine.unlockSegment(engine.state, 'EV-01', 'SEG-EV01-IDS');
  engine.discoverEvidenceById('EV-06');
  engine.addBoardConnection('EV-01', 'HYP-02', 'supports');
  engine.addBoardConnection('EV-06', 'HYP-02', 'supports');
  engine.addBoardConnection('EV-06', 'HYP-01', 'contradicts');
  const resA = engine.submitFinalInvestigationDecision('HYP-02');
  assert.equal(resA.quality, 'optimal');
  assert.equal(resA.matchedPathId, 'path-surveillance-alibi');

  // Path B: Valid Alternative (EV-01 + EV-04 + EV-05, NO EV-06!)
  engine.startNewCampaign('normal');
  engine.discoverEvidenceById('EV-01');
  engine.investigationEngine.unlockSegment(engine.state, 'EV-01', 'SEG-EV01-IDS');
  engine.discoverEvidenceById('EV-04');
  engine.investigationEngine.unlockSegment(engine.state, 'EV-04', 'SEG-EV04-TEMP');
  engine.discoverEvidenceById('EV-05');
  engine.investigationEngine.unlockSegment(engine.state, 'EV-05', 'SEG-EV05-KEYS');
  engine.addBoardConnection('EV-01', 'HYP-02', 'supports');
  engine.addBoardConnection('EV-04', 'HYP-02', 'supports');
  engine.addBoardConnection('EV-05', 'HYP-02', 'supports');
  engine.addBoardConnection('EV-05', 'HYP-01', 'contradicts');
  const resB = engine.submitFinalInvestigationDecision('HYP-02');
  assert.equal(resB.quality, 'valid_alternative');
  assert.equal(resB.matchedPathId, 'path-thermal-telemetry');

  // Flawed / Early Report (Red Herring HYP-01)
  engine.startNewCampaign('normal');
  const startStab = engine.state.stability;
  const resFlawed = engine.submitFinalInvestigationDecision('HYP-01');
  assert.equal(resFlawed.quality, 'flawed');
  assert.equal(engine.state.stability, startStab - 20);
  assert.equal(engine.state.activityStates['ACT-1-OBJ-THERMAL'].status, 'skipped');

  // User Hypothesis CRUD + soft delete + link deduplication
  const created = engine.createHypothesis('فرضیه کاربر', 'خلاصه اولیه');
  assert.equal(created.ok, true);
  const edited = engine.editHypothesis(created.hypothesis.id, 'فرضیه ویرایش‌شده', 'خلاصه جدید');
  assert.equal(edited.ok, true);
  assert.ok(edited.hypothesis.editHistory.length >= 1);

  const l1 = engine.addBoardConnection('EV-01', created.hypothesis.id, 'supports');
  assert.equal(l1.ok, true);
  const l2 = engine.addBoardConnection('EV-01', created.hypothesis.id, 'supports');
  assert.equal(l2.ok, false);

  const del = engine.deleteHypothesis(created.hypothesis.id);
  assert.equal(del.ok, true);
  assert.equal(created.hypothesis.deleted, true);
  assert.ok(created.hypothesis.editHistory.length >= 2);
});

test('OperationDirector: DAG validation, cycle rejection, and idempotent consequences', () => {
  const dir = new OperationDirector(new EventBus());
  const valid = dir.validateActivityGraph(CHAPTER_1_CASE.activityGraph);
  assert.equal(valid.valid, true);

  const cyclic = dir.validateActivityGraph({
    nodes: {
      A: { id: 'A', unlockConditions: { requiredCompletedNodes: ['B'] } },
      B: { id: 'B', unlockConditions: { requiredCompletedNodes: ['A'] } },
    },
  });
  assert.equal(cyclic.valid, false);

  const st = { operationalCredits: 100, performanceScore: 0, stability: 100, appliedConsequenceIds: [], consequenceLog: [], worldFlags: {} };
  dir.applyConsequence(CHAPTER_1_CASE, st, 'CON-ENDING-OPTIMAL');
  dir.applyConsequence(CHAPTER_1_CASE, st, 'CON-ENDING-OPTIMAL');
  assert.equal(st.operationalCredits, 130);
  assert.equal(st.performanceScore, 150);
});

test('ExplorationEngine: scene loading, collision bounds, and interaction debounce', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [] };
  exp.loadScene(st, 'server_room_7');
  assert.equal(st.currentSceneId, 'server_room_7');
  assert.equal(exp.canWalkAt(0, 0), false); // Wall tile
  assert.equal(exp.canWalkAt(11 * 32, 12 * 32), true); // Floor tile
});

test('PauseManager: pause/resume state, no nested pause, and safeSaveAndTransition error handling', async () => {
  const pm = new PauseManager(new EventBus());
  assert.equal(pm.pause('hq'), true);
  assert.equal(pm.state.isPaused, true);
  assert.equal(pm.pause('hq'), false);

  const failRes = await pm.safeSaveAndTransition(async () => {
    throw new Error('QuotaExceededError');
  }, () => {});
  assert.equal(failRes.ok, false);
  assert.ok(pm.state.saveError.includes('QuotaExceededError'));
  assert.equal(pm.state.isPaused, true);

  pm.resume();
  assert.equal(pm.state.isPaused, false);
});

test('Migration & SaveSchema: v2.0.0 -> v2.2.0 migration and checksum verification', () => {
  const legacy = {
    slotId: 'legacy-1',
    schemaVersion: '2.0.0',
    profileId: 'p1',
    profileName: 'کیان',
    savedAt: new Date().toISOString(),
    state: {
      version: '2.0.0',
      profileId: 'p1',
      campaignId: 'silent_archive',
      difficulty: 'normal',
      operationalCredits: 100,
      stability: 100,
      team: [{ id: 'nava', name: 'ناوا' }],
      unlockedEvidenceIds: ['EV-01'],
      board: { placedIds: ['EV-01'], positions: {}, connections: [], hypotheses: [] },
    },
  };
  const migrated = migrateSaveSlotToV22(legacy);
  assert.equal(migrated.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.ok(migrated.checksum);
  assert.equal(validateSaveSlot(migrated).valid, true);
});

import { buildNavigationGrid, findPathAStar } from '../src/engines/pathfinding.js';

test('Pathfinding A*: routes around walls/props, blocks closed doors, and prevents diagonal corner-cutting', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {} };
  exp.loadScene(st, 'cipher_hq');

  // Path from corridor (11,6) to Evidence Room (11,3) through open door (11,5)
  const pathOpen = findPathAStar(exp.navGrid, { x: 34, y: 24 }, { x: 24, y: 34 });
  assert.ok(Array.isArray(pathOpen) && pathOpen.length >= 3, 'Should find valid path through open door');
  for (const cell of pathOpen) {
    assert.equal(exp.navGrid.walkable[cell.y][cell.x], true, `Path stepped on blocked cell ${cell.x},${cell.y}`);
  }

  // Close door-hq-ev -> path must be null (or cannot enter Evidence Room)
  exp.doorStates['door-hq-mon1'] = 'closed';
  exp.doorStates['door-hq-mon2'] = 'closed';
  exp.rebuildNavGrid();
  const pathRerouted = findPathAStar(exp.navGrid, { x: 46, y: 8 }, { x: 52, y: 8 }, 2);
  assert.ok(Array.isArray(pathRerouted) && !pathRerouted.some((c) => c.x === 48 && (c.y === 8 || c.y === 9)), 'Closed door must never be crossed by A*');
  const blockedGrid = { width: 3, height: 3, walkable: [[true, false, true], [false, false, false], [true, true, true]] };
  assert.equal(findPathAStar(blockedGrid, { x: 0, y: 0 }, { x: 2, y: 0 }, 0), null);
});

test('ExplorationEngine v2.2.2: Click-to-Move, Manual Override, and Fixed E Interaction Contract', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {} };
  exp.loadScene(st, 'cipher_hq');

  const clickRes = exp.setClickDestination(24 * 16 + 8, 34 * 16 + 8);
  assert.equal(clickRes.ok, true);
  assert.ok(exp.activePath.length > 0);

  // Manual override via KeyW immediately cancels activePath
  exp.updateMovement(0.016, new Set(['KeyW']), st);
  assert.equal(exp.activePath.length, 0);

  // Move near Evidence Board (11, 2) and test interact() contract
  exp.player.x = 12 * 32;
  exp.player.y = 17 * 32;
  const inter = exp.interact(st, Date.now() + 500);
  assert.equal(inter.ok, true);
  assert.equal(inter.kind, 'object');
  assert.equal(inter.object.id, 'obj-hq-board');
});

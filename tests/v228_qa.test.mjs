import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { TILE_SIZE, PLAYER_FOOTBOX } from '../src/domain/worldConfig.js';
import { PROP_CATALOG, TOTAL_UNIQUE_PROPS } from '../src/content/propCatalog.js';
import { validateSceneWalls } from '../src/ui/wallSystem.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { ExplorationEngine } from '../src/engines/explorationEngine.js';
import { findPathAStar } from '../src/engines/pathfinding.js';
import { EventBus } from '../src/domain/eventBus.js';
import { GAME_VERSION, GAME_FULL_TITLE } from '../src/domain/version.js';

test('v2.2.8 centralized 16x16 TILE_SIZE & version sync', () => {
  assert.equal(TILE_SIZE, 16);
  assert.equal(GAME_VERSION, '2.2.8');
  assert.equal(GAME_FULL_TITLE, 'OPERATION: CIPHER v2.2.8');
  assert.equal(CHAPTER_1_CASE.scenes.cipher_hq.width, 72);
  assert.equal(CHAPTER_1_CASE.scenes.cipher_hq.height, 48);
  assert.equal(CHAPTER_1_CASE.scenes.cipher_hq.tileSize, 16);
  assert.equal(CHAPTER_1_CASE.scenes.server_room_7.width, 48);
  assert.equal(CHAPTER_1_CASE.scenes.server_room_7.height, 30);
  assert.equal(CHAPTER_1_CASE.scenes.server_room_7.tileSize, 16);
});

test('128-prop asset library (8x16) & separated footprint catalog', () => {
  const meta = JSON.parse(fs.readFileSync('public/assets/art/props/metadata.json', 'utf8'));
  assert.equal(meta.columns, 8);
  assert.equal(meta.rows, 16);
  assert.equal(meta.totalProps, 128);
  assert.equal(TOTAL_UNIQUE_PROPS, 128);
  assert.ok(Object.keys(PROP_CATALOG).length >= 30);
  assert.ok(PROP_CATALOG.exec_desk.footprint.w < PROP_CATALOG.exec_desk.w);
});

test('16x16 Wall validation passes with zero gaps on 72x48 HQ and 48x30 Server Room 7', () => {
  const hq = validateSceneWalls(CHAPTER_1_CASE.scenes.cipher_hq);
  assert.equal(hq.valid, true, `HQ wall issues: ${hq.issues.join('; ')}`);
  const sr = validateSceneWalls(CHAPTER_1_CASE.scenes.server_room_7);
  assert.equal(sr.valid, true, `SR7 wall issues: ${sr.issues.join('; ')}`);
});

test('16x16 Collision & A* Pathfinding QA: blocks solid furniture/walls, passes doorways & aisles', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {}, worldFlags: {} };
  exp.loadScene(st, 'cipher_hq');

  // Cannot walk into solid Atrium Reception Desk at (35, 19)
  assert.equal(exp.canWalkAt(35 * 16 - 8, 19 * 16 - 18), false);
  // Cannot walk into outer North wall (y=0)
  assert.equal(exp.canWalkAt(34 * 16 - 8, 0 * 16 - 18), false);

  // Can pathfind from Atrium (34, 24) through Executive Door (40, 14) to Director Report anchor (40, 8)
  const pathToExec = findPathAStar(exp.navGrid, { x: 34, y: 24 }, { x: 40, y: 8 }, 0);
  assert.ok(Array.isArray(pathToExec) && pathToExec.length >= 10, 'Expected valid 16x16 path into Executive Office');

  // Can pathfind to Operations Console anchor (10, 10)
  const pathToOps = findPathAStar(exp.navGrid, { x: 34, y: 24 }, { x: 10, y: 10 }, 0);
  assert.ok(Array.isArray(pathToOps) && pathToOps.length >= 10, 'Expected valid 16x16 path into Operations Room');

  // All interactables in both scenes have reachable approachAnchors
  for (const obj of CHAPTER_1_CASE.scenes.cipher_hq.interactables) {
    const p = findPathAStar(exp.navGrid, { x: 34, y: 24 }, obj.approachAnchor, 0);
    assert.ok(Array.isArray(p), `HQ interactable ${obj.id} approachAnchor unreachable`);
  }

  exp.loadScene(st, 'server_room_7');
  for (const obj of CHAPTER_1_CASE.scenes.server_room_7.interactables) {
    const p = findPathAStar(exp.navGrid, { x: 23, y: 24 }, obj.approachAnchor, 0);
    assert.ok(Array.isArray(p), `SR7 interactable ${obj.id} approachAnchor unreachable`);
  }
});

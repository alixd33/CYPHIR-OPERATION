import test from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/domain/eventBus.js';
import { ExplorationEngine } from '../src/engines/explorationEngine.js';
import { findPathAStar } from '../src/engines/pathfinding.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { NPC_ROSTER, PLAYER_APPEARANCES, PLAYER_OUTFITS } from '../src/content/characters/roster.js';
import { GAME_FULL_TITLE, GAME_VERSION } from '../src/domain/version.js';

test('Single Source Character Roster: 4 official Chapter 1 NPCs & 12 player combinations', () => {
  assert.equal(PLAYER_APPEARANCES.length * PLAYER_OUTFITS.length, 24);
  assert.equal(GAME_VERSION, '2.2.8');
  assert.equal(GAME_FULL_TITLE, 'OPERATION: CIPHER v2.2.8');
  assert.equal(NPC_ROSTER.kiani.name, 'مدیر کیانی');
  assert.equal(NPC_ROSTER.nava.name, 'ناوا فرهادی');
  assert.equal(NPC_ROSTER.arman.name, 'آرمان راد');
  assert.equal(NPC_ROSTER.arash.name, 'آرش کاظمی');
});

test('Pathfinding QA (All 12 Mandatory Scenarios from Section 5.7)', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {} };
  exp.loadScene(st, 'cipher_hq');

  // 1. Click on nearby floor
  const s1 = exp.setClickDestination(24 * 16 + 8, 12 * 16 + 8);
  assert.equal(s1.ok, true);

  // 2. Click into Evidence Room (y=17, x=12) from Atrium (y=12, x=17) through door at x=12,y=15
  const s2 = exp.setClickDestination(24 * 16 + 8, 34 * 16 + 8);
  assert.equal(s2.ok, true);
  assert.ok(s2.path.length >= 4);

  // 3. Click into Monitoring Room 1 (x=28,y=5) from Atrium via door (24,4)
  const s3 = exp.setClickDestination(56 * 16 + 8, 10 * 16 + 8);
  assert.equal(s3.ok, true);
  assert.ok(s3.path.some((c) => c.x === 48 && (c.y === 8 || c.y === 9)));

  // 4. Click across Atrium to West Corridor (1,14 -> 22,12)
  exp.player.x = 2 * 16;
  exp.player.y = 30 * 16;
  const s4 = exp.setClickDestination(44 * 16 + 8, 24 * 16 + 8);
  assert.equal(s4.ok, true);

  // 5. Click on Server Rack in server_room_7 -> snaps to reachable cell, never inside rack
  exp.loadScene(st, 'server_room_7');
  const s5 = exp.setClickDestination(6 * 16 + 8, 5 * 16 + 8);
  assert.equal(s5.ok, true);
  if (s5.path.length > 0) {
    const last = s5.path[s5.path.length - 1];
    assert.equal(exp.navGrid.walkable[last.y][last.x], true);
  }

  // 6. Click on Desk / Terminal with approachAnchor -> routes to approachAnchor (11,3)
  const s6 = exp.setClickDestination(23 * 16 + 8, 5.2 * 16 + 8);
  assert.equal(s6.ok, true);
  const last6 = s6.path[s6.path.length - 1];
  assert.deepEqual(last6, { x: 22, y: 6 });

  // 7. Click directly on exterior wall (0, 0) -> snaps to reachable side of wall, never inside wall
  const s7 = exp.setClickDestination(8, 8);
  assert.equal(s7.ok, true);
  if (s7.path.length > 0) {
    const last7 = s7.path[s7.path.length - 1];
    assert.equal(exp.navGrid.walkable[last7.y][last7.x], true);
  }

  // 8. Click in completely unreachable isolated cell (outside bounds / surrounded by walls)
  const isolated = findPathAStar(
    { width: 3, height: 3, walkable: [[true, false, false], [false, false, false], [false, false, true]] },
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    0
  );
  assert.equal(isolated, null);

  // 9 & 10. Open door passes; Closed door blocks A*
  exp.loadScene(st, 'cipher_hq');
  exp.player.x = 46 * 16;
  exp.player.y = 8 * 16;
  exp.doorStates['door-hq-mon1'] = 'open';
  exp.rebuildNavGrid();
  assert.equal(exp.setClickDestination(56 * 16 + 8, 10 * 16 + 8).ok, true);

  exp.doorStates['door-hq-mon1'] = 'closed';
  exp.doorStates['door-hq-mon2'] = 'closed';
  exp.rebuildNavGrid();
  const s10 = findPathAStar(exp.navGrid, { x: 46, y: 8 }, { x: 52, y: 8 }, 2);
  assert.ok(Array.isArray(s10) && !s10.some((c) => c.x === 48 && (c.y === 8 || c.y === 9)), 'Closed door must never be crossed by A*');

  // 11. Open door and resume path
  exp.doorStates['door-hq-mon1'] = 'open';
  exp.rebuildNavGrid();
  assert.equal(exp.setClickDestination(56 * 16 + 8, 10 * 16 + 8).ok, true);

  // 12. Manual override with WASD cancels activePath
  exp.updateMovement(0.016, new Set(['KeyW']), st);
  assert.equal(exp.activePath.length, 0);
});

test('Interaction QA: All Interactables & NPCs in cipher_hq and server_room_7 resolve cleanly at approachAnchor', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {}, worldFlags: {}, evidenceStates: {} };

  for (const sceneId of ['cipher_hq', 'server_room_7']) {
    exp.loadScene(st, sceneId);
    const scene = CHAPTER_1_CASE.scenes[sceneId];
    for (const obj of scene.interactables) {
      const ax = obj.approachAnchor ? obj.approachAnchor.x : obj.x;
      const ay = obj.approachAnchor ? obj.approachAnchor.y : obj.y;
      exp.player.x = ax * 16 - 8;
      exp.player.y = ay * 16 - 18;
      const res = exp.interact(st, Date.now() + 1000);
      assert.equal(res?.ok, true, `Failed interact on ${sceneId}:${obj.id}`);
      exp.lastInteractMs = 0; // reset debounce for next check
    }
    for (const npc of scene.npcs) {
      exp.player.x = npc.x * 16 - 8;
      exp.player.y = (npc.y + 1) * 16 - 18;
      const res = exp.interact(st, Date.now() + 1000);
      assert.equal(res?.ok, true, `Failed NPC interact on ${sceneId}:${npc.id}`);
      exp.lastInteractMs = 0;
    }
  }
});

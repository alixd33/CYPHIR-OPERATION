import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { validateSceneWalls } from '../src/ui/wallSystem.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { GLOBAL_PALETTE, DEPARTMENT_PALETTES } from '../src/content/palette.js';
import { ExplorationEngine } from '../src/engines/explorationEngine.js';
import { EventBus } from '../src/domain/eventBus.js';
import { GAME_VERSION, GAME_FULL_TITLE } from '../src/domain/version.js';

test('v2.2.8 central version & global palette documented', () => {
  assert.equal(GAME_VERSION, '2.2.8');
  assert.equal(GAME_FULL_TITLE, 'OPERATION: CIPHER v2.2.8');
  assert.equal(GLOBAL_PALETTE.deepShadow, '#171B20');
  assert.equal(GLOBAL_PALETTE.orgTeal, '#245B59');
  assert.ok(Object.keys(DEPARTMENT_PALETTES).length >= 8);
});

test('Automated Wall & Map Validation passes with zero gaps on cipher_hq and server_room_7', () => {
  const hqCheck = validateSceneWalls(CHAPTER_1_CASE.scenes.cipher_hq);
  assert.equal(hqCheck.valid, true, `cipher_hq wall issues: ${hqCheck.issues.join('; ')}`);
  const srCheck = validateSceneWalls(CHAPTER_1_CASE.scenes.server_room_7);
  assert.equal(srCheck.valid, true, `server_room_7 wall issues: ${srCheck.issues.join('; ')}`);
});

test('72-prop metadata and 5 distinct Server Room 7 rack models', () => {
  const meta = JSON.parse(fs.readFileSync('public/assets/art/props/metadata.json', 'utf8'));
  assert.equal(meta.columns, 8);
  assert.equal(meta.rows, 16);
  assert.equal(meta.totalProps, 128);

  const sr7 = CHAPTER_1_CASE.scenes.server_room_7;
  const rackProps = sr7.props.filter((p) => p.id.startsWith('sr7-r'));
  const distinctKeys = new Set(rackProps.map((p) => `${p.prop[0]},${p.prop[1]}`));
  assert.ok(distinctKeys.size >= 5, `Expected >=5 distinct rack models, got ${distinctKeys.size}`);
});

test('Footprint collision blocks solid furniture & Operations Room interactions resolve cleanly', () => {
  const exp = new ExplorationEngine(new EventBus());
  exp.registerScenes(CHAPTER_1_CASE.scenes);
  const st = { currentSceneId: 'cipher_hq', playerPosition: null, inspectedObjectIds: [], doorStates: {}, worldFlags: {} };
  exp.loadScene(st, 'cipher_hq');

  // Cannot walk into solid Operations Central Table at (5.5, 3.6) -> cells (5,4) / (6,4)
  assert.equal(exp.canWalkAt(11 * 16 - 8, 7 * 16 - 18), false);

  // Operations Room interactables (console, display, station) resolve at their approachAnchor
  for (const id of ['obj-ops-console', 'obj-ops-display', 'obj-ops-station']) {
    const obj = CHAPTER_1_CASE.scenes.cipher_hq.interactables.find((o) => o.id === id);
    assert.ok(obj, `Missing ${id}`);
    exp.player.x = obj.approachAnchor.x * 16 - 8;
    exp.player.y = obj.approachAnchor.y * 16 - 18;
    const nearest = exp.getNearestInteractable(st);
    assert.ok(nearest && nearest.kind === 'object' && nearest.item.id === id, `Expected ${id} nearest, got ${nearest?.item?.id}`);
  }
});

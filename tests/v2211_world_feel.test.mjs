import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EventBus } from '../src/domain/eventBus.js';
import { ExplorationEngine } from '../src/engines/explorationEngine.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { drawDoorPanel, WALL_PROFILE } from '../src/ui/wallSystem.js';
import { drawFloorDetails } from '../src/ui/floorDetails.js';

function makeEngine(sceneId = 'server_room_7') {
  const engine = new ExplorationEngine(new EventBus());
  engine.registerScenes(CHAPTER_1_CASE.scenes);
  const state = {
    currentSceneId: 'cipher_hq',
    playerPosition: null,
    inspectedObjectIds: [],
    doorStates: {},
    worldFlags: {},
  };
  engine.loadScene(state, sceneId);
  return { engine, state };
}

test('Server Room 7 has a clear continuous central spine and a full-width cross aisle', () => {
  const { engine } = makeEngine();
  const grid = engine.navGrid;
  // The terminal occupies a small footprint beside the centerline; the
  // continuous usable spine is the clear lane immediately west of it.
  for (let y = 2; y <= 27; y++) {
    assert.equal(grid.walkable[y][21], true, `central aisle blocked at y=${y}`);
  }
  for (let x = 18; x <= 30; x++) {
    assert.equal(grid.walkable[14][x], true, `cross aisle blocked at x=${x}`);
  }
});

test('every Server Room 7 story interaction has a reachable approach point', () => {
  const { engine } = makeEngine();
  const start = { x: 24, y: 25 };
  for (const item of engine.activeScene.interactables) {
    const anchor = item.approachAnchor;
    assert.ok(anchor, `${item.id} needs an approach anchor`);
    const path = engine.setClickDestination(anchor.x * 16 + 8, anchor.y * 16 + 8);
    assert.equal(path.ok, true, `${item.id} is not path-reachable: ${path.reason}`);
    engine.clearPath();
    engine.player.x = start.x * 16 - 16;
    engine.player.y = start.y * 16 - 26;
  }
});

test('click-to-move advances at the same bounded speed and animation is tied to real travel', () => {
  const { engine, state } = makeEngine();
  const result = engine.setClickDestination(9 * 16 + 8, 14 * 16 + 8);
  assert.equal(result.ok, true);

  let previousX = engine.player.x;
  let previousY = engine.player.y;
  let movedPixels = 0;
  for (let i = 0; i < 900 && engine.activePath.length > 0; i++) {
    engine.updateMovement(1 / 60, new Set(), state);
    const step = Math.hypot(engine.player.x - previousX, engine.player.y - previousY);
    assert.ok(step <= (64 / 60) + 0.02, `click step exceeded speed cap: ${step}`);
    movedPixels += step;
    previousX = engine.player.x;
    previousY = engine.player.y;
  }

  assert.equal(engine.activePath.length, 0, 'click route should finish instead of oscillating around a waypoint');
  engine.updateMovement(1 / 60, new Set(), state);
  assert.ok(movedPixels > 40, 'player should have moved to the destination');
  assert.ok(engine.player.isMoving === false, 'player should be stationary after route completion');
  assert.equal(engine.player.col, 0, 'walk cycle should return to idle after route completion');
  assert.ok(Math.abs(engine.player.x + 16 - (9 * 16 + 8)) <= 1);
  assert.ok(Math.abs(engine.player.y + 26 - (14 * 16 + 8)) <= 1);
});

test('manual and click movement use the same 64px/sec speed envelope', () => {
  const { engine } = makeEngine();
  const x = engine.player.x;
  const y = engine.player.y;
  engine.updateMovement(0.05, new Set(['KeyW']), null);
  const manualDistance = Math.hypot(engine.player.x - x, engine.player.y - y);
  assert.ok(manualDistance <= 3.21 && manualDistance > 2.9);

  engine.clearPath();
  const anchor = { x: 23, y: 24 };
  engine.player.x = x;
  engine.player.y = y;
  const clicked = engine.setClickDestination(anchor.x * 16 + 8, anchor.y * 16 + 8);
  assert.equal(clicked.ok, true);
  const cx = engine.player.x;
  const cy = engine.player.y;
  engine.updateMovement(0.05, new Set(), null);
  const clickDistance = Math.hypot(engine.player.x - cx, engine.player.y - cy);
  assert.ok(clickDistance <= 3.21 && clickDistance > 2.9);
});

test('wall projection is visibly deeper than one 16px floor tile', () => {
  assert.ok(WALL_PROFILE.capDepth + WALL_PROFILE.faceDepth > 16);
});

test('door panels visibly distinguish open, closed and locked states', () => {
  const draw = (state) => {
    const rects = [];
    const ctx = {
      fillStyle: '',
      save() {},
      restore() {},
      fillRect(x, y, width, height) { rects.push({ x, y, width, height, fill: this.fillStyle }); },
    };
    drawDoorPanel(ctx, { x: 22, y: 29, widthTiles: 4 }, state, 16);
    return rects;
  };
  const opened = draw('open');
  const closed = draw('closed');
  const locked = draw('locked');
  assert.ok(opened.length > 8 && closed.length > 8 && locked.length > 8);
  assert.notDeepEqual(opened, closed);
  assert.notDeepEqual(closed, locked);
});

test('Server Room 7 floor material zones add broad accents without a tile-grid overlay', () => {
  const rects = [];
  const ctx = {
    fillStyle: '',
    fillRect(x, y, width, height) { rects.push({ x, y, width, height }); },
  };
  const scene = CHAPTER_1_CASE.scenes.server_room_7;
  drawFloorDetails(ctx, scene, 16);
  assert.ok(rects.some((r) => r.width >= 6 * 16 && r.height >= 20 * 16));
  assert.ok(rects.every((r) => !(r.width === 16 && r.height === 16)), 'floor detail must not outline each tile');
});

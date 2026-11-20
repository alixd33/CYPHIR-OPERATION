import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { isWallTile, getWallMaterialKey, computeWallMask } from '../src/ui/wallSystem.js';
import { computeAutoFit } from '../src/ui/evidenceBoard.js';
import { CHAPTER_1_CASE } from '../src/content/cases/chapter1SilentArchive.js';
import { GAME_VERSION, GAME_FULL_TITLE } from '../src/domain/version.js';

test('v2.2.8 central version is synced', () => {
  assert.equal(GAME_VERSION, '2.2.8');
  assert.equal(GAME_FULL_TITLE, 'OPERATION: CIPHER v2.2.8');
});

test('wallSystem 4-bit cardinal mask & 5 material families', () => {
  assert.equal(isWallTile(4), true);
  assert.equal(isWallTile(6), true);
  assert.equal(isWallTile(8), true);
  assert.equal(isWallTile(10), true);
  assert.equal(isWallTile(11), true);
  assert.equal(isWallTile(12), true);
  assert.equal(isWallTile(14), true);
  assert.equal(isWallTile(0), false);
  assert.equal(isWallTile(5), false);

  assert.equal(getWallMaterialKey(4, 'cipher_hq'), 'office');
  assert.equal(getWallMaterialKey(11, 'cipher_hq'), 'executive');
  assert.equal(getWallMaterialKey(12, 'cipher_hq'), 'monitoring');
  assert.equal(getWallMaterialKey(14, 'cipher_hq'), 'operations');
  assert.equal(getWallMaterialKey(4, 'server_room_7'), 'server');

  const grid = [
    [4, 4, 4],
    [4, 0, 5],
    [4, 4, 4],
  ];
  assert.equal(computeWallMask(grid, 0, 0).mask, 2 | 4); // E | S corner
  assert.equal(computeWallMask(grid, 0, 1).mask, 1 | 4); // N | S vertical
  assert.equal(computeWallMask(grid, 1, 0).mask, 2 | 8); // E | W horizontal
  assert.equal(computeWallMask(grid, 2, 0).doorS, true);  // Door to south
});

test('props_sheet.png expanded to 8x8 (64 props)', () => {
  const meta = JSON.parse(fs.readFileSync('public/assets/art/props/metadata.json', 'utf8'));
  assert.equal(meta.columns, 8);
  assert.ok(meta.rows >= 16);
  assert.equal(meta.frameWidth, 64);
  assert.equal(meta.frameHeight, 64);
});

test('server_room_7 includes 4 distinct server rack models and Arash desk', () => {
  const sr7 = CHAPTER_1_CASE.scenes.server_room_7;
  const rackProps = sr7.props.filter((p) => p.id.startsWith('sr7-r'));
  const distinctKeys = new Set(rackProps.map((p) => `${p.prop[0]},${p.prop[1]}`));
  assert.ok(distinctKeys.size >= 4, `Expected >=4 distinct rack models, got ${distinctKeys.size}`);
  assert.ok(sr7.props.some((p) => p.id === 'sr7-arash-desk'));
});

test('evidenceBoard computeAutoFit fills ~90% viewport at 100% browser zoom', () => {
  const positions = {
    'EV-01': { x: 60, y: 60 },
    'EV-02': { x: 280, y: 60 },
    'HYP-1': { x: 170, y: 220 },
  };
  const fit = computeAutoFit(positions, ['EV-01', 'EV-02', 'HYP-1'], 960, 560);
  assert.ok(fit.zoom > 1.0 && fit.zoom <= 1.65, `Expected auto-fit zoom > 1.0, got ${fit.zoom}`);
  assert.ok(Number.isFinite(fit.pan.x) && Number.isFinite(fit.pan.y));
});

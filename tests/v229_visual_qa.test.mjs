import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { findOpaqueBounds, fitSpriteIntoBox } from '../src/ui/spriteGeometry.js';
import { drawWallTile, WALL_PROFILE } from '../src/ui/wallSystem.js';

test('tile atlas metadata matches the active 16x16 renderer', () => {
  for (const path of [
    'public/assets/art/tilesets/cipher-hq/metadata.json',
    'public/assets/art/tilesets/server-room-7/metadata.json',
  ]) {
    const meta = JSON.parse(fs.readFileSync(path, 'utf8'));
    assert.equal(meta.tileWidth, 16);
    assert.equal(meta.tileHeight, 16);
    assert.equal(meta.columns, 16);
    assert.equal(meta.rows, 2);
  }
});

test('opaque sprite bounds ignore transparent atlas padding', () => {
  const rgba = new Uint8ClampedArray(8 * 8 * 4);
  rgba[(2 * 8 + 1) * 4 + 3] = 255;
  rgba[(5 * 8 + 6) * 4 + 3] = 255;
  assert.deepEqual(findOpaqueBounds(rgba, 8, 8), {
    x: 1, y: 2, width: 6, height: 4,
  });
});

test('prop fit preserves source aspect ratio and bottom-center ground anchor', () => {
  const fitted = fitSpriteIntoBox(
    { x: 64, y: 128, width: 40, height: 56 },
    { centerX: 100, bottomY: 200, width: 48, height: 50 }
  );

  assert.ok(fitted);
  assert.equal(fitted.sw, 40);
  assert.equal(fitted.sh, 56);
  assert.equal(fitted.dw, 36);
  assert.equal(fitted.dh, 50);
  assert.equal(fitted.dx + fitted.dw / 2, 100);
  assert.equal(fitted.dy + fitted.dh, 200);
  assert.equal(fitted.dw / fitted.dh, 40 / 56);
});

test('horizontal and vertical wall runs share a six-pixel cap and ten-pixel face', () => {
  assert.equal(WALL_PROFILE.capDepth, 6);
  assert.equal(WALL_PROFILE.faceDepth, 10);

  const rects = [];
  const ctx = {
    fillStyle: '',
    fillRect(x, y, width, height) { rects.push({ x, y, width, height }); },
  };

  drawWallTile(ctx, [
    [0, 4, 0],
    [0, 4, 0],
    [0, 4, 0],
  ], 1, 1);
  assert.ok(rects.some((r) => r.x === 23 && r.width === 7) && rects.some((r) => r.x === 30 && r.width === 2), 'Vertical wall needs a 10px side face');

  rects.length = 0;
  drawWallTile(ctx, [
    [0, 0, 0],
    [4, 4, 4],
    [0, 0, 0],
  ], 1, 1);
  assert.ok(rects.some((r) => r.y === 23 && r.height === 7) && rects.some((r) => r.y === 30 && r.height === 2), 'Horizontal wall needs a 10px front face');
});

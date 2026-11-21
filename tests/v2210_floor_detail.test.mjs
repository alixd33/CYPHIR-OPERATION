import assert from 'node:assert/strict';
import { test } from 'node:test';

import { drawFloorDetails } from '../src/ui/floorDetails.js';

function recordContext() {
  const rects = [];
  return {
    rects,
    ctx: {
      fillStyle: '',
      fillRect(x, y, width, height) {
        rects.push({ x, y, width, height, fillStyle: this.fillStyle });
      },
    },
  };
}

test('floor detailing is deterministic and does not draw a grid overlay', () => {
  const scene = {
    id: 'cipher_hq',
    grid: [
      [0, 0, 0, 0],
      [0, 4, 5, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  };
  const first = recordContext();
  const second = recordContext();

  drawFloorDetails(first.ctx, scene, 16);
  drawFloorDetails(second.ctx, scene, 16);

  assert.deepEqual(first.rects, second.rects);
  assert.ok(first.rects.length > 0);
  assert.ok(first.rects.length < 32, 'details should remain sparse rather than outlining every tile');
  assert.ok(first.rects.every((r) => r.width <= 3 && r.height === 1));
});

test('floor details stay inside walkable cells and skip walls and door cells', () => {
  const scene = {
    id: 'cipher_hq',
    grid: [
      [0, 0, 0, 0],
      [0, 4, 5, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  };
  const { ctx, rects } = recordContext();

  drawFloorDetails(ctx, scene, 16);

  for (const rect of rects) {
    assert.ok(rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.width <= scene.grid[0].length * 16);
    assert.ok(rect.y + rect.height <= scene.grid.length * 16);
    assert.equal(Math.floor(rect.y / 16) === 1 && Math.floor(rect.x / 16) === 1, false);
    assert.equal(Math.floor(rect.y / 16) === 1 && Math.floor(rect.x / 16) === 2, false);
  }
});

test('server-room detailing uses a separate deterministic accent palette', () => {
  const scene = { id: 'server_room_7', grid: Array.from({ length: 8 }, () => Array(8).fill(0)) };
  const { ctx, rects } = recordContext();

  drawFloorDetails(ctx, scene, 16);

  assert.ok(rects.length > 0);
  assert.ok(rects.some((r) => r.fillStyle.includes('117, 184, 168')));
});

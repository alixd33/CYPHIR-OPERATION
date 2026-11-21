/**
 * Procedural, deterministic floor-surface accents for the 16x16 pixel-art maps.
 * Details are deliberately sparse and broken up: they enrich the floor without
 * drawing a visible grid over the walkable space.
 */
import { WALL_TILE_IDS } from './wallSystem.js';

function cellHash(x, y, salt) {
  let value = (Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 1, 0x119de1f3) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function drawFloorDetails(ctx, scene, tileSize = 16) {
  if (!ctx || !scene || !Array.isArray(scene.grid) || tileSize <= 0) return;

  const isServerRoom = scene.id === 'server_room_7';
  const salt = isServerRoom ? 0x7a31 : 0x43c1;
  const glint = isServerRoom
    ? 'rgba(117, 184, 168, 0.15)'
    : 'rgba(218, 205, 174, 0.12)';
  const shadow = isServerRoom
    ? 'rgba(8, 20, 25, 0.15)'
    : 'rgba(26, 31, 37, 0.10)';

  if (isServerRoom) {
    // Broad, low-contrast material zones establish the central north-south
    // service aisle and its cross-aisle; no tile outlines are drawn.
    ctx.fillStyle = 'rgba(22, 48, 57, 0.13)';
    ctx.fillRect(21 * tileSize, tileSize, 6 * tileSize, 28 * tileSize);
    ctx.fillStyle = 'rgba(74, 127, 119, 0.09)';
    ctx.fillRect(tileSize, 12 * tileSize, 46 * tileSize, 5 * tileSize);
    ctx.fillStyle = 'rgba(117, 184, 168, 0.13)';
    for (let y = 2; y < 28; y += 4) {
      ctx.fillRect(20 * tileSize + 4, y * tileSize + 7, 3, 1);
      ctx.fillRect(25 * tileSize + 9, y * tileSize + 7, 3, 1);
    }
  }

  for (let y = 0; y < scene.grid.length; y++) {
    const row = scene.grid[y];
    if (!Array.isArray(row)) continue;

    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      if (tile === 5 || WALL_TILE_IDS.has(tile)) continue;

      const hash = cellHash(x, y, salt);
      const px = x * tileSize;
      const py = y * tileSize;

      // Sparse stone/metal flecks: only a subset of cells receive a mark.
      if ((hash & 7) === 0) {
        ctx.fillStyle = glint;
        ctx.fillRect(
          px + 2 + ((hash >>> 4) % Math.max(1, tileSize - 5)),
          py + 3 + ((hash >>> 9) % Math.max(1, tileSize - 6)),
          1 + ((hash >>> 14) & 1),
          1
        );
      }

      // A few broken, low-contrast wear marks keep large floor areas from
      // looking sterile while avoiding continuous tile outlines.
      if (((hash >>> 5) % (isServerRoom ? 13 : 19)) === 0) {
        ctx.fillStyle = shadow;
        ctx.fillRect(
          px + 4 + ((hash >>> 18) % Math.max(1, tileSize - 8)),
          py + 5 + ((hash >>> 22) % Math.max(1, tileSize - 8)),
          2,
          1
        );
      }

      // Server-room floor receives occasional short cyan service indicators.
      if (isServerRoom && hash % 29 === 0) {
        ctx.fillStyle = 'rgba(117, 184, 168, 0.20)';
        ctx.fillRect(px + 4, py + tileSize - 4, 3, 1);
      }
    }
  }
}

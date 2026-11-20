/**
 * Centralized World & Tile Scale Configuration (v2.2.8)
 * Migrated from 32x32 to 16x16 base tile grid while preserving world pixel dimensions
 * and Save/Load playerPosition compatibility.
 */

export const TILE_SIZE = 16;

export const PLAYER_SPRITE_SIZE = { width: 32, height: 48 };

// Foot-anchor collision box relative to player sprite top-left (px, py)
export const PLAYER_FOOTBOX = {
  offsetX: 9,
  offsetY: 22,
  width: 14,
  height: 8,
};

export function worldToTile(worldCoord) {
  return Math.floor(worldCoord / TILE_SIZE);
}

export function tileToWorld(tileCoord) {
  return tileCoord * TILE_SIZE;
}

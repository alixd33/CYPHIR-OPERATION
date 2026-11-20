/**
 * Architectural 4-Direction Autotiling Wall System (v2.2.8 — 16x16 Tile Grid)
 * - 4-bit cardinal neighbor mask: N=1, E=2, S=4, W=8
 * - Continuous unbroken 6px vertical caps on West/East walls
 * - Proportional 6px top cap + 12px front face + 3px floor drop-shadow on horizontal walls
 * - 7 coordinated wall material families: office (4), executive (11), monitoring (12), operations (14), painted (15), concrete (16), server
 * - Supports Glass Partitions (6), Windows (8), Wall Monitors (10), Door Frames (5), Columns (mask=0)
 * - Includes Automated Wall & Map Integrity Validator (validateSceneWalls)
 */

import { TILE_SIZE } from '../domain/worldConfig.js';

export const WALL_TILE_IDS = new Set([4, 6, 8, 10, 11, 12, 14, 15, 16]);

export const WALL_MATERIALS = {
  office: {
    capTop: '#56667A',
    capFill: '#3D4958',
    capBottom: '#2A333E',
    faceTop: '#323D4B',
    faceFill: '#28313D',
    facePanel: '#222A35',
    trim: '#4D5D70',
    baseboard: '#1A2028',
    sideEdge: '#1E252E',
  },
  executive: {
    capTop: '#7D5A3C',
    capFill: '#5C4029',
    capBottom: '#3D291A',
    faceTop: '#4E3623',
    faceFill: '#3F2B1C',
    facePanel: '#352316',
    trim: '#C6A15B',
    baseboard: '#24170E',
    sideEdge: '#2A1B11',
  },
  monitoring: {
    capTop: '#414D5C',
    capFill: '#2B333E',
    capBottom: '#1B2028',
    faceTop: '#232A33',
    faceFill: '#1B2129',
    facePanel: '#151A20',
    trim: '#4A7A76',
    baseboard: '#10141A',
    sideEdge: '#13171D',
  },
  operations: {
    capTop: '#4A6970',
    capFill: '#314950',
    capBottom: '#213238',
    faceTop: '#293D43',
    faceFill: '#213237',
    facePanel: '#1B292D',
    trim: '#75B8A8',
    baseboard: '#141E22',
    sideEdge: '#172327',
  },
  painted: {
    capTop: '#D4CCB9',
    capFill: '#C3BBA8',
    capBottom: '#938C7C',
    faceTop: '#B5AD9B',
    faceFill: '#A69E8C',
    facePanel: '#968E7D',
    trim: '#72533D',
    baseboard: '#49372D',
    sideEdge: '#6E685B',
  },
  concrete: {
    capTop: '#8C8B81',
    capFill: '#77766D',
    capBottom: '#4E4D47',
    faceTop: '#66655D',
    faceFill: '#55544E',
    facePanel: '#484742',
    trim: '#A6A397',
    baseboard: '#252B30',
    sideEdge: '#3C3B37',
  },
  server: {
    capTop: '#4F6272',
    capFill: '#374552',
    capBottom: '#242E38',
    faceTop: '#2C3843',
    faceFill: '#222C35',
    facePanel: '#1B232B',
    trim: '#5C778C',
    baseboard: '#13191F',
    sideEdge: '#171E25',
  },
};

export function isWallTile(tileId) {
  return WALL_TILE_IDS.has(tileId);
}

export function getWallMaterialKey(tileId, sceneId = 'cipher_hq') {
  if (tileId === 11) return 'executive';
  if (tileId === 12) return 'monitoring';
  if (tileId === 14) return 'operations';
  if (tileId === 15) return 'painted';
  if (tileId === 16) return 'concrete';
  if (sceneId === 'server_room_7') return 'server';
  return 'office';
}

export function computeWallMask(grid, x, y) {
  const H = grid.length;
  const W = grid[0]?.length || 0;
  const at = (nx, ny) => (ny >= 0 && ny < H && nx >= 0 && nx < W ? grid[ny][nx] : -1);

  const nTile = at(x, y - 1);
  const eTile = at(x + 1, y);
  const sTile = at(x, y + 1);
  const wTile = at(x - 1, y);

  let mask = 0;
  if (isWallTile(nTile)) mask |= 1;
  if (isWallTile(eTile)) mask |= 2;
  if (isWallTile(sTile)) mask |= 4;
  if (isWallTile(wTile)) mask |= 8;

  return {
    mask,
    hasN: Boolean(mask & 1),
    hasE: Boolean(mask & 2),
    hasS: Boolean(mask & 4),
    hasW: Boolean(mask & 8),
    doorN: nTile === 5,
    doorE: eTile === 5,
    doorS: sTile === 5,
    doorW: wTile === 5,
  };
}

function drawHorizontalFace(ctx, px, py, startX, width, mat, tileId, x, y, ts) {
  if (width <= 0) return;
  const fy = py + 6;
  ctx.fillStyle = mat.faceTop;
  ctx.fillRect(px + startX, fy, width, 1);
  ctx.fillStyle = mat.faceFill;
  ctx.fillRect(px + startX, fy + 1, width, 9);

  if (width >= 6) {
    ctx.fillStyle = mat.facePanel;
    ctx.fillRect(px + startX + 1, fy + 3, width - 2, 5);
    ctx.fillStyle = mat.trim;
    ctx.fillRect(px + startX + 1, fy + 2, width - 2, 1);
  }

  ctx.fillStyle = mat.baseboard;
  ctx.fillRect(px + startX, fy + 10, width, 2);

  ctx.fillStyle = 'rgba(10, 13, 18, 0.30)';
  ctx.fillRect(px + startX, fy + 12, width, 2);
  ctx.fillStyle = 'rgba(10, 13, 18, 0.14)';
  ctx.fillRect(px + startX, fy + 14, width, 1);

  if (tileId === 8 && width >= 12) {
    const wx = px + startX + Math.floor((width - 12) / 2);
    ctx.fillStyle = '#182028';
    ctx.fillRect(wx, fy + 1, 12, 9);
    ctx.fillStyle = '#3C6E85';
    ctx.fillRect(wx + 1, fy + 2, 10, 6);
    ctx.fillStyle = '#75B8A8';
    ctx.fillRect(wx + 2, fy + 3, 3, 1);
    ctx.fillRect(wx + 7, fy + 5, 3, 1);
    ctx.fillStyle = mat.trim;
    ctx.fillRect(wx + 5, fy + 2, 1, 6);
    ctx.fillRect(wx, fy + 8, 12, 1);
  } else if (tileId === 10 && width >= 12) {
    const mx = px + startX + Math.floor((width - 12) / 2);
    ctx.fillStyle = '#12161C';
    ctx.fillRect(mx, fy + 1, 12, 9);
    ctx.fillStyle = '#19323B';
    ctx.fillRect(mx + 1, fy + 2, 10, 7);
    const barW = 3 + ((Math.floor((ts || 0) / 350) + x + y) % 6);
    ctx.fillStyle = '#75B8A8';
    ctx.fillRect(mx + 2, fy + 4, barW, 1);
    ctx.fillStyle = '#E3C77D';
    ctx.fillRect(mx + 2, fy + 6, 5, 1);
  }
}

function drawGlassTile(ctx, px, py, info) {
  const { mask, hasN, hasS, hasE, hasW, doorN, doorS } = info;
  const cx = px + 6;

  if (hasE || hasW || mask === 0) {
    ctx.fillStyle = 'rgba(10, 13, 18, 0.20)';
    ctx.fillRect(px, py + 15, TILE_SIZE, 2);
    const sx = hasW ? 0 : 5;
    const ex = hasE ? TILE_SIZE : 11;
    const w = ex - sx;
    ctx.fillStyle = '#4A5B6B';
    ctx.fillRect(px + sx, py + 3, w, 2);
    ctx.fillStyle = '#75B8A8';
    ctx.fillRect(px + sx, py + 4, w, 1);
    ctx.fillStyle = 'rgba(117, 184, 168, 0.36)';
    ctx.fillRect(px + sx, py + 5, w, 8);
    ctx.fillStyle = 'rgba(220, 245, 242, 0.45)';
    ctx.fillRect(px + sx + 2, py + 7, 2, 1);
    ctx.fillStyle = '#2A3540';
    ctx.fillRect(px + sx, py + 13, w, 2);
  }

  if (hasN || hasS) {
    const sy = hasN || doorN ? 0 : 3;
    const ey = hasS || doorS ? TILE_SIZE : 14;
    const h = ey - sy;
    ctx.fillStyle = 'rgba(10, 13, 18, 0.18)';
    ctx.fillRect(cx + 4, py + sy, 2, h);
    ctx.fillStyle = '#384856';
    ctx.fillRect(cx, py + sy, 4, h);
    ctx.fillStyle = 'rgba(117, 184, 168, 0.65)';
    ctx.fillRect(cx + 1, py + sy, 2, h);
  }

  if ((hasN || hasS) && (hasE || hasW)) {
    ctx.fillStyle = '#5B6E80';
    ctx.fillRect(px + 5, py + 2, 6, 6);
    ctx.fillStyle = '#2B3540';
    ctx.fillRect(px + 6, py + 3, 4, 4);
  }
}

export function drawWallTile(ctx, grid, x, y, sceneId = 'cipher_hq', ts = 0) {
  const tileId = grid[y][x];
  if (!isWallTile(tileId)) return;

  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const info = computeWallMask(grid, x, y);

  if (tileId === 6) {
    drawGlassTile(ctx, px, py, info);
    return;
  }

  const mat = WALL_MATERIALS[getWallMaterialKey(tileId, sceneId)];
  const { mask, hasN, hasE, hasS, hasW, doorW, doorE } = info;

  if (mask === 0) {
    ctx.fillStyle = 'rgba(10, 13, 18, 0.32)';
    ctx.fillRect(px + 3, py + 14, 11, 3);
    ctx.fillStyle = mat.capTop;
    ctx.fillRect(px + 3, py + 1, 10, 1);
    ctx.fillStyle = mat.capFill;
    ctx.fillRect(px + 3, py + 2, 10, 4);
    ctx.fillStyle = mat.capBottom;
    ctx.fillRect(px + 3, py + 6, 10, 1);
    ctx.fillStyle = mat.faceFill;
    ctx.fillRect(px + 4, py + 7, 8, 7);
    ctx.fillStyle = mat.baseboard;
    ctx.fillRect(px + 3, py + 14, 10, 2);
    return;
  }

  const hasHoriz = hasE || hasW;
  const hasVert = hasN || hasS;

  if (hasHoriz) {
    const faceStart = hasW ? 0 : 5;
    const faceEnd = hasE ? TILE_SIZE : 11;
    drawHorizontalFace(ctx, px, py, faceStart, faceEnd - faceStart, mat, tileId, x, y, ts);
  } else if (hasN && !hasS) {
    ctx.fillStyle = mat.faceFill;
    ctx.fillRect(px + 5, py + 10, 6, 4);
    ctx.fillStyle = mat.baseboard;
    ctx.fillRect(px + 5, py + 14, 6, 2);
    ctx.fillStyle = 'rgba(10, 13, 18, 0.24)';
    ctx.fillRect(px + 5, py + 16, 6, 1);
  }

  if (hasHoriz) {
    const capStart = hasW ? 0 : 5;
    const capEnd = hasE ? TILE_SIZE : 11;
    const cw = capEnd - capStart;
    ctx.fillStyle = mat.capTop;
    ctx.fillRect(px + capStart, py, cw, 1);
    ctx.fillStyle = mat.capFill;
    ctx.fillRect(px + capStart, py + 1, cw, 4);
    ctx.fillStyle = mat.capBottom;
    ctx.fillRect(px + capStart, py + 5, cw, 1);
  }

  if (hasVert) {
    const vyStart = 0;
    const vyEnd = hasS ? TILE_SIZE : (hasHoriz ? 6 : 11);
    const vh = vyEnd - vyStart;

    ctx.fillStyle = 'rgba(10, 13, 18, 0.22)';
    ctx.fillRect(px + 11, py + vyStart, 2, vh);

    ctx.fillStyle = mat.capTop;
    ctx.fillRect(px + 5, py + vyStart, 1, vh);
    ctx.fillStyle = mat.capFill;
    ctx.fillRect(px + 6, py + vyStart, 4, vh);
    ctx.fillStyle = mat.sideEdge;
    ctx.fillRect(px + 10, py + vyStart, 1, vh);

    if (!hasN) {
      ctx.fillStyle = mat.capTop;
      ctx.fillRect(px + 5, py, 6, 1);
    }
    if (!hasS && !hasHoriz) {
      ctx.fillStyle = mat.capBottom;
      ctx.fillRect(px + 5, py + 10, 6, 1);
    }
  }

  if (doorE) {
    ctx.fillStyle = mat.trim;
    ctx.fillRect(px + 14, py, 2, 16);
  }
  if (doorW) {
    ctx.fillStyle = mat.trim;
    ctx.fillRect(px, py, 2, 16);
  }
}

export function drawDoorFrame(ctx, grid, x, y, sceneId = 'cipher_hq') {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const H = grid.length;
  const nTile = y > 0 ? grid[y - 1][x] : -1;
  const sTile = y + 1 < H ? grid[y + 1][x] : -1;
  const wTile = x > 0 ? grid[y][x - 1] : -1;
  const eTile = x + 1 < (grid[0]?.length || 0) ? grid[y][x + 1] : -1;

  const isVert = isWallTile(nTile) || isWallTile(sTile);
  const refTile = isVert ? (isWallTile(nTile) ? nTile : sTile) : (isWallTile(wTile) ? wTile : eTile);
  const isGlass = refTile === 6;
  const mat = WALL_MATERIALS[getWallMaterialKey(refTile, sceneId)];

  if (isVert) {
    const jx = isGlass ? px + 6 : px + 5;
    const jw = isGlass ? 4 : 6;
    if (isWallTile(nTile)) {
      ctx.fillStyle = isGlass ? '#384856' : mat.capFill;
      ctx.fillRect(jx, py, jw, 2);
      ctx.fillStyle = isGlass ? '#75B8A8' : mat.trim;
      ctx.fillRect(jx, py + 2, jw, 1);
    }
    if (isWallTile(sTile)) {
      ctx.fillStyle = isGlass ? '#384856' : mat.capFill;
      ctx.fillRect(jx, py + 14, jw, 2);
      ctx.fillStyle = isGlass ? '#75B8A8' : mat.trim;
      ctx.fillRect(jx, py + 13, jw, 1);
    }
  } else {
    ctx.fillStyle = 'rgba(198, 161, 91, 0.22)';
    ctx.fillRect(px, py + 13, TILE_SIZE, 2);
    if (isWallTile(wTile)) {
      ctx.fillStyle = isGlass ? '#384856' : mat.capFill;
      ctx.fillRect(px, py + 2, 2, 13);
      ctx.fillStyle = isGlass ? '#75B8A8' : mat.trim;
      ctx.fillRect(px + 2, py + 2, 1, 13);
    }
    if (isWallTile(eTile)) {
      ctx.fillStyle = isGlass ? '#384856' : mat.capFill;
      ctx.fillRect(px + 14, py + 2, 2, 13);
      ctx.fillStyle = isGlass ? '#75B8A8' : mat.trim;
      ctx.fillRect(px + 13, py + 2, 1, 13);
    }
  }
}

export function validateSceneWalls(scene) {
  const issues = [];
  if (!scene || !Array.isArray(scene.grid) || scene.grid.length === 0) {
    return { valid: false, issues: ['Missing scene grid'] };
  }
  const H = scene.height;
  const W = scene.width;
  const grid = scene.grid;

  for (let x = 0; x < W; x++) {
    if (!isWallTile(grid[0][x]) && grid[0][x] !== 5) issues.push(`Top boundary gap at (${x},0)`);
    if (!isWallTile(grid[H - 1][x]) && grid[H - 1][x] !== 5) issues.push(`Bottom boundary gap at (${x},${H - 1})`);
  }
  for (let y = 0; y < H; y++) {
    if (!isWallTile(grid[y][0]) && grid[y][0] !== 5) issues.push(`Left boundary gap at (0,${y})`);
    if (!isWallTile(grid[y][W - 1]) && grid[y][W - 1] !== 5) issues.push(`Right boundary gap at (${W - 1},${y})`);
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y][x] === 5) {
        const hasWall =
          (x > 0 && (isWallTile(grid[y][x - 1]) || grid[y][x - 1] === 5)) ||
          (x + 1 < W && (isWallTile(grid[y][x + 1]) || grid[y][x + 1] === 5)) ||
          (y > 0 && (isWallTile(grid[y - 1][x]) || grid[y - 1][x] === 5)) ||
          (y + 1 < H && (isWallTile(grid[y + 1][x]) || grid[y + 1][x] === 5));
        if (!hasWall) {
          issues.push(`Doorway at (${x},${y}) has no adjacent wall connection`);
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

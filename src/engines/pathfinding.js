/**
 * Independent Connected Grid A* Pathfinding & Navigation Module (v2.2.8 — 16x16 Grid)
 * - Centralized TILE_SIZE = 16 from worldConfig.js
 * - Separates Visual Sprite Bounds from Ground Collision Footprint
 * - Validates reachability from startCell (never snaps across walls/closed doors)
 * - Prevents diagonal corner-cutting across walls/furniture
 * - Respects Door states ('open' | 'unlocked' walkable; 'closed' | 'locked' blocked)
 */

import { TILE_SIZE } from '../domain/worldConfig.js';

export function getPropCollisionBox(prop, tileSize = TILE_SIZE) {
  const cx = prop.x * tileSize + tileSize / 2;
  const bottomY = prop.y * tileSize + tileSize;
  if (prop.footprint) {
    const fw = prop.footprint.w;
    const fh = prop.footprint.h;
    const ox = prop.footprint.offsetX || 0;
    const oy = prop.footprint.offsetY || 0;
    return {
      x: cx - fw / 2 + ox,
      y: bottomY - fh + oy,
      w: fw,
      h: fh,
    };
  }
  const fw = Math.max(tileSize - 2, Math.min(prop.w || tileSize, Math.round((prop.w || tileSize) * 0.72)));
  const fh = Math.max(10, Math.min(20, Math.round((prop.h || tileSize) * 0.34)));
  return {
    x: cx - fw / 2,
    y: bottomY - fh,
    w: fw,
    h: fh,
  };
}

export function buildNavigationGrid(scene, doorStates = {}) {
  if (!scene) return { width: 0, height: 0, tileSize: TILE_SIZE, walkable: [] };
  const ts = scene.tileSize || TILE_SIZE;
  const solid = new Set(scene.solidTiles || []);
  const walkable = Array.from({ length: scene.height }, (_, y) =>
    Array.from({ length: scene.width }, (_, x) => !solid.has(scene.grid[y][x]))
  );

  const doorSet = new Set();
  for (const door of scene.doors || []) {
    const st = doorStates[door.id] || door.initialState || 'open';
    const canPass = st === 'open' || st === 'unlocked' || st === 'transitioning';
    const dw = door.widthTiles || 1;
    const dh = door.heightTiles || 1;
    for (let dy = 0; dy < dh; dy++) {
      for (let dx = 0; dx < dw; dx++) {
        const tx = door.x + dx;
        const ty = door.y + dy;
        if (ty >= 0 && ty < scene.height && tx >= 0 && tx < scene.width) {
          walkable[ty][tx] = canPass;
          doorSet.add(`${tx},${ty}`);
        }
      }
    }
  }

  const anchorSet = new Set(
    (scene.interactables || [])
      .filter((o) => o.approachAnchor)
      .map((o) => `${o.approachAnchor.x},${o.approachAnchor.y}`)
  );

  for (const prop of scene.props || []) {
    if (!prop.solid) continue;
    const box = getPropCollisionBox(prop, ts);
    const minX = Math.floor(box.x / ts);
    const maxX = Math.floor((box.x + box.w - 0.01) / ts);
    const minY = Math.floor(box.y / ts);
    const maxY = Math.floor((box.y + box.h - 0.01) / ts);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        if (py >= 0 && py < scene.height && px >= 0 && px < scene.width) {
          const k = `${px},${py}`;
          if (!anchorSet.has(k) && !doorSet.has(k)) {
            walkable[py][px] = false;
          }
        }
      }
    }
  }

  for (const npc of scene.npcs || []) {
    const nx = Math.round(npc.x);
    const ny = Math.round(npc.y);
    if (ny >= 0 && ny < scene.height && nx >= 0 && nx < scene.width) {
      walkable[ny][nx] = false;
    }
  }

  return { width: scene.width, height: scene.height, tileSize: ts, walkable };
}

export function isCellWalkable(navGrid, cx, cy) {
  if (!navGrid || cy < 0 || cy >= navGrid.height || cx < 0 || cx >= navGrid.width) return false;
  return Boolean(navGrid.walkable[cy][cx]);
}

export function getReachableCells(navGrid, startCell) {
  const reachable = new Set();
  if (!isCellWalkable(navGrid, startCell.x, startCell.y)) return reachable;
  const key = (x, y) => `${x},${y}`;
  const q = [startCell];
  reachable.add(key(startCell.x, startCell.y));

  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  while (q.length > 0) {
    const cur = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (!reachable.has(k) && isCellWalkable(navGrid, nx, ny)) {
        reachable.add(k);
        q.push({ x: nx, y: ny });
      }
    }
  }
  return reachable;
}

export function findNearestReachableCell(navGrid, startCell, targetCell, maxRadius = 4) {
  const reachable = getReachableCells(navGrid, startCell);
  const key = (x, y) => `${x},${y}`;
  if (reachable.has(key(targetCell.x, targetCell.y))) return targetCell;

  let best = null;
  let bestDist = Infinity;
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = targetCell.x + dx;
        const cy = targetCell.y + dy;
        if (!reachable.has(key(cx, cy))) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x: cx, y: cy };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

export function findPathAStar(navGrid, startCell, goalCell, snapRadius = 4) {
  if (!isCellWalkable(navGrid, startCell.x, startCell.y)) {
    let fallback = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (isCellWalkable(navGrid, startCell.x + dx, startCell.y + dy)) {
        fallback = { x: startCell.x + dx, y: startCell.y + dy };
        break;
      }
    }
    if (!fallback) return null;
    startCell = fallback;
  }

  const snappedGoal = findNearestReachableCell(navGrid, startCell, goalCell, snapRadius);
  if (!snappedGoal) return null;
  if (startCell.x === snappedGoal.x && startCell.y === snappedGoal.y) return [];

  const key = (x, y) => `${x},${y}`;
  const open = [{ x: startCell.x, y: startCell.y, g: 0, f: Math.hypot(snappedGoal.x - startCell.x, snappedGoal.y - startCell.y) }];
  const gScore = new Map([[key(startCell.x, startCell.y), 0]]);
  const cameFrom = new Map();
  const closed = new Set();

  const dirs = [
    [0, -1, 1],
    [0, 1, 1],
    [-1, 0, 1],
    [1, 0, 1],
    [-1, -1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [1, 1, Math.SQRT2],
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const curKey = key(cur.x, cur.y);
    if (cur.x === snappedGoal.x && cur.y === snappedGoal.y) {
      const path = [];
      let traceKey = curKey;
      let traceNode = { x: cur.x, y: cur.y };
      while (cameFrom.has(traceKey)) {
        path.unshift(traceNode);
        traceNode = cameFrom.get(traceKey);
        traceKey = key(traceNode.x, traceNode.y);
      }
      return path;
    }
    closed.add(curKey);

    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const nKey = key(nx, ny);
      if (closed.has(nKey) || !isCellWalkable(navGrid, nx, ny)) continue;

      if (dx !== 0 && dy !== 0) {
        if (!isCellWalkable(navGrid, cur.x + dx, cur.y) || !isCellWalkable(navGrid, cur.x, cur.y + dy)) {
          continue;
        }
      }

      const tentativeG = cur.g + cost;
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, { x: cur.x, y: cur.y });
        gScore.set(nKey, tentativeG);
        const h = Math.hypot(snappedGoal.x - nx, snappedGoal.y - ny);
        const existing = open.find((n) => n.x === nx && n.y === ny);
        if (existing) {
          existing.g = tentativeG;
          existing.f = tentativeG + h;
        } else {
          open.push({ x: nx, y: ny, g: tentativeG, f: tentativeG + h });
        }
      }
    }
  }
  return null;
}

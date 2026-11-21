import { buildNavigationGrid, findPathAStar, isCellWalkable } from './pathfinding.js';
import { TILE_SIZE, PLAYER_FOOTBOX } from '../domain/worldConfig.js';

/**
 * Independent ExplorationEngine (v2.2.8 — 16x16 Tile Migration)
 * - Unified WASD + Arrow Keys + A* Click-to-Move with immediate Manual Override
 * - Centralized TILE_SIZE = 16 & PLAYER_FOOTBOX collision
 * - Door state machine ('open' | 'closed' | 'locked' | 'unlocked' | 'transitioning')
 * - Full Interaction Registry & Debug telemetry
 */

export class ExplorationEngine {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.scenes = {};
    this.activeScene = null;
    this.navGrid = null;
    this.doorStates = {};
    this.activePath = [];
    this.targetCell = null;
    this.pathFailReason = null;
    this.lastInteractionResult = null;
    this.lastInteractMs = 0;

    this.player = {
      x: 0,
      y: 0,
      dir: 0, // 0=down, 1=up, 2=left, 3=right
      col: 0, // 0..1 idle, 2..5 walk
      animTimer: 0,
      animDistance: 0,
      idleTimer: 0,
      isMoving: false,
    };
  }

  get tileSize() {
    return this.activeScene?.tileSize || TILE_SIZE;
  }

  registerScenes(scenesMap) {
    this.scenes = scenesMap || {};
  }

  loadScene(campaignState, sceneId, spawnOverride = null) {
    const def = this.scenes[sceneId];
    if (!def) return { ok: false, reason: `صحنه ${sceneId} یافت نشد.` };
    const isTransfer = campaignState.currentSceneId && campaignState.currentSceneId !== sceneId;
    this.activeScene = def;
    campaignState.currentSceneId = sceneId;

    if (!campaignState.doorStates) campaignState.doorStates = {};
    for (const door of def.doors || []) {
      if (!campaignState.doorStates[door.id]) {
        campaignState.doorStates[door.id] = door.initialState || 'open';
      }
    }
    this.doorStates = campaignState.doorStates;
    this.rebuildNavGrid();

    const pos = spawnOverride || (isTransfer ? def.spawn : campaignState.playerPosition || def.spawn);
    this.player.x = pos.x;
    this.player.y = pos.y;
    this.player.dir = pos.dir ?? 0;
    this.player.col = 0;
    this.player.animTimer = 0;
    this.player.animDistance = 0;
    this.player.idleTimer = 0;
    this.player.isMoving = false;
    this.clearPath();

    this.eventBus?.emit('SCENE_TRANSFERRED', { sceneId, x: this.player.x, y: this.player.y });
    return { ok: true, scene: def };
  }

  rebuildNavGrid() {
    this.navGrid = buildNavigationGrid(this.activeScene, this.doorStates);
  }

  clearPath() {
    this.activePath = [];
    this.targetCell = null;
    this.pathFailReason = null;
  }

  setClickDestination(worldX, worldY) {
    if (!this.activeScene || !this.navGrid) return { ok: false, reason: 'صحنه فعال نیست.' };
    const ts = this.tileSize;
    const startCell = {
      x: Math.floor((this.player.x + 16) / ts),
      y: Math.floor((this.player.y + 26) / ts),
    };
    let goalCell = {
      x: Math.max(0, Math.min(this.activeScene.width - 1, Math.floor(worldX / ts))),
      y: Math.max(0, Math.min(this.activeScene.height - 1, Math.floor(worldY / ts))),
    };

    for (const obj of this.activeScene.interactables || []) {
      const ox = obj.x * ts + ts / 2;
      const oy = obj.y * ts + ts / 2;
      if (Math.hypot(worldX - ox, worldY - oy) <= (obj.clickRadius ?? 30) && obj.approachAnchor) {
        goalCell = { x: obj.approachAnchor.x, y: obj.approachAnchor.y };
        break;
      }
    }

    const snapRadius = isCellWalkable(this.navGrid, goalCell.x, goalCell.y) ? 0 : 4;
    const path = findPathAStar(this.navGrid, startCell, goalCell, snapRadius);
    if (path === null) {
      this.activePath = [];
      this.targetCell = goalCell;
      this.pathFailReason = 'مسیر قابل عبوری به این نقطه وجود ندارد.';
      return { ok: false, reason: this.pathFailReason };
    }
    this.activePath = path;
    this.targetCell = path.length > 0 ? path[path.length - 1] : startCell;
    this.pathFailReason = null;
    return { ok: true, path };
  }

  canWalkAt(px, py) {
    if (!this.activeScene) return false;
    if (!this.navGrid) this.rebuildNavGrid();
    const ts = this.tileSize;
    const x0 = px + PLAYER_FOOTBOX.offsetX;
    const x1 = x0 + PLAYER_FOOTBOX.width;
    const y0 = py + PLAYER_FOOTBOX.offsetY;
    const y1 = y0 + PLAYER_FOOTBOX.height;
    const corners = [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ];
    for (const [cx, cy] of corners) {
      const gx = Math.floor(cx / ts);
      const gy = Math.floor(cy / ts);
      if (!isCellWalkable(this.navGrid, gx, gy)) return false;
    }
    return true;
  }

  updateMovement(dt, keys, campaignState) {
    if (!this.activeScene) return;
    const ts = this.tileSize;
    let dx = 0;
    let dy = 0;

    if (keys.has('ArrowUp') || keys.has('KeyW') || keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS') || keys.has('arrowdown') || keys.has('s')) dy += 1;
    if (keys.has('ArrowLeft') || keys.has('KeyA') || keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD') || keys.has('arrowright') || keys.has('d')) dx += 1;

    const manualInput = dx !== 0 || dy !== 0;
    if (manualInput) {
      // Keyboard input always takes priority and cancels an existing click route.
      if (this.activePath.length > 0 || this.targetCell) this.clearPath();
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
    } else if (this.activePath.length > 0) {
      // Consume waypoints already reached before selecting the next movement vector.
      let guard = 0;
      while (this.activePath.length > 0 && guard++ < 4) {
        const waypoint = this.activePath[0];
        if (!isCellWalkable(this.navGrid, waypoint.x, waypoint.y)) {
          const last = this.targetCell || waypoint;
          const replanned = this.setClickDestination(last.x * ts + ts / 2, last.y * ts + ts / 2);
          if (!replanned.ok) break;
        }
        const next = this.activePath[0];
        if (!next) break;
        const targetX = next.x * ts + ts / 2 - 16;
        const targetY = next.y * ts + ts / 2 - 26;
        const distance = Math.hypot(targetX - this.player.x, targetY - this.player.y);
        if (distance <= 0.75) {
          this.player.x = targetX;
          this.player.y = targetY;
          this.activePath.shift();
          if (this.activePath.length === 0) this.targetCell = null;
          continue;
        }
        dx = (targetX - this.player.x) / distance;
        dy = (targetY - this.player.y) / distance;
        break;
      }
    }

    const hasIntent = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
    const speed = 64; // 4 tiles/sec at 16px tiles; identical for keyboard and click movement.
    let travel = hasIntent ? Math.max(0, Math.min(0.05, dt)) * speed : 0;

    if (!manualInput && this.activePath.length > 0) {
      const next = this.activePath[0];
      const targetX = next.x * ts + ts / 2 - 16;
      const targetY = next.y * ts + ts / 2 - 26;
      travel = Math.min(travel, Math.hypot(targetX - this.player.x, targetY - this.player.y));
    }

    const startX = this.player.x;
    const startY = this.player.y;
    if (travel > 0.001) {
      const nextX = startX + dx * travel;
      const nextY = startY + dy * travel;
      const canMoveTogether = this.canWalkAt(nextX, nextY);

      if (canMoveTogether) {
        this.player.x = nextX;
        this.player.y = nextY;
      } else if (manualInput) {
        // Preserve the familiar wall-sliding behaviour for direct keyboard control.
        if (this.canWalkAt(nextX, startY)) this.player.x = nextX;
        if (this.canWalkAt(this.player.x, nextY)) this.player.y = nextY;
      } else if (Math.abs(dx) >= Math.abs(dy)) {
        if (this.canWalkAt(nextX, startY)) this.player.x = nextX;
        if (this.canWalkAt(this.player.x, nextY)) this.player.y = nextY;
      } else {
        if (this.canWalkAt(startX, nextY)) this.player.y = nextY;
        if (this.canWalkAt(nextX, this.player.y)) this.player.x = nextX;
      }
    }

    const movedX = this.player.x - startX;
    const movedY = this.player.y - startY;
    const movedDistance = Math.hypot(movedX, movedY);
    this.player.isMoving = movedDistance > 0.05;

    if (this.player.isMoving) {
      const ax = Math.abs(movedX);
      const ay = Math.abs(movedY);
      if (ax > ay + 0.5) this.player.dir = movedX < 0 ? 2 : 3;
      else if (ay > ax + 0.5) this.player.dir = movedY < 0 ? 1 : 0;
      else {
        // On diagonal segments retain a compatible facing direction instead of flickering.
        const horizontalMatches = (this.player.dir === 2 && movedX < 0) || (this.player.dir === 3 && movedX > 0);
        const verticalMatches = (this.player.dir === 1 && movedY < 0) || (this.player.dir === 0 && movedY > 0);
        if (!horizontalMatches && !verticalMatches) this.player.dir = movedY < 0 ? 1 : 0;
      }

      // Advance the walk cycle from real pixels travelled, not elapsed time or intended input.
      this.player.animDistance += movedDistance;
      while (this.player.animDistance >= 8) {
        this.player.animDistance -= 8;
        this.player.col = this.player.col < 2 || this.player.col >= 5 ? 2 : this.player.col + 1;
      }
      this.player.idleTimer = 0;

      if (!manualInput && this.activePath.length > 0) {
        const waypoint = this.activePath[0];
        const targetX = waypoint.x * ts + ts / 2 - 16;
        const targetY = waypoint.y * ts + ts / 2 - 26;
        if (Math.hypot(targetX - this.player.x, targetY - this.player.y) <= 0.75) {
          this.player.x = targetX;
          this.player.y = targetY;
          this.activePath.shift();
          if (this.activePath.length === 0) this.targetCell = null;
        } else if (movedDistance < travel * 0.2 && travel > 0.1 && this.targetCell) {
          // Rebuild a route if the live footbox disagrees with the navigation grid.
          const goal = this.targetCell;
          this.setClickDestination(goal.x * ts + ts / 2, goal.y * ts + ts / 2);
        }
      }

      if (campaignState) {
        campaignState.playerPosition = {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y),
          dir: this.player.dir,
        };
      }
    } else {
      this.player.animDistance = 0;
      this.player.idleTimer += Math.max(0, dt);
      if (this.player.idleTimer > 2.2) {
        this.player.col = 1;
        if (this.player.idleTimer > 2.4) {
          this.player.idleTimer = 0;
          this.player.col = 0;
        }
      } else {
        this.player.col = 0;
      }
    }
  }

  checkRequirements(requires = [], campaignState = {}) {
    for (const req of requires || []) {
      if (req.startsWith('flag:')) {
        const flagName = req.slice(5);
        if (!campaignState.worldFlags?.[flagName]) {
          return { met: false, reason: 'ابتدا باید پیش‌نیاز داستانی این بخش را انجام دهید.' };
        }
      } else if (req.startsWith('ev:')) {
        const evId = req.slice(3);
        if (!campaignState.evidenceStates?.[evId]?.discoveredAt) {
          return { met: false, reason: `نیاز به کشف مدرک ${evId} دارد.` };
        }
      }
    }
    return { met: true, reason: null };
  }

  getNearestInteractable(campaignState) {
    if (!this.activeScene) return null;
    const ts = this.tileSize;
    const px = this.player.x + 16;
    const py = this.player.y + 26;
    let best = null;
    let bestDist = Infinity;

    for (const obj of this.activeScene.interactables || []) {
      if (obj.conditionFlag && !campaignState?.worldFlags?.[obj.conditionFlag]) continue;
      const radius = obj.interactionRadius ?? 72;
      const dist = Math.hypot(px - (obj.x * ts + ts / 2), py - (obj.y * ts + ts / 2));
      if (dist <= radius && dist < bestDist) {
        const reqCheck = this.checkRequirements(obj.requires, campaignState);
        const enabled = obj.enabled !== false && reqCheck.met;
        bestDist = dist;
        best = {
          kind: 'object',
          item: obj,
          dist,
          enabled,
          failedRequirement: reqCheck.reason,
        };
      }
    }

    for (const npc of this.activeScene.npcs || []) {
      const radius = npc.interactionRadius ?? 72;
      const dist = Math.hypot(px - (npc.x * ts + ts / 2), py - (npc.y * ts + ts));
      if (dist <= radius && dist < bestDist) {
        bestDist = dist;
        best = { kind: 'npc', item: npc, dist, enabled: true, failedRequirement: null };
      }
    }

    for (const door of this.activeScene.doors || []) {
      if (!door.interactive) continue;
      const radius = door.interactionRadius ?? 56;
      const dw = door.widthTiles || 1;
      const dist = Math.hypot(px - (door.x * ts + (dw * ts) / 2), py - (door.y * ts + ts / 2));
      if (dist <= radius && dist < bestDist) {
        const st = this.doorStates[door.id] || door.initialState || 'closed';
        const reqCheck = this.checkRequirements(door.requires, campaignState);
        bestDist = dist;
        best = {
          kind: 'door',
          item: { ...door, label: st === 'open' || st === 'unlocked' ? `بستن ${door.label}` : `باز کردن ${door.label}` },
          dist,
          enabled: st !== 'locked' || reqCheck.met,
          failedRequirement: st === 'locked' && !reqCheck.met ? (door.lockedReason || reqCheck.reason) : null,
        };
      }
    }
    return best;
  }

  interact(campaignState, nowMs = Date.now()) {
    if (nowMs - this.lastInteractMs < 250) return null;
    const ts = this.tileSize;
    const nearest = this.getNearestInteractable(campaignState);
    if (!nearest) {
      this.lastInteractionResult = { ok: false, reason: 'شیء یا شخص قابل تعاملی در نزدیکی شما نیست.' };
      return this.lastInteractionResult;
    }
    if (!nearest.enabled) {
      this.lastInteractionResult = { ok: false, reason: nearest.failedRequirement || 'این تعامل در حال حاضر غیرفعال است.' };
      return this.lastInteractionResult;
    }
    this.lastInteractMs = nowMs;

    if (nearest.kind === 'object') {
      const obj = nearest.item;
      if (campaignState && !campaignState.inspectedObjectIds.includes(obj.id)) {
        campaignState.inspectedObjectIds.push(obj.id);
      }
      this.eventBus?.emit('OBJECT_INSPECTED', { objectId: obj.id, actionType: obj.actionType });
      this.lastInteractionResult = { ok: true, kind: 'object', object: obj, target: obj };
      return this.lastInteractionResult;
    }

    if (nearest.kind === 'npc') {
      const npc = nearest.item;
      const dx = this.player.x - npc.x * ts;
      const dy = this.player.y - npc.y * ts;
      if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx < 0 ? 2 : 3;
      else npc.dir = dy < 0 ? 1 : 0;

      this.eventBus?.emit('NPC_DIALOGUE_STARTED', { npcId: npc.id });
      this.lastInteractionResult = { ok: true, kind: 'npc', npc, target: npc };
      return this.lastInteractionResult;
    }

    if (nearest.kind === 'door') {
      const door = nearest.item;
      const cur = this.doorStates[door.id] || door.initialState || 'closed';
      const next = cur === 'open' || cur === 'unlocked' ? 'closed' : 'open';
      this.doorStates[door.id] = next;
      this.rebuildNavGrid();
      this.eventBus?.emit('DOOR_STATE_CHANGED', { doorId: door.id, state: next });
      this.lastInteractionResult = { ok: true, kind: 'door', door, state: next };
      return this.lastInteractionResult;
    }
    return null;
  }
}

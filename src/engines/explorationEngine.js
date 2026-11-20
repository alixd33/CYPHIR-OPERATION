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
      if (this.activePath.length > 0 || this.targetCell) this.clearPath();
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    } else if (this.activePath.length > 0) {
      const wp = this.activePath[0];
      if (!isCellWalkable(this.navGrid, wp.x, wp.y)) {
        const last = this.targetCell || wp;
        this.setClickDestination(last.x * ts + ts / 2, last.y * ts + ts / 2);
      }
      if (this.activePath.length > 0) {
        const nextWp = this.activePath[0];
        const targetPx = nextWp.x * ts + ts / 2 - 16;
        const targetPy = nextWp.y * ts + ts / 2 - 26;
        const tdx = targetPx - this.player.x;
        const tdy = targetPy - this.player.y;
        const dist = Math.hypot(tdx, tdy);
        if (dist <= 3) {
          this.player.x = targetPx;
          this.player.y = targetPy;
          this.activePath.shift();
          if (this.activePath.length === 0) this.targetCell = null;
        } else {
          dx = tdx / dist;
          dy = tdy / dist;
        }
      }
    }

    const speed = 145;
    const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    this.player.isMoving = moving;

    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx < 0 ? 2 : 3;
      else this.player.dir = dy < 0 ? 1 : 0;

      const nx = this.player.x + dx * speed * dt;
      const ny = this.player.y + dy * speed * dt;
      const movedX = this.canWalkAt(nx, this.player.y);
      if (movedX) this.player.x = nx;
      const movedY = this.canWalkAt(this.player.x, ny);
      if (movedY) this.player.y = ny;

      if (!movedX && !movedY && !manualInput && this.activePath.length > 0) {
        const last = this.targetCell;
        if (last) this.setClickDestination(last.x * ts + ts / 2, last.y * ts + ts / 2);
      }

      this.player.animTimer += dt;
      if (this.player.animTimer >= 0.125) {
        this.player.animTimer = 0;
        this.player.col = this.player.col < 2 || this.player.col >= 5 ? 2 : this.player.col + 1;
      }
      if (campaignState) {
        campaignState.playerPosition = {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y),
          dir: this.player.dir,
        };
      }
    } else {
      this.player.idleTimer += dt;
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

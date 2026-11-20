/**
 * Studio 2.5D Three-Quarter Pixel Art Scene Renderer (v2.2.8 — 16x16 Tile Migration)
 * - Centralized TILE_SIZE = 16 from worldConfig.js
 * - Responsive Canvas via ResizeObserver + devicePixelContentBoxSize (fallback DPR)
 * - Independent World/Camera Zoom (setZoom / zoomIn / zoomOut / resetZoom)
 * - 16x16 4-Direction Cardinal Autotiling Wall System (wallSystem.js) + Foreground Wall Occlusion & Cutaway
 * - Gridless 16x16 Floor Materials + Atrium Rug + Contact Shadows + Localized Radial Lighting Pools
 * - 32x48 characters (24 player variants + 4 named NPCs + ambient non-interactive staff)
 * - 128 handcrafted 2.5D 64x64 props (8x16 props_sheet.png) + Y-Sorting + A* Path Preview
 */

import { drawWallTile, drawDoorFrame, isWallTile } from './wallSystem.js';
import { TILE_SIZE } from '../domain/worldConfig.js';
import { getPropCollisionBox } from '../engines/pathfinding.js';
import { findOpaqueBounds, fitSpriteIntoBox } from './spriteGeometry.js';
import { drawFloorDetails } from './floorDetails.js';

export class SceneRenderer {
  constructor(canvas, explorationEngine, pauseManager, appearance, campaignState, onInteractPromptChange, onTriggerInteract, onPathError, onZoomChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.exploration = explorationEngine;
    this.pauseManager = pauseManager;
    this.appearance = appearance || { appearanceIndex: 0, outfitIndex: 0 };
    this.campaignState = campaignState;
    this.onInteractPromptChange = onInteractPromptChange;
    this.onTriggerInteract = onTriggerInteract;
    this.onPathError = onPathError;
    this.onZoomChange = onZoomChange;

    this.keys = new Set();
    this.rafId = null;
    this.resizeObserver = null;
    this.lastTs = performance.now();
    this.lastNearestId = null;
    this.debugMode = false;

    this.cssWidth = 800;
    this.cssHeight = 500;
    this.dpr = window.devicePixelRatio || 1;
    this.camera = { x: 0, y: 0, zoom: 1.5, userScale: 1.0 };

    this.ambientState = new Map();
    this.propBoundsCache = new Map();
    this.floorDetailCache = new WeakMap();

    this.images = {
      tiles: new Image(),
      tilesSrc: '',
      props: new Image(),
      player: new Image(),
      npcs: {},
    };
    this.images.props.src = '/assets/art/props/props_sheet.png';
    this.images.player.src = '/assets/art/characters/player/spritesheet.png';
    for (const key of ['kiani', 'nava', 'arman', 'arash']) {
      const img = new Image();
      img.src = `/assets/art/characters/npc/${key}/spritesheet.png`;
      this.images.npcs[key] = img;
    }

    const MOVE_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

    this._onKeyDown = (e) => {
      if (this.pauseManager?.state.isPaused) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'F9') {
        e.preventDefault();
        this.debugMode = !this.debugMode;
        return;
      }
      if (MOVE_CODES.has(e.code)) {
        this.keys.add(e.code);
        e.preventDefault();
      }
      if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) {
        e.preventDefault();
        this.onTriggerInteract?.();
      }
    };

    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };

    this._onBlur = () => {
      this.keys.clear();
    };

    this._onClick = (e) => {
      if (this.pauseManager?.state.isPaused) return;
      const rect = this.canvas.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      const worldX = cssX / this.camera.zoom + this.camera.x;
      const worldY = cssY / this.camera.zoom + this.camera.y;

      const res = this.exploration.setClickDestination(worldX, worldY);
      if (!res.ok && res.reason) {
        this.onPathError?.(res.reason);
      }
    };
  }

  setUserZoom(scale) {
    this.camera.userScale = Math.max(0.75, Math.min(2.0, scale));
    this.recomputeCameraZoom();
    this.onZoomChange?.(this.camera.userScale);
  }

  recomputeCameraZoom() {
    const scene = this.exploration.activeScene;
    if (!scene) return;
    const ts = scene.tileSize || TILE_SIZE;
    const minZoomX = this.cssWidth / (scene.width * ts);
    const minZoomY = this.cssHeight / (scene.height * ts);
    const baseZoom = Math.max(1.35, minZoomX, minZoomY);
    this.camera.zoom = Math.max(minZoomX, minZoomY, baseZoom * this.camera.userScale);
  }

  syncCanvasSize(entry = null) {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const cssW = Math.max(320, Math.round(entry ? entry.contentRect.width : parent.clientWidth));
    const cssH = Math.max(240, Math.round(entry ? entry.contentRect.height : parent.clientHeight));

    let devW;
    let devH;
    if (entry && entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize.length > 0) {
      devW = Math.max(1, Math.round(entry.devicePixelContentBoxSize[0].inlineSize));
      devH = Math.max(1, Math.round(entry.devicePixelContentBoxSize[0].blockSize));
    } else {
      const dpr = window.devicePixelRatio || 1;
      devW = Math.max(1, Math.round(cssW * dpr));
      devH = Math.max(1, Math.round(cssH * dpr));
    }

    this.cssWidth = cssW;
    this.cssHeight = cssH;
    this.dpr = devW / cssW;
    if (this.canvas.width !== devW || this.canvas.height !== devH) {
      this.canvas.width = devW;
      this.canvas.height = devH;
    }
    this.recomputeCameraZoom();
  }

  mount() {
    this.syncCanvasSize();
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) this.syncCanvasSize(entry);
      });
      try {
        this.resizeObserver.observe(this.canvas.parentElement, { box: 'device-pixel-content-box' });
      } catch {
        this.resizeObserver.observe(this.canvas.parentElement);
      }
    }
    this._onResize = () => this.syncCanvasSize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('click', this._onClick);
    this.lastTs = performance.now();

    const loop = (ts) => {
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      if (!this.pauseManager?.state.isPaused) {
        this.exploration.updateMovement(dt, this.keys, this.campaignState);
        this.updateAmbientStaff(dt);
        const nearest = this.exploration.getNearestInteractable(this.campaignState);
        const nid = nearest ? `${nearest.kind}:${nearest.item.id}:${nearest.enabled}` : null;
        if (nid !== this.lastNearestId) {
          this.lastNearestId = nid;
          this.onInteractPromptChange?.(nearest);
        }
      }
      this.updateCamera();
      this.draw(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  unmount() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('click', this._onClick);
  }

  updateAmbientStaff(dt) {
    const scene = this.exploration.activeScene;
    if (!scene) return;
    for (const amb of scene.ambientNpcs || []) {
      let st = this.ambientState.get(amb.id);
      if (!st) {
        st = { x: amb.x, y: amb.y, dir: amb.dir ?? 0, wpIdx: 0, timer: 0, col: 0 };
        this.ambientState.set(amb.id, st);
      }
      st.timer += dt;
      if (amb.activity === 'patrol' && Array.isArray(amb.route) && amb.route.length >= 2) {
        const target = amb.route[st.wpIdx];
        const dx = target.x - st.x;
        const dy = target.y - st.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.16) {
          st.wpIdx = (st.wpIdx + 1) % amb.route.length;
        } else {
          const spd = 3.2 * dt; // 16px tiles -> 2x tile/sec for same 51px/s world speed
          st.x += (dx / dist) * spd;
          st.y += (dy / dist) * spd;
          st.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
          st.col = 2 + (Math.floor(st.timer * 6) % 4);
        }
      } else if (amb.activity === 'typing') {
        st.col = Math.floor(st.timer * 3) % 2;
      } else {
        st.col = Math.floor(st.timer * 1.1) % 2;
      }
    }
  }

  updateCamera() {
    const scene = this.exploration.activeScene;
    if (!scene) return;
    const ts = scene.tileSize || TILE_SIZE;
    const worldW = scene.width * ts;
    const worldH = scene.height * ts;
    const viewW = this.cssWidth / this.camera.zoom;
    const viewH = this.cssHeight / this.camera.zoom;

    const targetX = this.exploration.player.x + 16 - viewW / 2;
    const targetY = this.exploration.player.y + 16 - viewH / 2;
    const maxX = Math.max(0, worldW - viewW);
    const maxY = Math.max(0, worldH - viewH);

    this.camera.x = Math.max(0, Math.min(maxX, targetX));
    this.camera.y = Math.max(0, Math.min(maxY, targetY));
  }

  _getFloorDetailLayer(scene, tileSize) {
    if (!scene || typeof scene !== 'object') return null;
    let cache = this.floorDetailCache.get(scene);
    if (!cache) {
      cache = new Map();
      this.floorDetailCache.set(scene, cache);
    }
    if (cache.has(tileSize)) return cache.get(tileSize);

    try {
      const layer = document.createElement('canvas');
      layer.width = scene.width * tileSize;
      layer.height = scene.height * tileSize;
      const layerCtx = layer.getContext('2d');
      if (!layerCtx) {
        cache.set(tileSize, null);
        return null;
      }
      layerCtx.imageSmoothingEnabled = false;
      drawFloorDetails(layerCtx, scene, tileSize);
      cache.set(tileSize, layer);
      return layer;
    } catch {
      cache.set(tileSize, null);
      return null;
    }
  }

  _getPropOpaqueBounds(col, row) {
    const key = `${col},${row}`;
    if (this.propBoundsCache.has(key)) return this.propBoundsCache.get(key);
    const image = this.images.props;
    if (!image?.complete || !image.naturalWidth) return { x: 0, y: 0, width: 64, height: 64 };

    try {
      const scratch = document.createElement('canvas');
      scratch.width = 64;
      scratch.height = 64;
      const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });
      scratchCtx.drawImage(image, col * 64, row * 64, 64, 64, 0, 0, 64, 64);
      const pixels = scratchCtx.getImageData(0, 0, 64, 64).data;
      const bounds = findOpaqueBounds(pixels, 64, 64, 8);
      this.propBoundsCache.set(key, bounds);
      return bounds;
    } catch {
      // Keep the atlas usable if a browser disables pixel readback.
      const fallback = { x: 0, y: 0, width: 64, height: 64 };
      this.propBoundsCache.set(key, fallback);
      return fallback;
    }
  }

  _drawContactShadow(ctx, cx, cy, rx = 10, ry = 4) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 18, 22, 0.34)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawLightPool(ctx, x, y, r, colorInner) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, colorInner);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  draw(tsMs) {
    const scene = this.exploration.activeScene;
    if (!scene) return;

    if (scene.tilesetPath && this.images.tilesSrc !== scene.tilesetPath) {
      this.images.tilesSrc = scene.tilesetPath;
      this.images.tiles.src = scene.tilesetPath;
    }

    const tileSize = scene.tileSize || TILE_SIZE;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    const fallbackFloor = scene.id === 'server_room_7' ? 0 : 3;

    // 1. Gridless 16x16 Base Floor Tiles
    if (this.images.tiles.complete) {
      for (let y = 0; y < scene.height; y++) {
        for (let x = 0; x < scene.width; x++) {
          const t = scene.grid[y][x];
          const baseTile = (isWallTile(t) || t === 5) ? fallbackFloor : t;
          ctx.drawImage(this.images.tiles, baseTile * tileSize, 0, tileSize, tileSize, x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    const floorDetailLayer = this._getFloorDetailLayer(scene, tileSize);
    if (floorDetailLayer) ctx.drawImage(floorDetailLayer, 0, 0);

    // 1b. Handcrafted Floor Accents (Atrium Ceremonial Rug)
    if (scene.id === 'cipher_hq') {
      ctx.save();
      const rugX = 28 * tileSize + 6;
      const rugY = 20 * tileSize + 6;
      const rugW = 16 * tileSize - 12;
      const rugH = 8 * tileSize - 12;
      ctx.fillStyle = 'rgba(19, 47, 48, 0.30)';
      ctx.fillRect(rugX + 4, rugY + 5, rugW, rugH);
      ctx.fillStyle = 'rgba(36, 91, 89, 0.52)';
      ctx.fillRect(rugX, rugY, rugW, rugH);
      ctx.fillStyle = 'rgba(49, 105, 99, 0.28)';
      ctx.fillRect(rugX + 5, rugY + 5, rugW - 10, rugH - 10);
      ctx.strokeStyle = 'rgba(198, 161, 91, 0.68)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rugX + 2, rugY + 2, rugW - 4, rugH - 4);
      ctx.strokeStyle = 'rgba(227, 199, 125, 0.34)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rugX + 7, rugY + 7, rugW - 14, rugH - 14);
      ctx.fillStyle = 'rgba(227, 199, 125, 0.58)';
      for (const [cx, cy] of [[rugX + 10, rugY + 10], [rugX + rugW - 10, rugY + 10], [rugX + 10, rugY + rugH - 10], [rugX + rugW - 10, rugY + rugH - 10]]) {
        ctx.fillRect(cx - 2, cy - 1, 4, 2);
        ctx.fillRect(cx - 1, cy - 2, 2, 4);
      }
      ctx.fillStyle = 'rgba(198, 161, 91, 0.22)';
      ctx.fillRect(rugX + Math.floor(rugW / 2) - 1, rugY + 12, 2, rugH - 24);
      ctx.restore();
    }


    // Floor lighting: render before architecture and actors so light stays on the ground.
    ctx.save();
    if (scene.id === 'cipher_hq') {
      this._drawLightPool(ctx, 41 * tileSize, 5 * tileSize, 130, 'rgba(230, 189, 120, 0.16)');
      this._drawLightPool(ctx, 35 * tileSize, 22 * tileSize, 170, 'rgba(230, 189, 120, 0.11)');
      this._drawLightPool(ctx, 11 * tileSize, 7 * tileSize, 140, 'rgba(57, 139, 130, 0.16)');
      this._drawLightPool(ctx, 59 * tileSize, 7 * tileSize, 140, 'rgba(167, 195, 186, 0.13)');
      this._drawLightPool(ctx, 58 * tileSize, 23 * tileSize, 120, 'rgba(230, 189, 120, 0.11)');
      this._drawLightPool(ctx, 24 * tileSize, 34 * tileSize, 130, 'rgba(230, 189, 120, 0.15)');
      this._drawLightPool(ctx, 60 * tileSize, 39 * tileSize, 130, 'rgba(230, 189, 120, 0.12)');
    } else if (scene.id === 'server_room_7') {
      this._drawLightPool(ctx, 23 * tileSize, 5 * tileSize, 150, 'rgba(57, 139, 130, 0.16)');
      this._drawLightPool(ctx, 16 * tileSize, 11 * tileSize, 100, 'rgba(230, 189, 120, 0.12)');
      this._drawLightPool(ctx, 23 * tileSize, 26 * tileSize, 95, 'rgba(198, 106, 76, 0.14)');
    }
    ctx.restore();

    // 1c. Background Wall Pass
    const p = this.exploration.player;
    const playerFootRow = Math.floor((p.y + 26) / tileSize);
    const fgWalls = [];

    for (let y = 0; y < scene.height; y++) {
      for (let x = 0; x < scene.width; x++) {
        const t = scene.grid[y][x];
        if (isWallTile(t)) {
          if (y > playerFootRow && y < scene.height - 1) {
            fgWalls.push({ x, y });
          } else {
            drawWallTile(ctx, scene.grid, x, y, scene.id, tsMs);
          }
        } else if (t === 5) {
          drawDoorFrame(ctx, scene.grid, x, y, scene.id);
        }
      }
    }

    // 2. Doors
    for (const door of scene.doors || []) {
      const st = this.exploration.doorStates[door.id] || door.initialState || 'open';
      const dx = door.x * tileSize;
      const dy = door.y * tileSize;
      if (st === 'closed' || st === 'locked') {
        if (this.images.props.complete) {
          const opaque = this._getPropOpaqueBounds(0, 2);
          const fitted = fitSpriteIntoBox(opaque, {
            centerX: dx + 16,
            bottomY: dy + 28,
            width: 40,
            height: 44,
          });
          if (fitted) {
            ctx.drawImage(
              this.images.props,
              fitted.sx,
              2 * 64 + fitted.sy,
              fitted.sw,
              fitted.sh,
              fitted.dx,
              fitted.dy,
              fitted.dw,
              fitted.dh
            );
          }
        }
        ctx.fillStyle = st === 'locked' ? '#B85C55' : '#D18A48';
        ctx.fillRect(dx + 12, dy + 4, 4, 4);
      } else {
        ctx.fillStyle = '#779B70';
        ctx.fillRect(dx + 12, dy + 2, 3, 3);
      }
    }

    // 3. A* Click-to-Move Path Preview
    if (this.exploration.activePath.length > 0) {
      ctx.save();
      for (const wp of this.exploration.activePath) {
        ctx.fillStyle = 'rgba(117, 184, 168, 0.48)';
        ctx.fillRect(wp.x * tileSize + 6, wp.y * tileSize + 6, 4, 4);
      }
      const goal = this.exploration.targetCell;
      if (goal) {
        ctx.strokeStyle = '#E3C77D';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(goal.x * tileSize + 1, goal.y * tileSize + 1, tileSize - 2, tileSize - 2);
      }
      ctx.restore();
    }

    // 4. Interactive Markers
    const nearest = this.exploration.getNearestInteractable(this.campaignState);
    for (const obj of scene.interactables || []) {
      const isNear = nearest?.kind === 'object' && nearest.item.id === obj.id;
      const inspected = this.campaignState?.inspectedObjectIds?.includes(obj.id);
      ctx.save();
      ctx.strokeStyle = isNear ? '#E3C77D' : inspected ? 'rgba(119,155,112,0.5)' : 'rgba(198,161,91,0.34)';
      ctx.lineWidth = isNear ? 2 : 1;
      ctx.strokeRect(obj.x * tileSize - 4, obj.y * tileSize - 4, 24, 24);
      ctx.restore();
    }

    // 5. Y-Sorted Renderables (Props + Story NPCs + Ambient Staff + Player)
    const renderList = [];
    for (const pr of scene.props || []) {
      renderList.push({ kind: 'prop', sortY: pr.y * tileSize + tileSize, pr });
    }
    const npcIdleCol = Math.floor(tsMs / 900) % 2;
    for (const npc of scene.npcs || []) {
      renderList.push({ kind: 'npc', sortY: npc.y * tileSize + tileSize + 10, npc });
    }
    for (const amb of scene.ambientNpcs || []) {
      const st = this.ambientState.get(amb.id) || { x: amb.x, y: amb.y, dir: amb.dir ?? 0, col: 0 };
      renderList.push({ kind: 'ambient', sortY: st.y * tileSize + tileSize + 10, amb, st });
    }
    renderList.push({ kind: 'player', sortY: p.y + 30 });
    renderList.sort((a, b) => a.sortY - b.sortY);

    for (const item of renderList) {
      if (item.kind === 'prop' && this.images.props.complete) {
        const { prop, x, y, w, h } = item.pr;
        const dx = Math.round(x * tileSize + (tileSize - w) / 2);
        const dy = Math.round(y * tileSize + (tileSize - h));
        const opaque = this._getPropOpaqueBounds(prop[0], prop[1]);
        const fitted = fitSpriteIntoBox(opaque, {
          centerX: dx + w / 2,
          bottomY: dy + h,
          width: w,
          height: h,
        });
        if (fitted) {
          ctx.drawImage(
            this.images.props,
            prop[0] * 64 + fitted.sx,
            prop[1] * 64 + fitted.sy,
            fitted.sw,
            fitted.sh,
            fitted.dx,
            fitted.dy,
            fitted.dw,
            fitted.dh
          );
        }
        if (((prop[0] === 3 || prop[0] === 4) && prop[1] === 1 || (prop[0] === 0 && prop[1] === 5) || (prop[0] === 1 && prop[1] === 8)) && ((Math.round(x + y) + Math.floor(tsMs / 400)) % 3 === 0)) {
          ctx.fillStyle = Math.round(x) % 2 === 0 ? '#779B70' : '#D18A48';
          ctx.fillRect(dx + 14, dy + 16 + (Math.round(x * 7) % 20), 2, 2);
        } else if (prop[0] === 5 && prop[1] === 1) {
          const spin = Math.floor(tsMs / 140) % 2;
          ctx.fillStyle = '#75B8A8';
          if (spin === 0) ctx.fillRect(dx + 17, dy + 19, 12, 2);
          else ctx.fillRect(dx + 22, dy + 14, 2, 12);
        } else if (prop[0] === 2 && prop[1] === 4) {
          const pxOff = (Math.floor(tsMs / 250) % 16);
          ctx.fillStyle = '#E3C77D';
          ctx.fillRect(dx + 10 + pxOff, dy + 16, 4, 2);
        } else if (prop[0] === 0 && prop[1] === 8) {
          const pulse = Math.floor(tsMs / 300) % 3;
          ctx.fillStyle = pulse === 0 ? '#E6BD78' : '#398B82';
          ctx.fillRect(dx + 28, dy + 22, 8, 2);
        }
      } else if (item.kind === 'npc') {
        const npc = item.npc;
        const img = this.images.npcs[npc.npcKey];
        const nx = Math.round(npc.x * tileSize + tileSize / 2 - 16);
        const ny = Math.round(npc.y * tileSize + tileSize / 2 - 26);
        this._drawContactShadow(ctx, nx + 16, ny + 29, 10, 4);
        if (img && img.complete) {
          ctx.drawImage(img, npcIdleCol * 32, (npc.dir ?? 0) * 48, 32, 48, nx, ny - 16, 32, 48);
        }
      } else if (item.kind === 'ambient') {
        const { amb, st } = item;
        const img = this.images.npcs[amb.npcKey];
        const ax = Math.round(st.x * tileSize + tileSize / 2 - 16);
        const ay = Math.round(st.y * tileSize + tileSize / 2 - 26);
        this._drawContactShadow(ctx, ax + 16, ay + 29, 9, 3.5);
        if (img && img.complete) {
          ctx.save();
          ctx.globalAlpha = 0.90;
          ctx.drawImage(img, st.col * 32, st.dir * 48, 32, 48, ax, ay - 16, 32, 48);
          ctx.restore();
        }
      } else if (item.kind === 'player' && this.images.player.complete) {
        this._drawContactShadow(ctx, Math.round(p.x + 16), Math.round(p.y + 29), 10, 4);
        const vIdx = (this.appearance.appearanceIndex || 0) * 4 + (this.appearance.outfitIndex || 0);
        const sy = (vIdx * 4 + p.dir) * 48;
        const sx = p.col * 32;
        ctx.drawImage(this.images.player, sx, sy, 32, 48, Math.round(p.x), Math.round(p.y - 16), 32, 48);
      }
    }

    // 5b. Foreground Wall Occlusion & Proximity Cutaway
    for (const fw of fgWalls) {
      const dist = Math.hypot(fw.x * tileSize + tileSize / 2 - (p.x + 16), fw.y * tileSize - (p.y + 26));
      ctx.save();
      if (dist < 48) ctx.globalAlpha = 0.45;
      drawWallTile(ctx, scene.grid, fw.x, fw.y, scene.id, tsMs);
      ctx.restore();
    }

    // 6. Labels ONLY for Story NPCs + Floating [E] Prompt
    ctx.font = 'bold 10px CipherBody, sans-serif';
    ctx.textAlign = 'center';
    for (const npc of scene.npcs || []) {
      const lx = npc.x * tileSize + tileSize / 2;
      const ly = npc.y * tileSize - 38;
      ctx.fillStyle = 'rgba(23, 27, 32, 0.88)';
      ctx.fillRect(lx - 36, ly - 10, 72, 13);
      ctx.strokeStyle = 'rgba(198, 161, 91, 0.55)';
      ctx.strokeRect(lx - 36, ly - 10, 72, 13);
      ctx.fillStyle = '#E3C77D';
      ctx.fillText(npc.name, lx, ly);
    }

    if (nearest) {
      const ix = nearest.item.x * tileSize + tileSize / 2;
      const iy = nearest.item.y * tileSize - 34;
      const label = nearest.enabled ? `[E] ${nearest.item.label || nearest.item.name}` : `[قفل] ${nearest.item.label || nearest.item.name}`;
      const w = Math.max(96, label.length * 6.5);
      ctx.fillStyle = 'rgba(23, 27, 32, 0.94)';
      ctx.fillRect(ix - w / 2, iy - 11, w, 15);
      ctx.strokeStyle = nearest.enabled ? '#E3C77D' : '#B85C55';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(ix - w / 2, iy - 11, w, 15);
      ctx.fillStyle = '#E8E1D3';
      ctx.fillText(label, ix, iy);
    }

    // F9 Debug Overlay: 16x16 NavGrid + Explicit Prop Collision Footprints
    if (this.debugMode && this.exploration.navGrid) {
      const ng = this.exploration.navGrid;
      for (let y = 0; y < ng.height; y++) {
        for (let x = 0; x < ng.width; x++) {
          ctx.fillStyle = ng.walkable[y][x] ? 'rgba(119, 155, 112, 0.14)' : 'rgba(184, 92, 85, 0.22)';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
        }
      }
      ctx.strokeStyle = '#E3C77D';
      ctx.lineWidth = 1;
      for (const pr of scene.props || []) {
        if (!pr.solid) continue;
        const box = getPropCollisionBox(pr, tileSize);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
      }
    }

    ctx.restore();
  }
}

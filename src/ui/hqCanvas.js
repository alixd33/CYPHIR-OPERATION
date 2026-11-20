import { TERMS } from '../domain/terminology.js';

/**
 * 2D Pixel Art CIPHER Headquarters (Top-Down Interactive Facility)
 * 24x15 grid of 32x32 tiles = 768x480 canvas.
 * Includes 9 distinct interactive rooms, animated player & NPCs, lighting, and keyboard/mouse controls.
 */

export const HQ_ROOMS = [
  {
    id: 'operations',
    name: TERMS.LOCATIONS.operations,
    desc: 'مرکز فرماندهی و اجرای مراحل عملیات فعلی.',
    x: 1, y: 1, w: 6, h: 4,
    doorX: 4, doorY: 5,
    actionLabel: 'ورود به عملیات',
  },
  {
    id: 'evidence',
    name: TERMS.LOCATIONS.evidence,
    desc: 'تخته شواهد فیزیکی و تحلیل ارتباط میان مدارک و فرضیه‌ها.',
    x: 8, y: 1, w: 7, h: 4,
    doorX: 11, doorY: 5,
    actionLabel: 'گشودن تخته شواهد',
  },
  {
    id: 'director',
    name: TERMS.LOCATIONS.director,
    desc: 'دفتر مدیر کیانی برای دریافت گزارش‌ها و توجیه ماموریت.',
    x: 16, y: 1, w: 7, h: 4,
    doorX: 19, doorY: 5,
    actionLabel: 'مشاهده توجیه مدیر',
  },
  {
    id: 'lab',
    name: TERMS.LOCATIONS.lab,
    desc: 'آزمایشگاه دیجیتال برای بررسی سیگنال‌ها و داده‌های سرور 7.',
    x: 1, y: 9, w: 6, h: 5,
    doorX: 4, doorY: 8,
    actionLabel: 'بررسی آزمایشگاه',
  },
  {
    id: 'analysis',
    name: TERMS.LOCATIONS.analysis,
    desc: 'اتاق تحلیل ریاضی و مرور تاریخچه یادگیری.',
    x: 8, y: 9, w: 4, h: 5,
    doorX: 10, doorY: 8,
    actionLabel: 'مشاهده آمار تحلیل',
  },
  {
    id: 'team',
    name: TERMS.LOCATIONS.team,
    desc: 'مدیریت اعضای تیم، تخصص‌ها و ترکیب هم‌افزایی.',
    x: 13, y: 9, w: 5, h: 5,
    doorX: 15, doorY: 8,
    actionLabel: 'مدیریت تیم',
  },
  {
    id: 'archive',
    name: TERMS.LOCATIONS.archive,
    desc: 'بایگانی پرونده‌های طبقه‌بندی‌شده و مدارک آزادشده.',
    x: 19, y: 9, w: 4, h: 2,
    doorX: 19, doorY: 8,
    actionLabel: 'گشودن بایگانی',
  },
  {
    id: 'equipment',
    name: TERMS.LOCATIONS.equipment,
    desc: 'تجهیزات کمکی، ابزارهای تحلیل و مدیریت ذخیره‌ها.',
    x: 19, y: 12, w: 4, h: 2,
    doorX: 18, doorY: 12,
    actionLabel: 'ذخیره و تجهیزات',
  },
  {
    id: 'rest',
    name: TERMS.LOCATIONS.rest,
    desc: 'فضای استراحت برای کاهش خستگی و فشار روانی تیم.',
    x: 1, y: 6, w: 2, h: 2,
    doorX: 3, doorY: 6,
    actionLabel: 'استراحت تیم',
  },
];

// Tile indices matching hq_tileset.png:
// 0:charcoal, 1:olive carpet, 2:wood, 3:tech floor, 4:wall, 5:door, 6:ops desk,
// 7:corkboard, 8:server, 9:bookshelf, 10:director desk, 11:coffee, 12:plant,
// 13:locker, 14:lab table, 15:sofa
function buildMapGrid() {
  const W = 24, H = 15;
  const g = Array.from({ length: H }, () => Array(W).fill(0));

  // Outer walls
  for (let x = 0; x < W; x++) { g[0][x] = 4; g[H - 1][x] = 4; }
  for (let y = 0; y < H; y++) { g[y][0] = 4; g[y][W - 1] = 4; }

  // Room dividing walls (row 5 and row 8)
  for (let x = 1; x < W - 1; x++) {
    g[5][x] = 4;
    g[8][x] = 4;
  }
  for (let y = 1; y < 5; y++) { g[y][7] = 4; g[y][15] = 4; }
  for (let y = 9; y < 14; y++) { g[y][7] = 4; g[y][12] = 4; g[y][18] = 4; }
  g[11][19] = 4; g[11][20] = 4; g[11][21] = 4; g[11][22] = 4;

  // Doors
  g[5][4] = 5; g[5][11] = 5; g[5][19] = 5;
  g[8][4] = 5; g[8][10] = 5; g[8][15] = 5; g[8][19] = 5;
  g[12][18] = 5;

  // Room Floors & Furniture
  // Operations (1..6, 1..4)
  for (let y = 1; y <= 4; y++) for (let x = 1; x <= 6; x++) g[y][x] = 3;
  g[2][2] = 6; g[2][5] = 6; g[1][6] = 8;

  // Evidence (8..14, 1..4)
  for (let y = 1; y <= 4; y++) for (let x = 8; x <= 14; x++) g[y][x] = 2;
  g[1][10] = 7; g[1][11] = 7; g[1][12] = 7; g[3][9] = 12;

  // Director (16..22, 1..4)
  for (let y = 1; y <= 4; y++) for (let x = 16; x <= 22; x++) g[y][x] = 1;
  g[2][19] = 10; g[1][22] = 9; g[4][16] = 12;

  // Rest corner (1..2, 6..7)
  g[6][1] = 11; g[7][1] = 15; g[6][2] = 2; g[7][2] = 2;
  g[6][22] = 12; g[7][22] = 12;

  // Lab (1..6, 9..13)
  for (let y = 9; y <= 13; y++) for (let x = 1; x <= 6; x++) g[y][x] = 3;
  g[10][2] = 8; g[10][3] = 8; g[11][5] = 14;

  // Analysis (8..11, 9..13)
  for (let y = 9; y <= 13; y++) for (let x = 8; x <= 11; x++) g[y][x] = 0;
  g[11][9] = 6; g[11][10] = 6;

  // Team (13..17, 9..13)
  for (let y = 9; y <= 13; y++) for (let x = 13; x <= 17; x++) g[y][x] = 1;
  g[11][14] = 15; g[11][16] = 6;

  // Archive (19..22, 9..10)
  for (let y = 9; y <= 10; y++) for (let x = 19; x <= 22; x++) g[y][x] = 2;
  g[9][21] = 9; g[9][22] = 9;

  // Equipment (19..22, 12..13)
  for (let y = 12; y <= 13; y++) for (let x = 19; x <= 22; x++) g[y][x] = 0;
  g[13][21] = 13; g[13][22] = 13;

  return g;
}

const SOLID_TILES = new Set([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

export class HQCanvasController {
  constructor(canvas, appearance, onRoomSelect, onRoomEnter, sound) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.appearance = appearance || { appearanceIndex: 0, outfitIndex: 0 };
    this.onRoomSelect = onRoomSelect;
    this.onRoomEnter = onRoomEnter;
    this.sound = sound;

    this.grid = buildMapGrid();
    this.player = {
      x: 11 * 32,
      y: 6.5 * 32,
      dir: 0, // 0:down, 1:up, 2:left, 3:right
      frame: 0,
      animTimer: 0,
      targetX: null,
      targetY: null,
    };

    this.npcs = [
      { idx: 0, x: 19 * 32, y: 1.5 * 32, label: 'مدیر کیانی' },
      { idx: 1, x: 9 * 32, y: 10 * 32, label: 'ناوا' },
      { idx: 2, x: 4 * 32, y: 11 * 32, label: 'آرش' },
      { idx: 3, x: 11 * 32, y: 2.5 * 32, label: 'سارا' },
      { idx: 4, x: 15 * 32, y: 10.5 * 32, label: 'آرمان' },
    ];

    this.keys = new Set();
    this.activeRoom = null;
    this.rafId = null;
    this.lastTs = performance.now();

    this.images = {
      tiles: new Image(),
      player: new Image(),
      npc: new Image(),
    };
    this.images.tiles.src = '/assets/pixelart/hq_tileset.png';
    this.images.player.src = '/assets/pixelart/player_sheet.png';
    this.images.npc.src = '/assets/pixelart/npc_sheet.png';

    this._onKeyDown = (e) => this.handleKey(e, true);
    this._onKeyUp = (e) => this.handleKey(e, false);
    this._onClick = (e) => this.handleClick(e);
  }

  mount() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('click', this._onClick);
    this.lastTs = performance.now();
    const loop = (ts) => {
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt, ts);
      this.draw(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  unmount() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('click', this._onClick);
  }

  handleKey(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      if (down) {
        this.keys.add(k);
        this.player.targetX = null;
        this.player.targetY = null;
      } else {
        this.keys.delete(k);
      }
      e.preventDefault();
    }
    if (down && (k === 'e' || k === 'enter') && this.activeRoom) {
      this.sound?.play('door');
      this.onRoomEnter(this.activeRoom);
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const tx = Math.floor(cx / 32);
    const ty = Math.floor(cy / 32);

    // Check if user clicked inside a room
    const clickedRoom = HQ_ROOMS.find(
      (r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
    );
    if (clickedRoom) {
      this.moveToRoom(clickedRoom, false);
    } else {
      this.player.targetX = Math.max(32, Math.min(22 * 32, cx - 16));
      this.player.targetY = Math.max(32, Math.min(13 * 32, cy - 16));
    }
  }

  moveToRoom(room, immediateEnter = false) {
    this.player.targetX = room.doorX * 32;
    this.player.targetY = room.doorY * 32;
    this.activeRoom = room;
    this.onRoomSelect(room);
    if (immediateEnter) {
      this.sound?.play('door');
      this.onRoomEnter(room);
    }
  }

  canWalkAt(px, py) {
    const corners = [
      [px + 6, py + 14],
      [px + 25, py + 14],
      [px + 6, py + 29],
      [px + 25, py + 29],
    ];
    for (const [cx, cy] of corners) {
      const gx = Math.floor(cx / 32);
      const gy = Math.floor(cy / 32);
      if (gy < 0 || gy >= 15 || gx < 0 || gx >= 24) return false;
      if (SOLID_TILES.has(this.grid[gy][gx])) return false;
    }
    return true;
  }

  update(dt) {
    let dx = 0, dy = 0;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;
    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;

    const speed = 135;
    if (dx === 0 && dy === 0 && this.player.targetX !== null) {
      const tdx = this.player.targetX - this.player.x;
      const tdy = this.player.targetY - this.player.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist > 4) {
        dx = tdx / dist;
        dy = tdy / dist;
      } else {
        this.player.targetX = null;
        this.player.targetY = null;
      }
    }

    const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    if (moving) {
      if (Math.abs(dx) > Math.abs(dy)) this.player.dir = dx < 0 ? 2 : 3;
      else this.player.dir = dy < 0 ? 1 : 0;

      const nx = this.player.x + dx * speed * dt;
      const ny = this.player.y + dy * speed * dt;
      if (this.canWalkAt(nx, this.player.y)) this.player.x = nx;
      if (this.canWalkAt(this.player.x, ny)) this.player.y = ny;

      this.player.animTimer += dt;
      if (this.player.animTimer > 0.16) {
        this.player.animTimer = 0;
        this.player.frame = this.player.frame === 1 ? 2 : 1;
      }
    } else {
      this.player.frame = 0;
    }

    // Detect nearby room door or inside room
    const px = Math.floor((this.player.x + 16) / 32);
    const py = Math.floor((this.player.y + 16) / 32);
    let nearest = null;
    for (const r of HQ_ROOMS) {
      const nearDoor = Math.abs(px - r.doorX) <= 1 && Math.abs(py - r.doorY) <= 1;
      const inside = px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
      if (nearDoor || inside) {
        nearest = r;
        break;
      }
    }
    if (nearest?.id !== this.activeRoom?.id) {
      this.activeRoom = nearest;
      this.onRoomSelect(nearest);
    }
  }

  draw(ts) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 768, 480);

    // 1. Tiles
    if (this.images.tiles.complete) {
      for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 24; x++) {
          const t = this.grid[y][x];
          ctx.drawImage(this.images.tiles, t * 32, 0, 32, 32, x * 32, y * 32, 32, 32);
        }
      }
    }

    // 2. Highlight active room
    if (this.activeRoom) {
      const r = this.activeRoom;
      ctx.save();
      ctx.strokeStyle = '#C8995F';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x * 32 + 1, r.y * 32 + 1, r.w * 32 - 2, r.h * 32 - 2);
      ctx.restore();
    }

    // 3. NPCs (idle bob every 700ms)
    const npcFrame = Math.floor(ts / 700) % 2;
    if (this.images.npc.complete) {
      for (const n of this.npcs) {
        ctx.drawImage(this.images.npc, npcFrame * 32, n.idx * 32, 32, 32, n.x, n.y, 32, 32);
      }
    }

    // 4. Player
    if (this.images.player.complete) {
      const variantIdx = (this.appearance.appearanceIndex || 0) * 3 + (this.appearance.outfitIndex || 0);
      const sy = (variantIdx * 4 + this.player.dir) * 32;
      const sx = this.player.frame * 32;
      ctx.drawImage(this.images.player, sx, sy, 32, 32, Math.round(this.player.x), Math.round(this.player.y), 32, 32);
    }

    // 5. Subtle warm ambient lighting pools & room labels
    ctx.save();
    ctx.font = 'bold 11px CipherBody, sans-serif';
    ctx.textAlign = 'center';
    for (const r of HQ_ROOMS) {
      const lx = (r.x + r.w / 2) * 32;
      const ly = r.y * 32 + 14;
      ctx.fillStyle = 'rgba(18, 20, 24, 0.78)';
      ctx.fillRect(lx - 44, ly - 10, 88, 15);
      ctx.fillStyle = this.activeRoom?.id === r.id ? '#E8E5DC' : '#C8995F';
      ctx.fillText(r.name, lx, ly + 1);
    }
    ctx.restore();
  }
}

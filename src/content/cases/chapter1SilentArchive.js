import { NPC_ROSTER } from '../characters/roster.js';
import { TILE_SIZE } from '../../domain/worldConfig.js';

/**
 * Chapter 1 CasePack: SILENT ARCHIVE — Geneva Server Room 7 (v2.2.8 — 16x16 Tile Migration)
 * 72x48 Multi-Wing CIPHER HQ + 48x30 Server Room 7 (preserving 1152x768 and 768x480 world pixels)
 * High visual density using 128-prop volumetric 2.5D library + separated ground footprints.
 */

function buildCipherHqGrid() {
  const W = 72, H = 48;
  const g = Array.from({ length: H }, () => Array(W).fill(3)); // Corridor terrazzo (3)
  for (let x = 0; x < W; x++) { g[0][x] = 4; g[H - 1][x] = 4; }
  for (let y = 0; y < H; y++) { g[y][0] = 4; g[y][W - 1] = 4; }

  // Exterior Windows (8) & Wall Monitors (10)
  for (const wx of [6, 14, 30, 42, 56, 64]) g[0][wx] = 8;
  for (const mx of [10, 26, 38, 52, 60]) g[0][mx] = 10;

  // A. Central Atrium (x: 26..45, y: 16..31)
  for (let y = 16; y <= 31; y++) for (let x = 26; x <= 45; x++) g[y][x] = 13;

  // B. Executive Wing (North: x: 24..47, y: 1..13)
  for (let y = 1; y <= 13; y++) for (let x = 24; x <= 34; x++) g[y][x] = 1;
  for (let y = 1; y <= 13; y++) for (let x = 35; x <= 47; x++) g[y][x] = 1;
  for (let x = 23; x <= 48; x++) g[14][x] = 11; // Executive Wood-Gold Wall
  for (let y = 1; y <= 13; y++) { g[y][23] = 4; g[y][34] = 11; g[y][48] = 4; }
  g[14][30] = 5; g[14][31] = 5;
  g[14][40] = 5; g[14][41] = 5;
  g[8][34] = 5; g[9][34] = 5;

  // C. Operations Wing (West: x: 1..21, y: 1..27) - Operations Wall (14)
  for (let y = 1; y <= 15; y++) for (let x = 1; x <= 21; x++) g[y][x] = 0; // Operations Room
  for (let y = 17; y <= 27; y++) for (let x = 1; x <= 21; x++) g[y][x] = 0; // Briefing/Planning
  for (let x = 1; x <= 22; x++) { g[16][x] = 6; g[28][x] = 14; }
  for (let y = 1; y <= 27; y++) g[y][22] = 6;
  g[16][10] = 5; g[16][11] = 5;
  g[8][22] = 5; g[9][22] = 5;
  g[22][22] = 5; g[23][22] = 5;
  g[28][10] = 5; g[28][11] = 5;

  // D. Surveillance & Monitoring Wing (East: x: 49..70, y: 1..31)
  for (let y = 1; y <= 15; y++) for (let x = 49; x <= 70; x++) g[y][x] = 0; // Monitoring Room 1
  for (let y = 17; y <= 31; y++) for (let x = 49; x <= 70; x++) g[y][x] = 2; // Monitoring Room 2 (Comms)
  for (let y = 1; y <= 31; y++) g[y][48] = 12;
  for (let x = 49; x <= 70; x++) { g[16][x] = 12; g[32][x] = 12; }
  g[8][48] = 5; g[9][48] = 5;
  g[24][48] = 5; g[25][48] = 5;
  g[16][58] = 5; g[16][59] = 5;
  g[32][58] = 5; g[32][59] = 5;

  // E. Intelligence & Evidence Wing (South-West: x: 1..33, y: 31..46)
  for (let y = 31; y <= 46; y++) for (let x = 1; x <= 13; x++) g[y][x] = 7; // Lab
  for (let y = 31; y <= 46; y++) for (let x = 15; x <= 33; x++) g[y][x] = 2; // Evidence Room
  for (let y = 31; y <= 46; y++) { g[y][14] = 4; g[y][34] = 6; }
  for (let x = 15; x <= 34; x++) g[30][x] = 6;
  g[30][24] = 5; g[30][25] = 5;
  g[38][14] = 5; g[39][14] = 5;
  g[38][34] = 5; g[39][34] = 5;

  // F. Personnel & Break Wing (South-East: x: 35..70, y: 33..46)
  for (let y = 33; y <= 46; y++) for (let x = 35; x <= 49; x++) g[y][x] = 1; // Personnel & Security
  for (let y = 33; y <= 46; y++) for (let x = 51; x <= 70; x++) g[y][x] = 2; // Break Room
  for (let y = 33; y <= 46; y++) g[y][50] = 15; // Painted divider
  for (let x = 35; x <= 50; x++) g[32][x] = 6;
  g[32][42] = 5; g[32][43] = 5;
  g[38][50] = 5; g[39][50] = 5;

  return g;
}

function buildServerRoom7Grid() {
  const W = 48, H = 30;
  const g = Array.from({ length: H }, () => Array(W).fill(0));

  // Outer concrete shell. The four-cell south opening is the scene transfer door.
  for (let x = 0; x < W; x++) { g[0][x] = 4; g[H - 1][x] = 4; }
  for (let y = 0; y < H; y++) { g[y][0] = 4; g[y][W - 1] = 4; }

  // Distinct floor materials: west equipment bay, east equipment bay, and
  // a continuous central service aisle with a broad east-west cross aisle.
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x <= 20; x++) g[y][x] = 1;
    for (let x = 27; x < W - 1; x++) g[y][x] = 2;
    for (let x = 21; x <= 26; x++) g[y][x] = 3;
  }
  for (let y = 12; y <= 16; y++) {
    for (let x = 1; x < W - 1; x++) g[y][x] = 3;
  }

  // Door threshold in the southern wall.
  for (let x = 22; x <= 25; x++) g[H - 1][x] = 5;
  return g;
}

export const CHAPTER_1_CASE = {
  id: 'case-ch1-silent-archive',
  chapterNumber: 1,
  title: 'فصل 1: درز اطلاعاتی ژنو — اتاق سرور 7',
  scenes: {
    cipher_hq: {
      id: 'cipher_hq',
      name: 'مقر مرکزی CIPHER — ژنو',
      sectionName: 'آتریوم مرکزی، بال عملیات، نظارت و تحلیل',
      tilesetPath: '/assets/art/tilesets/cipher-hq/tileset.png',
      width: 72,
      height: 48,
      tileSize: TILE_SIZE,
      grid: buildCipherHqGrid(),
      solidTiles: [4, 6, 8, 9, 10, 11, 12, 14, 15, 16],
      spawn: { x: 34 * 16, y: 24 * 16, dir: 0 },
      doors: [
        { id: 'door-hq-exec', x: 40, y: 14, widthTiles: 2, label: 'در دفتر مدیر', initialState: 'open', interactive: true },
        { id: 'door-hq-meet', x: 30, y: 14, widthTiles: 2, label: 'در اتاق جلسه', initialState: 'open', interactive: true },
        { id: 'door-hq-ops', x: 22, y: 8, heightTiles: 2, label: 'در بال عملیات', initialState: 'open', interactive: true },
        { id: 'door-hq-brief', x: 22, y: 22, heightTiles: 2, label: 'در اتاق توجیه', initialState: 'open', interactive: true },
        { id: 'door-hq-mon1', x: 48, y: 8, heightTiles: 2, label: 'در اتاق مانیتورینگ 1', initialState: 'open', interactive: true },
        { id: 'door-hq-mon2', x: 48, y: 24, heightTiles: 2, label: 'در اتاق مانیتورینگ 2', initialState: 'open', interactive: true },
        { id: 'door-hq-ev', x: 24, y: 30, widthTiles: 2, label: 'در اتاق شواهد', initialState: 'open', interactive: true },
        { id: 'door-hq-sec', x: 42, y: 32, widthTiles: 2, label: 'در بخش امنیت', initialState: 'open', interactive: true },
      ],
      props: [
        // A. Central Atrium & Reception (x: 26..45, y: 16..31)
        { id: 'atr-rec', prop: [6, 0], x: 35.0, y: 19.0, w: 64, h: 50, solid: true, footprint: { w: 52, h: 16 } },
        { id: 'atr-crest', prop: [2, 5], x: 35.0, y: 14.5, w: 50, h: 38, solid: false },
        { id: 'atr-ch', prop: [1, 0], x: 35.0, y: 17.2, w: 36, h: 38, solid: false },
        { id: 'atr-sofa1', prop: [1, 2], x: 28.0, y: 27.0, w: 60, h: 44, solid: true, footprint: { w: 48, h: 16 } },
        { id: 'atr-sofa2', prop: [1, 2], x: 41.0, y: 27.0, w: 60, h: 44, solid: true, footprint: { w: 48, h: 16 } },
        { id: 'atr-side1', prop: [1, 9], x: 31.2, y: 27.2, w: 30, h: 30, solid: false },
        { id: 'atr-lamp1', prop: [0, 12], x: 26.8, y: 26.8, w: 28, h: 44, solid: false },
        { id: 'atr-palm1', prop: [2, 7], x: 26.8, y: 16.8, w: 46, h: 52, solid: false },
        { id: 'atr-palm2', prop: [2, 7], x: 43.2, y: 16.8, w: 46, h: 52, solid: false },
        { id: 'atr-badge', prop: [4, 6], x: 26.6, y: 21.2, w: 38, h: 42, solid: false },
        { id: 'atr-totem', prop: [1, 15], x: 43.8, y: 21.2, w: 38, h: 46, solid: true, footprint: { w: 24, h: 14 } },
        { id: 'atr-sconce1', prop: [2, 6], x: 26.4, y: 14.0, w: 28, h: 30, solid: false },
        { id: 'atr-sconce2', prop: [2, 6], x: 44.0, y: 14.0, w: 28, h: 30, solid: false },
        { id: 'atr-dome', prop: [0, 4], x: 35.0, y: 23.0, w: 28, h: 28, solid: false },

        // B. Executive Wing (Director Office & Executive Meeting Room)
        { id: 'exec-desk', prop: [0, 0], x: 41.0, y: 5.0, w: 60, h: 50, solid: true, footprint: { w: 48, h: 16 } },
        { id: 'exec-files', prop: [1, 7], x: 43.2, y: 4.6, w: 34, h: 30, solid: false },
        { id: 'exec-lamp', prop: [1, 12], x: 39.2, y: 4.4, w: 26, h: 26, solid: false },
        { id: 'exec-ch', prop: [1, 0], x: 41.0, y: 7.0, w: 38, h: 42, solid: false },
        { id: 'exec-gch1', prop: [2, 9], x: 39.2, y: 7.8, w: 28, h: 32, solid: false },
        { id: 'exec-gch2', prop: [2, 9], x: 42.8, y: 7.8, w: 28, h: 32, solid: false },
        { id: 'exec-sofa', prop: [1, 5], x: 37.2, y: 10.0, w: 56, h: 44, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'exec-ctbl', prop: [5, 7], x: 43.6, y: 10.4, w: 48, h: 38, solid: false },
        { id: 'exec-shelf', prop: [7, 1], x: 45.2, y: 2.2, w: 48, h: 50, solid: true, footprint: { w: 36, h: 14 } },
        { id: 'exec-cab', prop: [0, 1], x: 36.4, y: 2.2, w: 40, h: 46, solid: true, footprint: { w: 26, h: 14 } },
        { id: 'exec-safe', prop: [1, 10], x: 46.2, y: 10.2, w: 38, h: 44, solid: true, footprint: { w: 26, h: 14 } },
        { id: 'exec-plant', prop: [2, 7], x: 46.0, y: 4.8, w: 40, h: 48, solid: false },
        { id: 'exec-portrait', prop: [3, 12], x: 41.0, y: 0.8, w: 32, h: 28, solid: false },
        { id: 'meet-tbl', prop: [3, 4], x: 28.6, y: 6.2, w: 64, h: 52, solid: true, footprint: { w: 50, h: 18 } },
        { id: 'meet-kit', prop: [1, 6], x: 28.6, y: 6.0, w: 46, h: 34, solid: false },
        { id: 'meet-ch1', prop: [2, 9], x: 26.2, y: 6.2, w: 28, h: 32, solid: false },
        { id: 'meet-ch2', prop: [2, 9], x: 31.2, y: 6.2, w: 28, h: 32, solid: false },
        { id: 'meet-wb', prop: [7, 4], x: 28.6, y: 2.0, w: 54, h: 42, solid: true, footprint: { w: 42, h: 12 } },
        { id: 'meet-sconce', prop: [2, 6], x: 24.4, y: 2.0, w: 28, h: 30, solid: false },

        // C. Operations Wing (Visual Benchmark Room + Briefing Room)
        { id: 'ops-brief', prop: [0, 8], x: 11.0, y: 7.2, w: 66, h: 52, solid: true, footprint: { w: 52, h: 18 } },
        { id: 'ops-vw', prop: [2, 4], x: 11.0, y: 2.0, w: 64, h: 48, solid: true, footprint: { w: 52, h: 14 } },
        { id: 'ops-pc1', prop: [3, 5], x: 4.4, y: 4.4, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'ops-pc2', prop: [3, 5], x: 17.0, y: 4.4, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'ops-pc3', prop: [2, 0], x: 11.0, y: 12.6, w: 56, h: 46, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'ops-ch1', prop: [1, 0], x: 4.4, y: 6.2, w: 32, h: 36, solid: false },
        { id: 'ops-ch2', prop: [1, 0], x: 17.0, y: 6.2, w: 32, h: 36, solid: false },
        { id: 'ops-panel', prop: [0, 15], x: 18.8, y: 2.2, w: 42, h: 42, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'ops-logger', prop: [7, 15], x: 2.6, y: 9.2, w: 40, h: 44, solid: true, footprint: { w: 26, h: 14 } },
        { id: 'ops-print', prop: [7, 0], x: 3.0, y: 12.4, w: 44, h: 42, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'ops-bin', prop: [0, 13], x: 19.8, y: 12.8, w: 24, h: 28, solid: false },
        { id: 'ops-plant', prop: [3, 2], x: 2.6, y: 2.4, w: 38, h: 44, solid: false },
        { id: 'ops-clock', prop: [2, 3], x: 17.6, y: 0.4, w: 30, h: 30, solid: false },
        { id: 'brf-tbl', prop: [3, 4], x: 11.0, y: 21.8, w: 64, h: 50, solid: true, footprint: { w: 50, h: 18 } },
        { id: 'brf-kit', prop: [1, 6], x: 11.0, y: 21.6, w: 46, h: 34, solid: false },
        { id: 'brf-podium', prop: [7, 9], x: 5.5, y: 21.8, w: 38, h: 42, solid: false },
        { id: 'brf-vw', prop: [2, 4], x: 11.0, y: 17.6, w: 62, h: 46, solid: false },
        { id: 'brf-bench', prop: [3, 6], x: 4.4, y: 25.2, w: 52, h: 38, solid: false },
        { id: 'brf-cam', prop: [1, 4], x: 2.4, y: 18.4, w: 36, h: 36, solid: false },

        // D. Surveillance & Monitoring Wing (Room 1 & Room 2 Comms)
        { id: 'm1-vw1', prop: [2, 4], x: 55.0, y: 2.0, w: 64, h: 48, solid: true, footprint: { w: 52, h: 14 } },
        { id: 'm1-vw2', prop: [2, 4], x: 63.0, y: 2.0, w: 64, h: 48, solid: true, footprint: { w: 52, h: 14 } },
        { id: 'm1-c1', prop: [3, 5], x: 53.0, y: 7.0, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'm1-c2', prop: [4, 0], x: 61.0, y: 7.0, w: 56, h: 48, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'm1-c3', prop: [2, 0], x: 53.0, y: 12.0, w: 56, h: 48, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'm1-c4', prop: [3, 5], x: 61.0, y: 12.0, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'm1-hub', prop: [5, 15], x: 67.2, y: 7.0, w: 44, h: 46, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'm1-dome', prop: [0, 4], x: 66.8, y: 2.8, w: 28, h: 28, solid: false },
        { id: 'm1-fire', prop: [4, 7], x: 67.2, y: 13.0, w: 34, h: 42, solid: false },

        { id: 'm2-d1', prop: [3, 8], x: 53.0, y: 22.0, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'm2-d2', prop: [5, 3], x: 62.0, y: 22.0, w: 56, h: 46, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'm2-radio', prop: [4, 11], x: 53.0, y: 18.2, w: 40, h: 40, solid: false },
        { id: 'm2-dish', prop: [4, 15], x: 62.0, y: 18.2, w: 42, h: 44, solid: false },
        { id: 'm2-files', prop: [1, 7], x: 62.8, y: 21.8, w: 32, h: 28, solid: false },
        { id: 'm2-rack', prop: [0, 5], x: 66.8, y: 19.0, w: 46, h: 54, solid: true, footprint: { w: 30, h: 16 } },
        { id: 'm2-cam', prop: [1, 4], x: 50.4, y: 18.4, w: 36, h: 36, solid: false },
        { id: 'm2-plant', prop: [4, 2], x: 50.8, y: 28.6, w: 38, h: 44, solid: false },

        // E. Intelligence & Evidence Wing
        { id: 'ev-board', prop: [3, 0], x: 24.0, y: 32.0, w: 66, h: 50, solid: true, footprint: { w: 48, h: 14 } },
        { id: 'ev-shelf', prop: [1, 1], x: 17.0, y: 32.0, w: 48, h: 48, solid: true, footprint: { w: 36, h: 14 } },
        { id: 'ev-cab', prop: [0, 1], x: 30.0, y: 32.0, w: 40, h: 46, solid: true, footprint: { w: 26, h: 14 } },
        { id: 'ev-tbl', prop: [3, 3], x: 23.6, y: 37.6, w: 54, h: 40, solid: false },
        { id: 'ev-files', prop: [4, 8], x: 24.0, y: 37.4, w: 40, h: 32, solid: false },
        { id: 'ev-tray', prop: [3, 15], x: 20.6, y: 37.4, w: 34, h: 32, solid: false },
        { id: 'ev-boxes', prop: [2, 10], x: 17.0, y: 42.2, w: 36, h: 38, solid: false },
        { id: 'ev-clock', prop: [2, 3], x: 24.0, y: 30.0, w: 30, h: 30, solid: false },
        { id: 'ev-cart', prop: [7, 5], x: 17.2, y: 44.0, w: 44, h: 42, solid: false },
        { id: 'ev-ladder', prop: [0, 6], x: 31.6, y: 42.0, w: 36, h: 42, solid: false },

        { id: 'lab-bench', prop: [2, 1], x: 5.0, y: 35.0, w: 58, h: 48, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'lab-micro', prop: [0, 7], x: 5.2, y: 34.8, w: 42, h: 36, solid: false },
        { id: 'lab-therm', prop: [0, 3], x: 11.0, y: 35.0, w: 50, h: 46, solid: true, footprint: { w: 36, h: 14 } },
        { id: 'lab-rig', prop: [2, 15], x: 11.0, y: 41.0, w: 44, h: 44, solid: true, footprint: { w: 30, h: 14 } },
        { id: 'lab-nava', prop: [2, 0], x: 7.0, y: 41.0, w: 56, h: 48, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'lab-plant', prop: [4, 2], x: 2.4, y: 42.8, w: 38, h: 44, solid: false },

        // F. Personnel, Security & Break Wing
        { id: 'sec-arman', prop: [4, 0], x: 42.0, y: 39.0, w: 56, h: 48, solid: true, footprint: { w: 44, h: 16 } },
        { id: 'sec-lock', prop: [5, 4], x: 37.6, y: 34.4, w: 52, h: 48, solid: true, footprint: { w: 40, h: 14 } },
        { id: 'sec-coat', prop: [6, 4], x: 47.0, y: 34.4, w: 44, h: 44, solid: false },
        { id: 'sec-board', prop: [7, 8], x: 42.0, y: 32.0, w: 48, h: 36, solid: false },
        { id: 'sec-badge', prop: [4, 6], x: 37.0, y: 42.4, w: 38, h: 42, solid: false },

        { id: 'brk-kitchen', prop: [5, 5], x: 53.6, y: 34.6, w: 58, h: 46, solid: true, footprint: { w: 46, h: 16 } },
        { id: 'brk-coffee', prop: [4, 4], x: 55.4, y: 34.6, w: 38, h: 42, solid: false },
        { id: 'brk-micro', prop: [7, 7], x: 61.6, y: 34.6, w: 38, h: 36, solid: false },
        { id: 'brk-vend', prop: [6, 5], x: 64.0, y: 34.6, w: 46, h: 52, solid: true, footprint: { w: 34, h: 14 } },
        { id: 'brk-cool', prop: [5, 2], x: 66.8, y: 35.0, w: 38, h: 46, solid: true, footprint: { w: 26, h: 14 } },
        { id: 'brk-snack', prop: [6, 8], x: 66.8, y: 41.6, w: 46, h: 50, solid: true, footprint: { w: 32, h: 14 } },
        { id: 'brk-sofa', prop: [1, 2], x: 62.0, y: 42.6, w: 62, h: 46, solid: true, footprint: { w: 48, h: 16 } },
        { id: 'brk-dining', prop: [4, 5], x: 55.2, y: 41.0, w: 56, h: 44, solid: false },
        { id: 'brk-fern', prop: [6, 12], x: 51.6, y: 44.2, w: 32, h: 36, solid: false },

        // G. Corridors & Shared Architectural Details
        { id: 'cor-sign1', prop: [3, 7], x: 24.4, y: 14.0, w: 42, h: 28, solid: false },
        { id: 'cor-sign2', prop: [3, 7], x: 47.6, y: 31.6, w: 42, h: 28, solid: false },
        { id: 'cor-bench1', prop: [3, 6], x: 5.0, y: 29.6, w: 50, h: 36, solid: false },
        { id: 'cor-fire1', prop: [4, 7], x: 47.2, y: 29.6, w: 34, h: 40, solid: false },
        { id: 'cor-map', prop: [2, 12], x: 35.0, y: 29.6, w: 40, h: 30, solid: false },
      ],
      interactables: [
        {
          id: 'obj-ops-console',
          type: 'ops_overview',
          x: 11.0,
          y: 7.6,
          approachAnchor: { x: 10, y: 10 },
          interactionRadius: 78,
          enabled: true,
          label: 'کنسول مرکزی عملیات',
          actionType: 'ops_overview',
          targetId: 'ops_overview',
        },
        {
          id: 'obj-ops-display',
          type: 'ops_display',
          x: 11.0,
          y: 2.4,
          approachAnchor: { x: 10, y: 4 },
          interactionRadius: 72,
          enabled: true,
          label: 'نمایشگر اصلی پرونده',
          actionType: 'ops_display',
          targetId: 'ops_display',
        },
        {
          id: 'obj-ops-station',
          type: 'ops_station',
          x: 17.0,
          y: 4.6,
          approachAnchor: { x: 16, y: 6 },
          interactionRadius: 72,
          enabled: true,
          label: 'ایستگاه تحلیلگر عملیات',
          actionType: 'ops_station',
          targetId: 'ops_station',
        },
        {
          id: 'obj-hq-dispatch',
          type: 'scene_transfer',
          x: 4.4,
          y: 4.8,
          approachAnchor: { x: 4, y: 6 },
          interactionRadius: 72,
          enabled: true,
          label: 'اعزام به اتاق سرور 7',
          actionType: 'scene_transfer',
          targetId: 'server_room_7',
        },
        {
          id: 'obj-hq-board',
          type: 'evidence_board',
          x: 24.0,
          y: 33.0,
          approachAnchor: { x: 24, y: 34 },
          interactionRadius: 76,
          enabled: true,
          label: 'تخته شواهد و فرضیه‌ها',
          actionType: 'open_board',
          targetId: 'evidence_board',
        },
        {
          id: 'obj-hq-report',
          type: 'final_decision',
          x: 41.0,
          y: 6.0,
          approachAnchor: { x: 40, y: 8 },
          interactionRadius: 76,
          enabled: true,
          label: 'میز گزارش نهایی به مدیر',
          actionType: 'final_decision',
          targetId: 'ACT-1-DECISION',
        },
        {
          id: 'obj-hq-lab',
          type: 'team_panel',
          x: 5.0,
          y: 36.0,
          approachAnchor: { x: 4, y: 38 },
          interactionRadius: 72,
          enabled: true,
          label: 'پنل آزمایشگاه و مدیریت تیم',
          actionType: 'open_team',
          targetId: 'team',
        },
      ],
      npcs: [
        { ...NPC_ROSTER.kiani, x: 41.0, y: 3.6, dir: 0, interactionRadius: 74, dialogueRootId: 'dlg-director-1' },
        { ...NPC_ROSTER.nava, x: 7.0, y: 39.2, dir: 0, interactionRadius: 72, dialogueRootId: 'dlg-nava-1' },
        { ...NPC_ROSTER.arman, x: 42.0, y: 37.2, dir: 0, interactionRadius: 72, dialogueRootId: 'dlg-arman-1' },
      ],
      ambientNpcs: [
        { id: 'amb-rec', npcKey: 'nava', x: 35.0, y: 17.2, dir: 0, activity: 'typing' },
        { id: 'amb-mon1-a', npcKey: 'arash', x: 53.0, y: 8.8, dir: 1, activity: 'typing' },
        { id: 'amb-mon1-b', npcKey: 'arman', x: 61.0, y: 8.8, dir: 1, activity: 'monitoring' },
        { id: 'amb-mon2-a', npcKey: 'arash', x: 53.0, y: 24.0, dir: 1, activity: 'monitoring' },
        { id: 'amb-mon2-b', npcKey: 'nava', x: 62.0, y: 24.0, dir: 1, activity: 'typing' },
        { id: 'amb-ops', npcKey: 'arash', x: 17.0, y: 6.4, dir: 1, activity: 'typing' },
        { id: 'amb-brk', npcKey: 'arman', x: 56.0, y: 39.0, dir: 0, activity: 'sitting' },
        { id: 'amb-patrol', npcKey: 'arman', x: 30.0, y: 22.0, dir: 3, activity: 'patrol', route: [{ x: 30, y: 22 }, { x: 40, y: 22 }, { x: 40, y: 26 }, { x: 30, y: 26 }] },
      ],
    },
    server_room_7: {
      id: 'server_room_7',
      name: 'اتاق سرور 7 — بخش بایگانی ژنو',
      sectionName: 'مرکز داده ایزوله، رک‌ها و سیستم خنک‌کننده',
      tilesetPath: '/assets/art/tilesets/server-room-7/tileset.png',
      width: 48,
      height: 30,
      tileSize: TILE_SIZE,
      grid: buildServerRoom7Grid(),
      solidTiles: [4],
      spawn: { x: 23 * 16, y: 24 * 16, dir: 1 },
      doors: [
        { id: 'door-sr7-exit', x: 22, y: 29, widthTiles: 4, label: 'در خروجی اتاق سرور 7', initialState: 'open', interactive: false },
      ],
      props: [
        // Eight distinct rack placements form two equipment banks; the middle
        // remains open as a north-south route and a full-width cross aisle.
        { id: 'sr7-rack-west-north-a', prop: [3, 1], x: 4.0, y: 5.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-west-north-b', prop: [4, 1], x: 13.0, y: 5.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-east-north-a', prop: [5, 1], x: 32.0, y: 5.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-east-north-b', prop: [0, 5], x: 41.0, y: 5.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-west-south-a', prop: [1, 8], x: 4.0, y: 21.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-west-south-b', prop: [3, 1], x: 13.0, y: 21.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-east-south-a', prop: [4, 1], x: 32.0, y: 21.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },
        { id: 'sr7-rack-east-south-b', prop: [5, 1], x: 41.0, y: 21.0, w: 46, h: 56, solid: true, footprint: { w: 28, h: 14 } },

        // Evidence terminal and its single associated control surface.
        { id: 'sr7-terminal-console', prop: [5, 6], x: 23.0, y: 4.0, w: 60, h: 50, solid: true, footprint: { w: 42, h: 14 } },

        // Essential room infrastructure, placed against the perimeter of each bay.
        { id: 'sr7-hvac-west', prop: [6, 6], x: 2.5, y: 2.4, w: 50, h: 46, solid: true, footprint: { w: 34, h: 14 } },
        { id: 'sr7-hvac-east', prop: [6, 6], x: 43.0, y: 2.4, w: 50, h: 46, solid: true, footprint: { w: 34, h: 14 } },
        { id: 'sr7-network-switch', prop: [0, 11], x: 19.0, y: 10.2, w: 42, h: 42, solid: false },

        // The two optional evidence objects remain separated and directly reachable.
        { id: 'sr7-thermal-prop', prop: [0, 3], x: 39.5, y: 14.0, w: 52, h: 48, solid: true, footprint: { w: 32, h: 14 } },
        { id: 'sr7-keyrack-prop', prop: [1, 3], x: 6.5, y: 14.0, w: 52, h: 44, solid: true, footprint: { w: 32, h: 14 } },

        // Arash's compact work point sits beside, not inside, the main route.
        { id: 'sr7-arash-desk', prop: [7, 6], x: 16.0, y: 10.2, w: 56, h: 46, solid: true, footprint: { w: 40, h: 14 } },
      ],
      interactables: [
        {
          id: 'obj-sr7-terminal',
          type: 'evidence_math',
          x: 23.0,
          y: 5.2,
          approachAnchor: { x: 22, y: 6 },
          interactionRadius: 76,
          enabled: true,
          label: 'ترمینال لاگ ورود سرور 7',
          actionType: 'evidence_math',
          targetId: 'EV-01',
          mathTaskId: 'Q-C1-T1',
          segId: 'SEG-EV01-IDS',
          activityId: 'ACT-1-MATH-SET',
        },
        {
          id: 'obj-sr7-thermal',
          type: 'evidence_math',
          x: 39.0,
          y: 14.0,
          approachAnchor: { x: 37, y: 14 },
          interactionRadius: 76,
          enabled: true,
          label: 'سنسور حرارتی بخش B',
          actionType: 'evidence_math',
          targetId: 'EV-04',
          mathTaskId: 'Q-C2-T2',
          segId: 'SEG-EV04-TEMP',
          activityId: 'ACT-1-OBJ-THERMAL',
        },
        {
          id: 'obj-sr7-rack',
          type: 'evidence_math',
          x: 7.0,
          y: 14.0,
          approachAnchor: { x: 9, y: 14 },
          interactionRadius: 76,
          enabled: true,
          label: 'رک کلیدهای سخت‌افزاری پشتیبان',
          actionType: 'evidence_math',
          targetId: 'EV-05',
          mathTaskId: 'Q-C1-T2',
          segId: 'SEG-EV05-KEYS',
          activityId: 'ACT-1-OBJ-RACK',
        },
        {
          id: 'obj-sr7-exit',
          type: 'scene_transfer',
          x: 23.0,
          y: 27.0,
          approachAnchor: { x: 22, y: 26 },
          interactionRadius: 72,
          enabled: true,
          label: 'بازگشت به مقر CIPHER',
          actionType: 'scene_transfer',
          targetId: 'cipher_hq',
        },
      ],
      npcs: [
        { ...NPC_ROSTER.arash, x: 16.0, y: 12.0, dir: 0, interactionRadius: 72, dialogueRootId: 'dlg-arash-1' },
      ],
      ambientNpcs: [],
    },
  },

  dialogues: {
    'dlg-director-1': {
      id: 'dlg-director-1',
      speaker: 'مدیر کیانی',
      portraitIndex: 12,
      text: 'فرمانده، ساعت 02:14 بامداد بخش حساسی از سرور 7 همگام‌سازی شده است. مدارک را از اتاق سرور 7 جمع‌آوری کنید و روی تخته شواهد به جمع‌بندی برسید.',
      choices: [
        { id: 'c1', label: 'توجیه دریافت شد؛ به اتاق سرور 7 اعزام می‌شویم.', nextNodeId: null, grantFlag: 'briefed' },
        { id: 'c2', label: 'ثبت گزارش نهایی عملیات (بستن پرونده)', nextNodeId: null, openDecision: true },
      ],
    },
    'dlg-nava-1': {
      id: 'dlg-nava-1',
      speaker: 'ناوا فرهادی',
      portraitIndex: 13,
      text: 'دو گزارش خام از ترمینال سرور 7 دارم. اگر در اتاق سرور 7 با تحلیل مجموعه‌ها شناسه‌های مشترک را استخراج کنید، می‌توانیم کارت‌های مشکوک را ردیابی کنیم.',
      choices: [
        { id: 'n1', label: 'ممنون ناوا، در حال بررسی ترمینال هستم.', nextNodeId: null },
      ],
    },
    'dlg-arman-1': {
      id: 'dlg-arman-1',
      speaker: 'آرمان راد',
      portraitIndex: 16,
      text: 'نگهبانی ورودی شرقی کارت شماره 105 را به نام تکنسین شیفت شب ثبت کرده است. آیا می‌خواهید پرونده تردد او را دریافت کنید؟',
      choices: [
        {
          id: 'a1',
          label: 'بله، گزارش کارت 105 را به دفتر پرونده اضافه کن.',
          nextNodeId: 'dlg-arman-2',
          grantEvidenceId: 'EV-02',
        },
        {
          id: 'a2',
          label: 'من لاگ رمزگشایی‌شده سرور 7 (105 و 114) را دارم؛ فیلم دوربین راهرو طبقه اول را بررسی کن!',
          condition: { hasFlag: 'ev01_decrypted' },
          nextNodeId: 'dlg-arman-cam',
          grantEvidenceId: 'EV-06',
        },
        { id: 'a3', label: 'فعلاً نیازی نیست.', nextNodeId: null },
      ],
    },
    'dlg-arman-2': {
      id: 'dlg-arman-2',
      speaker: 'آرمان راد',
      portraitIndex: 16,
      text: 'ثبت شد. اما مراقب باشید؛ این فقط یک گزارش نگهبانی است و هنوز مدرک قطعی از حضور فیزیکی او در سرور 7 نداریم.',
      choices: [{ id: 'a2-ok', label: 'متوجه شدم.', nextNodeId: null }],
    },
    'dlg-arman-cam': {
      id: 'dlg-arman-cam',
      speaker: 'آرمان راد',
      portraitIndex: 16,
      text: 'فیلم دوربین راهرو طبقه اول تایید شد! تکنسین شیفت در ساعت 02:14 با نگهبان طبقه اول بوده و اصلاً وارد اتاق سرور 7 نشده است. این مدرک قطعی را روی تخته قرار دادم.',
      choices: [{ id: 'acam-ok', label: 'عالی، کارت 105 دزدیده شده است!', nextNodeId: null }],
    },
    'dlg-arash-1': {
      id: 'dlg-arash-1',
      speaker: 'آرش کاظمی',
      portraitIndex: 14,
      text: 'به اتاق سرور 7 خوش آمدید. سه نقطه کلیدی اینجا داریم: ترمینال لاگ در شمال، سنسور حرارتی در شرق و رک کلیدهای پشتیبان در غرب. حتی بدون فیلم دوربین هم می‌توانیم از طریق داده‌های حرارتی و رک پشتیبان، حضور از راه دور THE VEIL را ثابت کنیم.',
      choices: [{ id: 'ar1', label: 'شروع بررسی تجهیزات.', nextNodeId: null }],
    },
  },

  evidenceCatalog: [
    {
      id: 'EV-01',
      name: 'لاگ ورود سرور 7 (بازه 02:00)',
      type: 'log',
      source: 'ثبت سخت‌افزاری گیت امنیتی ژنو',
      provenance: 'هسته لاگ غیرقابل ویرایش',
      reliability: 96,
      sourceVerification: 'confirmed_fact',
      baseText: 'فایل لاگ دو بازه زمانی از ترمینال استخراج شد، اما شناسه‌های مشترک هنوز استخراج نشده‌اند.',
      segments: [
        {
          segId: 'SEG-EV01-BASE',
          unlocked: true,
          epistemicLevel: 'confirmed_fact',
          text: 'گزارش خام ساعت 02:00 تا 02:15 از ترمینال سرور 7.',
          claims: ['log_acquired'],
        },
        {
          segId: 'SEG-EV01-IDS',
          unlocked: false,
          epistemicLevel: 'confirmed_fact',
          text: 'تحلیل اشتراک مجموعه‌ها تایید کرد شناسه‌های 105 و 114 هم‌زمان در هر دو بازه فعال بوده‌اند.',
          claims: ['access_overlap_105_114'],
        },
      ],
    },
    {
      id: 'EV-02',
      name: 'گزارش کارت تردد 105 (تکنسین شیفت)',
      type: 'keycard',
      source: 'نگهبانی ورودی شرقی',
      provenance: 'گزارش نگهبانی + اظهارات اولیه',
      reliability: 65,
      sourceVerification: 'interpretation',
      baseText: 'کارت 105 به نام تکنسین شیفت ثبت شده است؛ نگهبانی گمان می‌کند او وارد سرور 7 شده است.',
      segments: [
        {
          segId: 'SEG-EV02-BASE',
          unlocked: true,
          epistemicLevel: 'interpretation',
          text: 'ظن اولیه به تکنسین شیفت به دلیل ثبت کارت 105.',
          claims: ['suspect_technician_105'],
        },
      ],
    },
    {
      id: 'EV-04',
      name: 'تله‌متری سنسور حرارتی بخش B',
      type: 'document',
      source: 'سنسور حرارتی سرور 7',
      provenance: 'ثبت مستقیم سنسور صنعتی',
      reliability: 92,
      sourceVerification: 'confirmed_fact',
      baseText: 'داده‌های خام دما استخراج شد؛ نیاز به حل معادله قدر مطلق برای یافتن الگوی بار پردازشی.',
      segments: [
        {
          segId: 'SEG-EV04-BASE',
          unlocked: true,
          epistemicLevel: 'confirmed_fact',
          text: 'نمودار خام سنسور حرارتی در اتاق سرور 7.',
          claims: ['thermal_raw'],
        },
        {
          segId: 'SEG-EV04-TEMP',
          unlocked: false,
          epistemicLevel: 'confirmed_fact',
          text: 'تحلیل قدر مطلق نشان داد بارگذاری سنگین بدون باز شدن درِ فیزیکی سرور و از طریق خوشه راه دور در ساعت 02:14 رخ داده است.',
          claims: ['remote_load_0214'],
        },
      ],
    },
    {
      id: 'EV-05',
      name: 'پیکربندی رک کلیدهای سخت‌افزاری',
      type: 'log',
      source: 'رک پشتیبان اتاق سرور 7',
      provenance: 'ماژول سخت‌افزاری رک',
      reliability: 94,
      sourceVerification: 'confirmed_fact',
      baseText: 'تعداد زیرمجموعه‌های ناتهی کلیدها قفل است؛ برای کشف ترکیب رله نیاز به شمارش زیرمجموعه‌ها است.',
      segments: [
        {
          segId: 'SEG-EV05-BASE',
          unlocked: true,
          epistemicLevel: 'confirmed_fact',
          text: 'بسته کلیدهای سخت‌افزاری رک پشتیبان.',
          claims: ['rack_raw'],
        },
        {
          segId: 'SEG-EV05-KEYS',
          unlocked: false,
          epistemicLevel: 'confirmed_fact',
          text: 'کشف 15 ترکیب ناتهی کلید نشان داد یک رله پنهان با امضای THE VEIL از خارج ژنو فعال شده است.',
          claims: ['remote_relay_signature'],
        },
      ],
    },
    {
      id: 'EV-06',
      name: 'فایل دوربین راهرو طبقه اول',
      type: 'photo',
      source: 'بایگانی دوربین‌های امنیتی',
      provenance: 'دوربین مهروموم‌شده راهرو',
      reliability: 98,
      sourceVerification: 'confirmed_fact',
      baseText: 'تصویر زمان‌دار ثابت می‌کند تکنسین شیفت در ساعت 02:14 در طبقه اول بوده و در اتاق سرور 7 حضور نداشته است.',
      segments: [
        {
          segId: 'SEG-EV06-BASE',
          unlocked: true,
          epistemicLevel: 'confirmed_fact',
          text: 'حضور تکنسین در طبقه اول در زمان حادثه (تناقض قطعی با EV-02).',
          claims: ['camera_alibi_verified'],
        },
      ],
    },
  ],

  initialHypotheses: [
    {
      id: 'HYP-01',
      origin: 'system',
      isUserCreated: false,
      title: 'فرضیه 1: خیانت تکنسین شیفت شب (کارت 105)',
      summary: 'تکنسین شیفت شخصاً با کارت 105 وارد سرور 7 شده و داده‌ها را کپی کرده است.',
      targetClaimIds: ['suspect_technician_105'],
      status: 'active',
      statusReason: 'فرضیه اولیه بر پایه گزارش نگهبانی',
      deleted: false,
      editHistory: [],
    },
    {
      id: 'HYP-02',
      origin: 'system',
      isUserCreated: false,
      title: 'فرضیه 2: نفوذ از راه دور THE VEIL با کارت ربوده‌شده',
      summary: 'عامل بیرونی THE VEIL با سوءاستفاده از شناسه 105 و رله پنهان، بدون حضور فیزیکی تکنسین داده‌ها را خارج کرده است.',
      targetClaimIds: ['access_overlap_105_114', 'remote_load_0214'],
      status: 'active',
      statusReason: 'نیازمند اثبات با مدارک قطعی',
      deleted: false,
      editHistory: [],
    },
  ],

  deductionRules: {
    redHerringIds: ['HYP-01'],
    validPaths: [
      {
        id: 'path-surveillance-alibi',
        tier: 'optimal',
        confidence: 100,
        requiredClaims: ['access_overlap_105_114', 'camera_alibi_verified'],
        minConfirmedFacts: 2,
        requiredContradictionTargets: ['HYP-01'],
      },
      {
        id: 'path-thermal-telemetry',
        tier: 'valid_alternative',
        confidence: 85,
        requiredClaims: ['access_overlap_105_114', 'remote_load_0214', 'remote_relay_signature'],
        minConfirmedFacts: 2,
        requiredContradictionTargets: ['HYP-01'],
      },
    ],
  },

  activityGraph: {
    entryNodeId: 'ACT-1-BRIEF',
    nodes: {
      'ACT-1-BRIEF': {
        id: 'ACT-1-BRIEF',
        type: 'Briefing',
        title: 'دریافت توجیه از مدیر کیانی',
        optional: false,
        repeatable: false,
        unlockConditions: {},
        onCompleteConsequences: ['CON-BRIEFED'],
      },
      'ACT-1-MATH-SET': {
        id: 'ACT-1-MATH-SET',
        type: 'MathAnalysis',
        title: 'رمزگشایی لاگ ورود سرور 7 (مجموعه‌ها)',
        optional: false,
        repeatable: false,
        unlockConditions: { requiredFlags: ['briefed'] },
        onCompleteConsequences: ['CON-EV01-DECRYPTED'],
      },
      'ACT-1-OBJ-THERMAL': {
        id: 'ACT-1-OBJ-THERMAL',
        type: 'MathAnalysis',
        title: 'تحلیل سنسور حرارتی (قدر مطلق)',
        optional: true,
        repeatable: false,
        unlockConditions: { requiredFlags: ['briefed'] },
        onCompleteConsequences: ['CON-EV04-DECODED'],
      },
      'ACT-1-OBJ-RACK': {
        id: 'ACT-1-OBJ-RACK',
        type: 'MathAnalysis',
        title: 'بررسی رک کلیدهای پشتیبان (زیرمجموعه‌ها)',
        optional: true,
        repeatable: false,
        unlockConditions: { requiredFlags: ['briefed'] },
        onCompleteConsequences: ['CON-EV05-DECODED'],
      },
      'ACT-1-DECISION': {
        id: 'ACT-1-DECISION',
        type: 'Decision',
        title: 'ثبت گزارش نهایی به مدیر',
        optional: false,
        repeatable: false,
        unlockConditions: {},
      },
    },
  },

  consequences: {
    'CON-BRIEFED': {
      id: 'CON-BRIEFED',
      description: 'پرونده سرور 7 فعال شد.',
      repeatable: false,
      effects: { setFlags: { briefed: true } },
    },
    'CON-EV01-DECRYPTED': {
      id: 'CON-EV01-DECRYPTED',
      description: 'شناسه‌های مشترک 105 و 114 در لاگ EV-01 آشکار شدند.',
      repeatable: false,
      effects: { setFlags: { ev01_decrypted: true } },
    },
    'CON-EV04-DECODED': {
      id: 'CON-EV04-DECODED',
      description: 'الگوی بارگذاری از راه دور در سنسور حرارتی EV-04 کشف شد.',
      repeatable: false,
      effects: { setFlags: { ev04_decoded: true } },
    },
    'CON-EV05-DECODED': {
      id: 'CON-EV05-DECODED',
      description: 'امضای رله THE VEIL در رک کلیدهای EV-05 تایید شد.',
      repeatable: false,
      effects: { setFlags: { ev05_decoded: true } },
    },
    'CON-ENDING-OPTIMAL': {
      id: 'CON-ENDING-OPTIMAL',
      description: 'تحقیق کامل (مسیر دوربین و لاگ): رله THE VEIL مسدود و تکنسین بی‌گناه تبرئه شد.',
      repeatable: false,
      effects: { ocDelta: 30, scoreDelta: 150, setEndingId: 'ending_optimal' },
    },
    'CON-ENDING-ALTERNATIVE': {
      id: 'CON-ENDING-ALTERNATIVE',
      description: 'تحقیق معتبر (مسیر تله‌متری حرارتی و رک): نفوذ از راه دور THE VEIL اثبات و رله مسدود شد.',
      repeatable: false,
      effects: { ocDelta: 20, scoreDelta: 110, setEndingId: 'ending_alternative' },
    },
    'CON-ENDING-FLAWED': {
      id: 'CON-ENDING-FLAWED',
      description: 'گزارش ناقص یا مبتنی بر سرنخ انحرافی: فرد بی‌گناه بازداشت شد و رله مخفی THE VEIL فرصت فرار یافت.',
      repeatable: false,
      effects: { stabilityDelta: -20, setEndingId: 'ending_flawed' },
    },
  },
};

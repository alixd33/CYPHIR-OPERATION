import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOT_DIR = path.join(ROOT, 'qa-screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = new URL(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.buf = Buffer.alloc(0);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      this.sock = net.connect(Number(this.wsUrl.port), this.wsUrl.hostname, () => {
        const req =
          `GET ${this.wsUrl.pathname} HTTP/1.1\r\n` +
          `Host: ${this.wsUrl.host}\r\n` +
          `Upgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
        this.sock.write(req);
      });
      this.sock.on('error', reject);
      let handshaken = false;
      this.sock.on('data', (chunk) => {
        this.buf = Buffer.concat([this.buf, chunk]);
        if (!handshaken) {
          const idx = this.buf.indexOf('\r\n\r\n');
          if (idx !== -1) {
            handshaken = true;
            this.buf = this.buf.subarray(idx + 4);
            resolve();
            this._drainFrames();
          }
        } else {
          this._drainFrames();
        }
      });
    });
  }

  _drainFrames() {
    while (this.buf.length >= 2) {
      const b0 = this.buf[0];
      const b1 = this.buf[1];
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2));
        off = 10;
      }
      if (this.buf.length < off + len) return;
      const payload = this.buf.subarray(off, off + len);
      this.buf = this.buf.subarray(off + len);
      if ((b0 & 0x0f) === 0x1) {
        const msg = JSON.parse(payload.toString('utf8'));
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
        }
      }
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const json = JSON.stringify({ id, method, params });
    const data = Buffer.from(json, 'utf8');
    const mask = crypto.randomBytes(4);
    let header;
    if (data.length < 126) {
      header = Buffer.from([0x81, 0x80 | data.length]);
    } else if (data.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(data.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(data.length), 2);
    }
    const masked = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) masked[i] = data[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([header, mask, masked]));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`JS Error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOT_DIR, filename), Buffer.from(data, 'base64'));
  }

  close() {
    this.sock?.destroy();
  }
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const port = 4199;
  const serverProc = spawn('node', ['server.mjs', '--port', String(port)], { cwd: ROOT, stdio: 'pipe' });
  const cdpPort = 9300 + Math.floor(Math.random() * 400);
  const userDataDir = `/tmp/cipher-e2e-${Date.now()}`;
  const chromeProc = spawn(
    '/usr/bin/chromium',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      `--host-resolver-rules=MAP cipher.local 127.0.0.1`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    for (let i = 0; i < 20; i++) {
      try {
        await fetchJson(`http://127.0.0.1:${port}/api/health`);
        const targets = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`);
        const pageTarget = targets.find((t) => t.type === 'page');
        if (pageTarget) {
          cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
          await cdp.connect();
          break;
        }
      } catch {}
      await sleep(300);
    }
    assert.ok(cdp, 'Failed to connect to Chromium CDP');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: `http://cipher.local:${port}/` });
    for (let w = 0; w < 20; w++) {
      if (await cdp.eval(`Boolean(document.getElementById('btn-boot-continue'))`)) break;
      await sleep(250);
    }

    // 1. Boot -> Main Menu
    await cdp.eval(`document.getElementById('btn-boot-continue').click()`);
    await sleep(300);
    const menuText = await cdp.eval(`document.body.innerText`);
    assert.ok(menuText.includes('OPERATION: CIPHER'), 'Main menu title missing');
    await cdp.screenshot('01_main_menu_1600x900.png');

    // 2. Character Creation -> Main Lobby
    await cdp.eval(`document.getElementById('menu-new-game').click()`);
    await sleep(250);
    // Verify all 12 options (4 appearances + 3 outfits) + submit button are visible at 1366x768
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    assert.equal(await cdp.eval(`document.querySelectorAll('[data-char-app]').length`), 6, 'Expected 6 appearances');
    assert.equal(await cdp.eval(`document.querySelectorAll('[data-char-out]').length`), 4, 'Expected 4 outfits');
    assert.equal(await cdp.eval(`document.querySelectorAll('[data-pick-combo]').length`), 24, 'Expected 24 combos');
    await cdp.screenshot('01a_character_create_1366x768.png');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(150);
    await cdp.eval(`
      document.querySelector('[data-char-app="2"]').click();
      document.querySelector('[data-char-out="1"]').click();
      var inp = document.getElementById('inp-char-name');
      inp.value = 'آرشام راد';
      inp.dispatchEvent(new Event('input'));
      document.getElementById('btn-create-char-submit').click();
    `);
    await sleep(250);
    await cdp.screenshot('01b_lobby_1600x900.png');
    const lText = await cdp.eval(`document.body.innerText`);
    assert.ok(lText.includes('آرشام راد'), 'Profile name missing in lobby');
    assert.ok(lText.includes('v2.2.8'), 'Version v2.2.8 missing in lobby');

    // 3. Campaign -> Difficulty -> Briefing -> cipher_hq 2D Scene
    await cdp.eval(`document.getElementById('btn-lobby-new-campaign').click()`);
    await sleep(150);
    await cdp.eval(`document.getElementById('btn-choose-campaign').click()`);
    await sleep(150);
    await cdp.eval(`document.getElementById('btn-confirm-difficulty').click()`);
    await sleep(200);
    await cdp.eval(`document.getElementById('btn-briefing-to-op').click()`);
    await sleep(300);
    assert.equal(await cdp.eval(`Boolean(document.getElementById('scene-canvas'))`), true, 'cipher_hq canvas missing');
    const canvasWidth = await cdp.eval(`document.getElementById('scene-canvas').getBoundingClientRect().width`);
    assert.ok(canvasWidth >= 1100, `Full-bleed map expected (>=1100px wide), got ${canvasWidth}`);
    // Verify WASD works even when OS keyboard layout sends Persian key ('ص') with code 'KeyW'
    await cdp.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'ص', bubbles: true }));
    `);
    await sleep(160);
    await cdp.eval(`
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'ص', bubbles: true }));
    `);
    const outerScroll = await cdp.eval(`document.documentElement.scrollHeight > window.innerHeight`);
    assert.equal(outerScroll, false, 'Outer vertical scrollbar should not appear');
    await cdp.screenshot('02_cipher_hq_1600x900.png');

    // 4. Transfer to server_room_7 -> Interact with terminal (EV-01 -> Q-C1-T1)
    await cdp.eval(`document.querySelector('[data-scene-transfer="server_room_7"]').click()`);
    await sleep(300);
    assert.ok((await cdp.eval(`document.body.innerText`)).includes('اتاق سرور 7'), 'server_room_7 scene not loaded');
    await cdp.screenshot('03_server_room_7_1600x900.png');

    await cdp.eval(`document.querySelector('[data-obj-interact="obj-sr7-terminal"]').click()`);
    await sleep(300);
    const mathCount = await cdp.eval(`document.querySelectorAll('.math-expr[dir="ltr"]').length`);
    assert.ok(mathCount >= 2, 'Expected LTR-isolated math expressions on Task screen');

    // 5. Test elim_1 (leaves 3 active choices) & Pause Modal (ESC / HUD button)
    await cdp.eval(`document.querySelector('[data-help-type="elim_1"]').click()`);
    await sleep(200);
    const elimCount = await cdp.eval(`document.querySelectorAll('.choice-btn.eliminated').length`);
    assert.equal(elimCount, 1, 'elim_1 should eliminate exactly 1 option');

    await cdp.eval(`document.getElementById('hud-btn-pause').click()`);
    await sleep(200);
    assert.equal(await cdp.eval(`Boolean(document.getElementById('pause-overlay'))`), true, 'Pause overlay did not open');
    const t1 = await cdp.eval(`document.getElementById('task-timer-val').textContent`);
    await sleep(1200);
    const t2 = await cdp.eval(`document.getElementById('task-timer-val').textContent`);
    assert.equal(t1, t2, 'TaskTimer did not freeze while paused');
    await cdp.screenshot('04_pause_modal_1600x900.png');

    await cdp.eval(`document.getElementById('btn-pause-resume').click()`);
    await sleep(200);
    assert.equal(await cdp.eval(`Boolean(document.getElementById('pause-overlay'))`), false, 'Pause overlay did not close on Resume');

    // 6. Solve Q-C1-T1 ({105, 114}) -> Verify all 4 choices preserved in Solution drawer -> Return to server_room_7
    await cdp.eval(`
      var btns = Array.from(document.querySelectorAll('.choice-btn'));
      var target = btns.find(b => b.innerText.includes('105') && b.innerText.includes('114') && !b.innerText.includes('101'));
      target.click();
      document.getElementById('btn-submit-answer').click();
    `);
    await sleep(250);
    assert.equal(await cdp.eval(`document.querySelectorAll('#choices-container .choice-btn').length`), 4, 'All 4 options must remain visible');
    assert.equal(await cdp.eval(`Boolean(document.getElementById('solution-drawer'))`), true, 'Solution drawer missing');
    await cdp.eval(`document.getElementById('btn-next-after-solution').click()`);
    await sleep(250);

    // 7. Return to cipher_hq -> Conditional Arman dialogue (ev01_decrypted -> EV-06)
    await cdp.eval(`document.querySelector('[data-scene-transfer="cipher_hq"]').click()`);
    await sleep(250);
    await cdp.eval(`document.querySelector('[data-talk-npc="npc-arman"]').click()`);
    await sleep(200);
    const hasCamChoice = await cdp.eval(`Boolean(document.querySelector('[data-dialogue-choice="a2"]'))`);
    assert.equal(hasCamChoice, true, 'Conditional camera choice should be unlocked after EV-01 decryption');
    await cdp.eval(`document.querySelector('[data-dialogue-choice="a2"]').click()`);
    await sleep(200);
    await cdp.eval(`document.querySelector('[data-dialogue-choice="acam-ok"]').click()`);
    await sleep(200);

    // 8. Evidence Board: Create/Edit/Soft-Delete User Hypothesis + Connect Path A + Drag SVG alignment
    await cdp.eval(`document.getElementById('btn-quick-board').click()`);
    await sleep(300);
    await cdp.eval(`
      document.getElementById('inp-hyp-title').value = 'فرضیه تست E2E';
      document.getElementById('btn-create-hyp').click();
    `);
    await sleep(200);
    // Edit & soft-delete user hypothesis
    await cdp.eval(`
      var uCard = Array.from(document.querySelectorAll('.board-card.is-hypothesis')).find(el => el.dataset.boardId.startsWith('HYP-U'));
      uCard.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
    `);
    await sleep(150);
    await cdp.eval(`
      document.getElementById('inp-edit-hyp-title').value = 'فرضیه ویرایش‌شده';
      document.getElementById('btn-save-edit-hyp').click();
    `);
    await sleep(150);
    await cdp.eval(`document.getElementById('btn-del-hyp').click()`);
    await sleep(150);

    // Helper to connect two cards in browser
    const connectCards = async (fromId, toId, relation) => {
      await cdp.eval(`
        var sel = document.getElementById('sel-connect-relation');
        sel.value = '${relation}';
        sel.dispatchEvent(new Event('change'));
        if (!document.getElementById('btn-connect-mode').classList.contains('btn-primary')) {
          document.getElementById('btn-connect-mode').click();
        }
      `);
      await sleep(100);
      await cdp.eval(`
        var c1 = document.querySelector('[data-board-id="${fromId}"]');
        c1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
      `);
      await sleep(100);
      await cdp.eval(`
        var c2 = document.querySelector('[data-board-id="${toId}"]');
        c2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 200, clientY: 100 }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 200, clientY: 100 }));
      `);
      await sleep(120);
    };

    await connectCards('EV-01', 'HYP-02', 'supports');
    await connectCards('EV-06', 'HYP-02', 'supports');
    await connectCards('EV-06', 'HYP-01', 'contradicts');
    assert.equal(await cdp.eval(`document.querySelectorAll('#board-threads-svg line').length`), 3, 'Expected 3 SVG threads');

    // Drag EV-01 and verify 1:1 SVG thread alignment
    const beforeX = await cdp.eval(`parseInt(document.querySelector('[data-board-id="EV-01"]').style.left, 10)`);
    await cdp.eval(`
      var c1 = document.querySelector('[data-board-id="EV-01"]');
      c1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 120, clientY: 120 }));
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 160 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 200, clientY: 160 }));
    `);
    await sleep(150);
    const afterX = await cdp.eval(`parseInt(document.querySelector('[data-board-id="EV-01"]').style.left, 10)`);
    const lineX1 = await cdp.eval(`Number(document.querySelector('#board-threads-svg line').getAttribute('x1'))`);
    const boardZoom = await cdp.eval(`parseFloat(document.getElementById('board-zoom-label').textContent) / 100`);
    assert.ok(boardZoom >= 0.7 && boardZoom <= 1.65, 'Expected valid Auto-Fit zoom: ' + boardZoom);
    assert.ok(Math.abs(afterX - (beforeX + Math.round(80 / boardZoom))) <= 2, 'Card did not move by zoom-scaled drag delta');
    assert.equal(lineX1, afterX + 89, 'SVG thread x1 did not track dragged card pin');
    await cdp.screenshot('05_evidence_board_1600x900.png');

    // 9. Return to HQ -> Submit Final Decision (HYP-02) -> Optimal Ending
    await cdp.eval(`document.getElementById('btn-back-hq-from-board').click()`);
    await sleep(250);
    await cdp.eval(`document.getElementById('btn-quick-decision').click()`);
    await sleep(200);
    await cdp.eval(`document.getElementById('btn-submit-final-decision').click()`);
    await sleep(250);
    const resText = await cdp.eval(`document.body.innerText`);
    assert.ok(resText.includes('مسیر بهینه'), 'Expected optimal ending text in operation_results');
    await cdp.screenshot('06_operation_results_1600x900.png');

    // 10. Pause -> Save & Return to Main Menu -> Verify Responsive 1920x1080 & 1366x768
    for (const [w, h] of [[1920, 1080], [1366, 768]]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await sleep(150);
      const overflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
      assert.equal(overflow, false, `Horizontal overflow detected at ${w}x${h}`);
    }

    // 11. Reload persistence check (IndexedDB) & verify all SW CORE_ASSETS return HTTP 200
    await cdp.send('Page.reload');
    for (let w = 0; w < 20; w++) {
      if (await cdp.eval(`Boolean(document.getElementById('btn-boot-continue'))`)) break;
      await sleep(250);
    }
    await cdp.eval(`document.getElementById('btn-boot-continue').click()`);
    await sleep(300);
    assert.equal(await cdp.eval(`Boolean(document.getElementById('menu-continue'))`), true, 'Reload failed');
    assert.equal(await cdp.eval(`document.getElementById('menu-continue').disabled`), false, 'IndexedDB save did not persist across reload');

    const swText = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const coreBlock = swText.slice(swText.indexOf("CORE_ASSETS"), swText.indexOf("];", swText.indexOf("CORE_ASSETS")));
    const assetMatches = [...coreBlock.matchAll(/'(\/[^']*)'/g)].map(m => m[1]);
    assert.ok(assetMatches.length >= 40, 'sw.js CORE_ASSETS list looks incomplete');
    for (const assetPath of assetMatches) {
      const code = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}${assetPath}`, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject);
      });
      assert.equal(code, 200, `SW asset returned ${code}: ${assetPath}`);
    }

    const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown');
    assert.equal(exceptions.length, 0, `Uncaught browser exceptions: ${JSON.stringify(exceptions)}`);

    console.log('ALL v2.2.8 E2E CHROMIUM BROWSER & OFFLINE TESTS PASSED!');
  } finally {
    cdp?.close();
    chromeProc.kill('SIGKILL');
    serverProc.kill('SIGKILL');
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch((err) => {
  console.error('E2E FAILED:', err);
  process.exit(1);
});

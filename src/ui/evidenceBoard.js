import { TERMS } from '../domain/terminology.js';
import { icon } from './icons.js';

/**
 * Interactive Detective Evidence Board (TDS v2.2.5)
 * - Auto-Fit to content bounds at 100% Browser Zoom (~88-92% viewport fill)
 * - Fit View, Zoom In/Out, Reset View, and Background Pan
 * - 1:1 CSS pixel SVG threads (supports / contradicts / indirect)
 * - Live drag updates + Evidence pixel icons from evidence_icons.png
 * - Create, edit, and soft-delete User Hypotheses without erasing audit history
 */

let boardAbortController = null;

const EVIDENCE_ICON_INDEX = {
  document: 0,
  photo: 1,
  log: 2,
  audio: 3,
  keycard: 4,
};

export function computeAutoFit(positions = {}, placedIds = [], viewportW = 800, viewportH = 540, opts = {}) {
  const cardW = opts.cardW ?? 184;
  const cardH = opts.cardH ?? 112;
  const pad = opts.pad ?? 28;
  const fillRatio = opts.fillRatio ?? 0.84;

  const validPos = placedIds
    .map((id) => positions[id])
    .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));

  if (validPos.length === 0) {
    return { zoom: 1, pan: { x: 0, y: 0 }, bounds: { minX: 0, minY: 0, maxX: viewportW, maxY: viewportH } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of validPos) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + cardW > maxX) maxX = p.x + cardW;
    if (p.y + cardH > maxY) maxY = p.y + cardH;
  }

  const contentW = Math.max(220, maxX - minX + pad * 2);
  const contentH = Math.max(160, maxY - minY + pad * 2);
  const rawScale = Math.min((viewportW * fillRatio) / contentW, (viewportH * fillRatio) / contentH);
  const zoom = Math.max(0.7, Math.min(1.45, Number(rawScale.toFixed(2))));

  const panX = Math.round((viewportW - contentW * zoom) / 2 - (minX - pad) * zoom);
  const panY = Math.round((viewportH - contentH * zoom) / 2 - (minY - pad) * zoom);

  return {
    zoom,
    pan: { x: panX, y: panY },
    bounds: { minX, minY, maxX, maxY, contentW, contentH },
  };
}

export function renderEvidenceBoardScreen(engine, boardUiState) {
  const state = engine.state;
  const board = state.board;
  const evMap = state.evidenceStates || {};
  const unlockedEvidence = Object.values(evMap).filter((e) => e && e.discoveredAt);
  const activeHypotheses = (board.hypotheses || []).filter((h) => !h.deleted);

  const allItems = [
    ...unlockedEvidence.map((e) => ({ ...e, kind: 'evidence' })),
    ...activeHypotheses.map((h) => ({ ...h, kind: 'hypothesis', name: h.title })),
  ];

  const selectedItem = allItems.find((it) => it.id === boardUiState.selectedItemId) || allItems[0] || null;
  const zoom = state.boardVisual?.zoom ?? 1;
  const pan = state.boardVisual?.pan ?? { x: 0, y: 0 };

  const relationColor = (rel) => {
    if (rel === 'supports') return '#869978';
    if (rel === 'contradicts') return '#B55E5E';
    return '#C8995F';
  };

  const relationLabel = (rel) => {
    if (rel === 'supports') return 'تایید / حمایت';
    if (rel === 'contradicts') return 'تناقض';
    return 'ارتباط غیرمستقیم';
  };

  const statusBadge = (item) => {
    if (item.kind === 'evidence') {
      if (item.sourceVerification === 'confirmed_fact') {
        return `<span class="badge badge-fact">${TERMS.EVIDENCE_CATEGORY.confirmed_fact}</span>`;
      }
      if (item.sourceVerification === 'disproved') {
        return `<span class="badge badge-hyp">ردشده</span>`;
      }
      return `<span class="badge badge-interp">${TERMS.EVIDENCE_CATEGORY.interpretation}</span>`;
    }
    const map = {
      active: ['badge-interp', 'فعال'],
      supported: ['badge-fact', 'پشتیبانی‌شده'],
      weakened: ['badge-interp', 'تضعیف‌شده'],
      refuted: ['badge-hyp', 'ردشده'],
    };
    const [cls, lbl] = map[item.status] || ['badge-hyp', 'فرضیه'];
    return `<span class="badge ${cls}">${lbl}</span>`;
  };

  const threadsSvg = board.connections
    .map((c) => {
      const p1 = board.positions[c.fromId] || { x: 80, y: 80 };
      const p2 = board.positions[c.toId] || { x: 240, y: 160 };
      const col = relationColor(c.relation);
      const dash = c.relation === 'contradicts' ? '6,5' : c.relation === 'indirect' ? '3,4' : 'none';
      return `<line data-conn-id="${c.id}" data-from="${c.fromId}" data-to="${c.toId}" x1="${p1.x + 89}" y1="${p1.y + 4}" x2="${p2.x + 89}" y2="${p2.y + 4}" stroke="${col}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="${dash}" />`;
    })
    .join('');

  const cardsHtml = board.placedIds
    .map((id) => {
      const item = allItems.find((it) => it.id === id);
      if (!item) return '';
      const pos = board.positions[id] || { x: 60, y: 60 };
      const isHyp = item.kind === 'hypothesis';
      const isSelected = boardUiState.selectedItemId === id;
      const isConnectSource = boardUiState.connectFromId === id;
      const iconIdx = isHyp ? 5 : EVIDENCE_ICON_INDEX[item.type] ?? 0;
      const hasLockedSeg = !isHyp && (item.segments || []).some((s) => !s.unlocked);

      return `
        <div class="board-card ${isHyp ? 'is-hypothesis' : ''} ${isSelected ? 'is-selected' : ''} ${isConnectSource ? 'is-connect-src' : ''}"
             data-board-id="${id}"
             style="left: ${pos.x}px; top: ${pos.y}px;">
          <div class="board-pin"></div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px;">
            <span style="display:inline-flex; align-items:center; gap:4px;">
              <span style="width:18px; height:18px; display:inline-block; background:url('/assets/pixelart/evidence_icons.png') -${iconIdx * 32}px 0 / 256px 32px; transform:scale(0.65); image-rendering:pixelated;"></span>
              <strong style="font-size:0.74rem; color:#6d4925;" dir="ltr">${id}</strong>
            </span>
            <span style="font-size:0.7rem; color:#4f545c;">${isHyp ? 'فرضیه' : hasLockedSeg ? 'نیازمند رمزگشایی' : `${item.reliability}%`}</span>
          </div>
          <div style="font-weight:700; margin-bottom:3px; line-height:1.3;">${item.name}</div>
          <div style="font-size:0.74rem; color:#3a3d42; line-height:1.3;">${
            isHyp ? (item.summary || '').slice(0, 62) : (item.baseText || '').slice(0, 62)
          }...</div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="panel panel-bronze dossier-panel" style="padding: 14px 18px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          ${icon('evidence')}
          <div>
            <h2>${TERMS.LOCATIONS.evidence} — پرونده ${TERMS.MAIN_CASE_NAME}</h2>
            <div style="font-size:0.86rem; color:var(--text-muted);">کارت‌ها را بچینید، مدارک را به فرضیه‌ها وصل کنید و تناقض‌ها را علامت بزنید.</div>
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button id="btn-board-zoom-out" class="btn" style="padding:6px 10px;" title="کوچک‌نمایی">-</button>
          <span id="board-zoom-label" class="ltr-token" dir="ltr">${Math.round(zoom * 100)}%</span>
          <button id="btn-board-zoom-in" class="btn" style="padding:6px 10px;" title="بزرگ‌نمایی">+</button>
          <button id="btn-board-fit" class="btn" style="padding:6px 10px;" title="تنظیم خودکار به کادر">تنظیم کادر</button>
          <button id="btn-board-reset" class="btn" style="padding:6px 10px;" title="بازنشانی نما">100%</button>
          <button id="btn-connect-mode" class="btn ${boardUiState.connectMode ? 'btn-primary' : ''}">
            ${boardUiState.connectMode ? 'لغو اتصال' : 'اتصال دو کارت'}
          </button>
          <select id="sel-connect-relation" class="input-field" style="width:auto; padding:7px 10px;">
            <option value="supports" ${boardUiState.connectRelation === 'supports' ? 'selected' : ''}>تایید / حمایت (سبز)</option>
            <option value="contradicts" ${boardUiState.connectRelation === 'contradicts' ? 'selected' : ''}>تناقض (قرمز)</option>
            <option value="indirect" ${boardUiState.connectRelation === 'indirect' ? 'selected' : ''}>ارتباط غیرمستقیم (برنزی)</option>
          </select>
          <button id="btn-back-hq-from-board" class="btn">بازگشت به صحنه</button>
        </div>
      </div>
      ${
        boardUiState.connectMode
          ? `<div style="margin-top:8px; padding:7px 12px; background:rgba(168,121,67,0.2); border:1px solid var(--accent-bronze); border-radius:6px; font-size:0.88rem;">
              ${
                boardUiState.connectFromId
                  ? `مبدا انتخاب شد (<span class="ltr-token" dir="ltr">${boardUiState.connectFromId}</span>). اکنون کارت مقصد را کلیک کنید.`
                  : 'حالت اتصال فعال است: روی کارت اول (مبدا) کلیک کنید.'
              }
            </div>`
          : ''
      }
    </div>

    <div class="board-layout">
      <div id="corkboard" class="corkboard">
        <div id="corkboard-stage" style="position:absolute; inset:0; transform:translate(${pan.x}px, ${pan.y}px) scale(${zoom}); transform-origin: top left;">
          <svg id="board-threads-svg" class="board-threads">${threadsSvg}</svg>
          ${cardsHtml}
        </div>
      </div>

      <div class="board-side-scroll">
        <div class="panel dossier-panel">
          <div class="panel-header">
            <h3>جزئیات مدرک / فرضیه</h3>
          </div>
          ${
            selectedItem
              ? selectedItem.kind === 'evidence'
                ? `
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <strong class="ltr-token" dir="ltr">${selectedItem.id}</strong>
                      ${statusBadge(selectedItem)}
                    </div>
                    <h4 style="color:var(--accent-bronze-lt);">${selectedItem.name}</h4>
                    <div style="font-size:0.84rem; color:var(--text-muted);">
                      منبع: ${selectedItem.source} | اعتبار: <strong>${selectedItem.reliability}%</strong>
                    </div>
                    <div style="font-size:0.82rem; color:var(--text-muted);">منشا: ${selectedItem.provenance}</div>
                    <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                      ${(selectedItem.segments || [])
                        .map((seg) =>
                          seg.unlocked
                            ? `<div style="font-size:0.88rem; background:var(--bg-charcoal-dk); padding:8px; border-right:3px solid var(--accent-olive); border-radius:5px;">${seg.text}</div>`
                            : `<div style="font-size:0.84rem; background:rgba(143,69,69,0.16); padding:8px; border-right:3px solid var(--accent-red); border-radius:5px;">[داده قفل‌شده — در اتاق سرور 7 با تحلیل ریاضی باز می‌شود]</div>`
                        )
                        .join('')}
                    </div>
                  </div>
                `
                : `
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <strong class="ltr-token" dir="ltr">${selectedItem.id}</strong>
                      ${statusBadge(selectedItem)}
                    </div>
                    <h4 style="color:var(--accent-bronze-lt);">${selectedItem.title}</h4>
                    <p style="margin:4px 0; font-size:0.9rem;">${selectedItem.summary}</p>
                    ${
                      selectedItem.origin === 'user' || selectedItem.isUserCreated
                        ? `<div style="display:flex; flex-direction:column; gap:6px; border-top:1px solid var(--border-subtle); padding-top:8px;">
                            <input id="inp-edit-hyp-title" class="input-field" value="${selectedItem.title}" />
                            <textarea id="inp-edit-hyp-summary" class="input-field" rows="2">${selectedItem.summary}</textarea>
                            <div style="display:flex; gap:8px;">
                              <button id="btn-save-edit-hyp" data-hyp-id="${selectedItem.id}" class="btn btn-olive" style="flex:1;">ذخیره ویرایش</button>
                              <button id="btn-del-hyp" data-hyp-id="${selectedItem.id}" class="btn btn-danger">حذف فرضیه</button>
                            </div>
                          </div>`
                        : ''
                    }
                  </div>
                `
              : '<p>یک کارت را روی تخته انتخاب کنید.</p>'
          }
        </div>

        <div class="panel dossier-panel">
          <div class="panel-header">
            <h3>ثبت فرضیه جدید</h3>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <input id="inp-hyp-title" class="input-field" placeholder="عنوان فرضیه..." />
            <textarea id="inp-hyp-summary" class="input-field" rows="2" placeholder="شرح کوتاه فرضیه و استدلال..."></textarea>
            <button id="btn-create-hyp" class="btn btn-primary">افزودن فرضیه به تخته</button>
          </div>
        </div>

        <div class="panel dossier-panel">
          <div class="panel-header">
            <h3>اتصال‌های ثبت‌شده (${board.connections.length})</h3>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:150px; overflow-y:auto;">
            ${
              board.connections.length === 0
                ? '<div style="font-size:0.85rem; color:var(--text-muted);">هنوز نخی متصل نشده است.</div>'
                : board.connections
                    .map(
                      (c) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; font-size:0.82rem; padding:5px 8px; background:var(--bg-charcoal-dk); border-radius:5px;">
                    <span><span dir="ltr">${c.fromId}</span> ◄ ${relationLabel(c.relation)} ► <span dir="ltr">${c.toId}</span></span>
                    <button class="btn btn-danger" data-del-conn="${c.id}" style="padding:2px 8px; font-size:0.75rem;">حذف</button>
                  </div>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindEvidenceBoardEvents(container, engine, boardUiState, rerender, sound) {
  if (boardAbortController) boardAbortController.abort();
  boardAbortController = new AbortController();
  const { signal } = boardAbortController;

  const boardEl = container.querySelector('#corkboard');
  const stageEl = container.querySelector('#corkboard-stage');
  const svgEl = container.querySelector('#board-threads-svg');
  const zoomLabelEl = container.querySelector('#board-zoom-label');
  if (!boardEl || !stageEl) return;

  const applyAutoFit = () => {
    const rect = boardEl.getBoundingClientRect();
    const vw = Math.max(360, rect.width || boardEl.clientWidth || 800);
    const vh = Math.max(260, rect.height || boardEl.clientHeight || 540);
    const fit = computeAutoFit(engine.state.board.positions, engine.state.board.placedIds, vw, vh);
    engine.state.boardVisual = { zoom: fit.zoom, pan: fit.pan };
    boardUiState.autoFitted = true;
    stageEl.style.transform = `translate(${fit.pan.x}px, ${fit.pan.y}px) scale(${fit.zoom})`;
    if (zoomLabelEl) zoomLabelEl.textContent = `${Math.round(fit.zoom * 100)}%`;
  };

  // Auto-Fit on initial open at 100% browser zoom
  if (!boardUiState.autoFitted) {
    applyAutoFit();
  }

  container.querySelector('#btn-back-hq-from-board')?.addEventListener('click', () => {
    sound.play('click');
    boardAbortController?.abort();
    boardUiState.onExit();
  }, { signal });

  container.querySelector('#btn-board-zoom-in')?.addEventListener('click', () => {
    engine.state.boardVisual = engine.state.boardVisual || { zoom: 1, pan: { x: 0, y: 0 } };
    engine.state.boardVisual.zoom = Math.min(1.65, Number((engine.state.boardVisual.zoom + 0.1).toFixed(2)));
    boardUiState.autoFitted = true;
    rerender();
  }, { signal });

  container.querySelector('#btn-board-zoom-out')?.addEventListener('click', () => {
    engine.state.boardVisual = engine.state.boardVisual || { zoom: 1, pan: { x: 0, y: 0 } };
    engine.state.boardVisual.zoom = Math.max(0.7, Number((engine.state.boardVisual.zoom - 0.1).toFixed(2)));
    boardUiState.autoFitted = true;
    rerender();
  }, { signal });

  container.querySelector('#btn-board-fit')?.addEventListener('click', () => {
    sound.play('click');
    applyAutoFit();
  }, { signal });

  container.querySelector('#btn-board-reset')?.addEventListener('click', () => {
    sound.play('click');
    engine.state.boardVisual = { zoom: 1, pan: { x: 0, y: 0 } };
    boardUiState.autoFitted = true;
    rerender();
  }, { signal });

  container.querySelector('#btn-connect-mode')?.addEventListener('click', () => {
    sound.play('click');
    boardUiState.connectMode = !boardUiState.connectMode;
    boardUiState.connectFromId = null;
    rerender();
  }, { signal });

  container.querySelector('#sel-connect-relation')?.addEventListener('change', (e) => {
    boardUiState.connectRelation = e.target.value;
  }, { signal });

  container.querySelector('#btn-create-hyp')?.addEventListener('click', () => {
    const title = container.querySelector('#inp-hyp-title')?.value || '';
    const summary = container.querySelector('#inp-hyp-summary')?.value || '';
    if (!title.trim()) return;
    sound.play('pin');
    const res = engine.createHypothesis(title, summary);
    if (res.ok) boardUiState.selectedItemId = res.hypothesis.id;
    rerender();
  }, { signal });

  container.querySelector('#btn-save-edit-hyp')?.addEventListener('click', (e) => {
    const id = e.currentTarget.getAttribute('data-hyp-id');
    const title = container.querySelector('#inp-edit-hyp-title')?.value || '';
    const summary = container.querySelector('#inp-edit-hyp-summary')?.value || '';
    sound.play('save');
    engine.editHypothesis(id, title, summary);
    rerender();
  }, { signal });

  container.querySelector('#btn-del-hyp')?.addEventListener('click', (e) => {
    const id = e.currentTarget.getAttribute('data-hyp-id');
    sound.play('click');
    engine.deleteHypothesis(id);
    boardUiState.selectedItemId = null;
    rerender();
  }, { signal });

  container.querySelectorAll('[data-del-conn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.play('click');
      engine.removeBoardConnection(btn.getAttribute('data-del-conn'));
      rerender();
    }, { signal });
  });

  let dragging = null;
  let panning = null;
  let moved = false;

  const updateLiveThreads = (itemId, nx, ny) => {
    if (!svgEl) return;
    svgEl.querySelectorAll('line').forEach((line) => {
      if (line.getAttribute('data-from') === itemId) {
        line.setAttribute('x1', String(nx + 89));
        line.setAttribute('y1', String(ny + 4));
      }
      if (line.getAttribute('data-to') === itemId) {
        line.setAttribute('x2', String(nx + 89));
        line.setAttribute('y2', String(ny + 4));
      }
    });
  };

  boardEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('.board-card') || e.button !== 0 || engine.pauseManager?.state.isPaused) return;
    const pan = engine.state.boardVisual?.pan ?? { x: 0, y: 0 };
    panning = { startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y };
    boardEl.style.cursor = 'grabbing';
  }, { signal });

  boardEl.querySelectorAll('.board-card').forEach((card) => {
    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || engine.pauseManager?.state.isPaused) return;
      e.preventDefault();
      e.stopPropagation();
      const id = card.getAttribute('data-board-id');
      const pos = engine.state.board.positions[id] || { x: 60, y: 60 };
      dragging = {
        id,
        card,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        lastX: pos.x,
        lastY: pos.y,
      };
      moved = false;
      card.style.cursor = 'grabbing';
      card.style.zIndex = '10';
    }, { signal });
  });

  window.addEventListener('mousemove', (e) => {
    const zoom = engine.state.boardVisual?.zoom ?? 1;
    if (panning) {
      const nx = Math.round(panning.origPanX + (e.clientX - panning.startX));
      const ny = Math.round(panning.origPanY + (e.clientY - panning.startY));
      engine.state.boardVisual = engine.state.boardVisual || { zoom, pan: { x: 0, y: 0 } };
      engine.state.boardVisual.pan = { x: nx, y: ny };
      stageEl.style.transform = `translate(${nx}px, ${ny}px) scale(${zoom})`;
      return;
    }
    if (!dragging) return;
    const dx = (e.clientX - dragging.startMouseX) / zoom;
    const dy = (e.clientY - dragging.startMouseY) / zoom;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    const nx = Math.round(Math.max(10, Math.min(1200, dragging.origX + dx)));
    const ny = Math.round(Math.max(12, Math.min(800, dragging.origY + dy)));
    dragging.card.style.left = `${nx}px`;
    dragging.card.style.top = `${ny}px`;
    dragging.lastX = nx;
    dragging.lastY = ny;
    updateLiveThreads(dragging.id, nx, ny);
  }, { signal });

  window.addEventListener('mouseup', () => {
    if (panning) {
      panning = null;
      boardEl.style.cursor = '';
      return;
    }
    if (!dragging) return;
    const { id, card, lastX, lastY } = dragging;
    card.style.cursor = 'grab';
    card.style.zIndex = '';
    dragging = null;

    if (moved) {
      sound.play('pin');
      engine.moveBoardItem(id, lastX, lastY);
      return;
    }

    if (boardUiState.connectMode) {
      if (!boardUiState.connectFromId) {
        boardUiState.connectFromId = id;
        sound.play('click');
        rerender();
      } else if (boardUiState.connectFromId !== id) {
        engine.addBoardConnection(boardUiState.connectFromId, id, boardUiState.connectRelation);
        sound.play('thread');
        boardUiState.connectFromId = null;
        boardUiState.connectMode = false;
        rerender();
      }
    } else {
      boardUiState.selectedItemId = id;
      sound.play('click');
      rerender();
    }
  }, { signal });
}

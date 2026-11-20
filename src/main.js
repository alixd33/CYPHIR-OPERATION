import { DIFFICULTY_PRESETS, compute3DDifficultyScore } from './domain/difficulty.js';
import { HELP_COSTS, computeLearningProgress } from './domain/economy.js';
import { renderRichText } from './domain/mathRenderer.js';
import { TERMS, toEnglishDigits } from './domain/terminology.js';
import { TaskTimer } from './domain/timer.js';
import { IDBStore } from './persistence/idbStore.js';
import { recoverBestSaveForProfile } from './recovery/recoveryManager.js';
import { getQuestionById } from './questions/grade9Bank.js';
import { CHAPTER_1_CASE } from './content/cases/chapter1SilentArchive.js';
import { PLAYER_APPEARANCES, PLAYER_OUTFITS } from './content/characters/roster.js';
import { CAMPAIGN_SILENT_ARCHIVE } from './story/campaignSilentArchive.js';
import { GameEngine } from './systems/gameEngine.js';
import { SoundManager } from './audio/soundManager.js';
import { bindEvidenceBoardEvents, renderEvidenceBoardScreen } from './ui/evidenceBoard.js';
import { SceneRenderer } from './ui/sceneRenderer.js';
import { renderPauseModal, renderSafeExitScreen } from './ui/pauseModal.js';
import { getPlayerPortraitIndex, icon, portraitStyle } from './ui/icons.js';
import { CREDITS_INFO, GAME_FULL_TITLE, GAME_VERSION } from './domain/version.js';

const storage = new IDBStore();
const engine = new GameEngine(storage);
storage.eventBus = engine.eventBus;
const sound = new SoundManager(() => engine.settings);

const appEl = document.getElementById('app');

let currentScreen = 'boot';
let modalOverlay = null; // 'settings' | 'credits' | 'team' | 'dialogue' | 'decision' | null
let toastMsg = '';
let toastTimer = null;
let sceneRenderer = null;
let activeTimer = null;
let isInitialized = false;

const PAUSABLE_SCREENS = new Set(['hq', 'briefing', 'operation', 'stage', 'task', 'solution', 'evidence_board']);

// UI-local transient state
const uiState = {
  charName: '',
  charCodename: 'فرمانده واحد تحلیلی',
  charApp: 0,
  charOut: 0,
  selectedDifficulty: 'normal',
  nearestInteractable: null,
  activeDialogueId: null,
  selectedDecisionHypId: 'HYP-02',
  board: {
    selectedItemId: 'EV-01',
    connectMode: false,
    connectFromId: null,
    connectRelation: 'supports',
    onExit: () => navigate('hq'),
  },
  saveSort: 'newest',
  renamingSlotId: null,
  deleteConfirmProfileId: null,
  deleteConfirmSlotId: null,
  overwriteConfirmSlotId: null,
  recoveryBanner: null,
};

function showToast(msg) {
  toastMsg = toEnglishDigits(msg);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg = '';
    const el = document.getElementById('toast-banner');
    if (el) el.remove();
  }, 3800);
  render();
}

engine.eventBus.on('SAVE_ERROR', ({ message }) => {
  showToast(message || 'خطا در ذخیره‌سازی محلی.');
});

const initPromise = engine.init().then(() => {
  isInitialized = true;
  if (currentScreen === 'boot') render();
});

function stopActiveTimer() {
  if (activeTimer) {
    activeTimer.stop();
    activeTimer = null;
  }
}

function navigate(screen, modal = null) {
  if (currentScreen === 'hq' && screen !== 'hq' && sceneRenderer) {
    sceneRenderer.unmount();
    sceneRenderer = null;
  }
  if (currentScreen === 'task' && screen !== 'task' && screen !== 'solution') {
    stopActiveTimer();
  }
  currentScreen = screen;
  modalOverlay = modal;
  render();
}

// Visibility pause/resume rule for timers (TDS v2.0 + v2.2.1 preserved)
document.addEventListener('visibilitychange', () => {
  if (activeTimer) {
    const shouldPause = document.hidden || engine.pauseManager.state.isPaused;
    activeTimer.handleVisibilityChange(shouldPause);
    if (document.hidden && engine.state?.activeTask) {
      engine.state.activeTask.remainingSec = activeTimer.remainingSec;
      engine.state.activeTask.elapsedSec = activeTimer.elapsedSec;
      engine.autoSave();
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (activeTimer && engine.state?.activeTask) {
    activeTimer.stop();
    engine.state.activeTask.remainingSec = activeTimer.remainingSec;
    engine.state.activeTask.elapsedSec = activeTimer.elapsedSec;
    engine.autoSave();
  }
});

// Global ESC key for Pause & Exit system (TDS v2.2.1)
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOverlay && !engine.pauseManager.state.isPaused) {
    modalOverlay = null;
    uiState.activeDialogueId = null;
    render();
    return;
  }
  if (engine.pauseManager.state.isPaused) {
    if (modalOverlay === 'settings') {
      modalOverlay = null;
      render();
      return;
    }
    engine.pauseManager.resume();
    if (activeTimer) activeTimer.handleVisibilityChange(false);
    render();
    return;
  }
  if (PAUSABLE_SCREENS.has(currentScreen)) {
    engine.pauseManager.pause(currentScreen);
    if (activeTimer) activeTimer.handleVisibilityChange(true);
    render();
  }
});

function renderTopHud() {
  const prof = engine.activeProfile;
  const st = engine.state;
  const stabClass = st ? (st.stability <= 35 ? 'stability-low' : 'stability-ok') : '';
  return `
    <header class="top-hud">
      <div class="hud-brand">
        ${icon('hq')}
        <span class="hud-title ltr-token" dir="ltr">${TERMS.GAME_TITLE}</span>
        ${prof ? `<span class="badge badge-interp">${prof.displayName}</span>` : ''}
      </div>
      <div class="hud-metrics">
        ${
          st
            ? `
          <div class="metric-pill ${stabClass}">${icon('status_ok')} <span>${TERMS.STABILITY_LABEL}:</span> <strong>${st.stability}%</strong></div>
          <div class="metric-pill">${icon('resource')} <span>${TERMS.OC_SHORT}:</span> <strong>${st.operationalCredits}</strong></div>
          <div class="metric-pill">${icon('clock')} <span>${TERMS.TC_SHORT}:</span> <strong>${st.temporalCredits}</strong></div>
          <div class="metric-pill">${icon('objective')} <span>${TERMS.PERFORMANCE_LABEL}:</span> <strong>${st.performanceScore}</strong></div>
        `
            : ''
        }
        ${
          PAUSABLE_SCREENS.has(currentScreen)
            ? `<button id="hud-btn-pause" class="btn" style="padding:5px 11px;">توقف (<span dir="ltr">ESC</span>)</button>`
            : ''
        }
        ${
          currentScreen !== 'main_menu' && currentScreen !== 'boot' && currentScreen !== 'safe_exit'
            ? `<button id="hud-btn-save" class="btn" style="padding:5px 11px;">${icon('save')} ذخیره‌ها</button>`
            : ''
        }
        <button id="hud-btn-settings" class="btn" style="padding:5px 11px;">${icon('settings')} تنظیمات</button>
      </div>
    </header>
  `;
}

function renderTaskAndSolution(isSolutionView) {
  const { question, taskState } = engine.beginOrResumeTask();
  const stage = engine.getCurrentStage();
  const mod = engine.getTeamModifiers();
  const labels = ['A', 'B', 'C', 'D'];
  const displayOrder = taskState.choiceOrder || [0, 1, 2, 3];
  const correctDisplayIdx = displayOrder.indexOf(question.correctIndex);

  const choicesHtml = displayOrder
    .map((origIdx, displayIdx) => {
      const ch = question.choices[origIdx];
      const isElim = taskState.eliminatedIndices.includes(origIdx);
      const isSelected = taskState.selectedIndex === origIdx;
      const isCorrect = origIdx === question.correctIndex;
      let cls = 'choice-btn';
      if (isElim) cls += ' eliminated';
      if (isSelected) cls += ' selected';
      if (isSolutionView) {
        if (isCorrect) cls += ' is-correct';
        else if (isSelected && !isCorrect) cls += ' is-wrong';
      }
      return `
        <button class="${cls}" data-choice-idx="${origIdx}" ${isElim || taskState.submitted ? 'disabled' : ''}>
          <span class="choice-badge" dir="ltr">${labels[displayIdx]}</span>
          <span style="flex:1;">${renderRichText(ch)}</span>
        </button>
      `;
    })
    .join('');

  const hintsHtml = taskState.unlockedHints
    .sort((a, b) => a - b)
    .map(
      (lvl) => `
      <div style="padding:9px 12px; background:rgba(168,121,67,0.14); border-right:3px solid var(--accent-bronze); border-radius:5px; margin-top:8px;">
        <strong>راهنمای سطح ${lvl}:</strong> ${renderRichText(question.hints[lvl])}
      </div>
    `
    )
    .join('');

  const solutionBlock = isSolutionView
    ? `
      <div id="solution-drawer" class="solution-drawer ${taskState.isCorrect ? '' : 'wrong-state'}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h3 style="color:${taskState.isCorrect ? 'var(--accent-olive-lt)' : 'var(--accent-red-lt)'};">
            ${taskState.isCorrect ? 'تحلیل صحیح تایید شد' : 'پاسخ ثبت‌شده نادرست بود'}
          </h3>
          <span class="badge ${taskState.isCorrect ? 'badge-fact' : 'badge-hyp'}">
            گزینه صحیح: <span dir="ltr" style="margin-right:4px;">${labels[correctDisplayIdx >= 0 ? correctDisplayIdx : 0]}</span>
          </span>
        </div>
        <div style="margin-bottom:10px;">
          <strong>راه‌حل گام‌به‌گام:</strong>
          <ol style="margin:6px 0 0; padding-right:20px;">
            ${question.solutionSteps.map((s) => `<li style="margin-bottom:4px;">${renderRichText(s)}</li>`).join('')}
          </ol>
        </div>
        <div style="margin-bottom:8px; font-size:0.92rem; color:var(--text-muted);">
          <strong>روش جایگزین:</strong> ${renderRichText(question.alternativeSolution)}
        </div>
        <div style="margin-bottom:14px; font-size:0.92rem; color:#e5a3a3;">
          <strong>خطای رایج:</strong> ${renderRichText(question.commonMistake)}
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="btn-next-after-solution" class="btn btn-primary">ادامه عملیات</button>
        </div>
      </div>
    `
    : '';

  const helpCost = (type) => Math.max(1, HELP_COSTS[type] - mod.hintDiscountOC);
  const canElim1 = !taskState.submitted && 4 - (taskState.eliminatedIndices.length + 1) >= 2;
  const canElim2 = !taskState.submitted && 4 - (taskState.eliminatedIndices.length + 2) >= 2;

  return `
    <div class="task-layout">
      <div class="panel panel-bronze dossier-panel">
        <div class="panel-header">
          <div>
            <span class="ltr-token" dir="ltr">${taskState.taskId}</span>
            <span style="margin-right:8px; color:var(--text-muted); font-size:0.88rem;">${question.curriculumRef}</span>
          </div>
          <div class="metric-pill" id="task-timer-pill">
            ${icon('clock')}
            <span>زمان باقی‌مانده:</span>
            <strong id="task-timer-val" dir="ltr">${taskState.remainingSec}s</strong>
          </div>
        </div>

        <div style="padding:10px 14px; background:rgba(168,121,67,0.12); border-right:3px solid var(--accent-bronze); border-radius:6px; margin-bottom:14px; font-size:0.92rem;">
          <strong>زمینه پرونده (${stage ? stage.title : 'فصل 1'}):</strong> ${renderRichText(question.storyConnection)}
        </div>

        <div id="question-text-box" style="font-size:1.05rem; line-height:1.8;">
          ${renderRichText(question.questionText)}
        </div>

        <div id="choices-container" class="choice-list">
          ${choicesHtml}
        </div>

        ${hintsHtml}

        ${
          !isSolutionView
            ? `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:18px;">
            <button id="btn-back-stage" class="btn">${engine.state.activeTaskContext ? 'بازگشت به صحنه' : 'بازگشت به مرحله'}</button>
            <button id="btn-submit-answer" class="btn btn-primary" ${taskState.selectedIndex === null ? 'disabled' : ''}>
              ثبت نهایی پاسخ
            </button>
          </div>
        `
            : ''
        }

        ${solutionBlock}
      </div>

      <aside class="panel">
        <div class="panel-header">
          <h3>${icon('help')} سامانه پشتیبانی تحلیلی</h3>
        </div>
        <div style="font-size:0.84rem; color:var(--text-muted); margin-bottom:10px;">
          استفاده از راهنما پایداری عملیات را کاهش نمی‌دهد.
          ${mod.hintDiscountOC > 0 ? `<br><span style="color:var(--accent-olive-lt);">تخفیف هم‌افزایی تیم: ${mod.hintDiscountOC} OC</span>` : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${[
            ['hint_1', TERMS.HELP.HINT_1, taskState.unlockedHints.includes(1)],
            ['hint_2', TERMS.HELP.HINT_2, taskState.unlockedHints.includes(2)],
            ['hint_3', TERMS.HELP.HINT_3, taskState.unlockedHints.includes(3)],
          ]
            .map(([t, lbl, used]) => {
              const cost = helpCost(t);
              const dis = taskState.submitted || used || engine.state.operationalCredits < cost;
              return `
                <button class="btn" data-help-type="${t}" ${dis ? 'disabled' : ''} style="justify-content:space-between;">
                  <span>${lbl}</span>
                  <span class="ltr-token" dir="ltr">${used ? 'باز شد' : `${cost} OC`}</span>
                </button>
              `;
            })
            .join('')}
          <hr style="border-color:var(--border-subtle); width:100%;" />
          <button class="btn" data-help-type="elim_1" ${!canElim1 || engine.state.operationalCredits < helpCost('elim_1') ? 'disabled' : ''} style="justify-content:space-between;">
            <span>${TERMS.HELP.ELIM_1}</span>
            <span class="ltr-token" dir="ltr">${helpCost('elim_1')} OC</span>
          </button>
          <button class="btn" data-help-type="elim_2" ${!canElim2 || engine.state.operationalCredits < helpCost('elim_2') ? 'disabled' : ''} style="justify-content:space-between;">
            <span>${TERMS.HELP.ELIM_2}</span>
            <span class="ltr-token" dir="ltr">${helpCost('elim_2')} OC</span>
          </button>
        </div>
      </aside>
    </div>
  `;
}

function renderScreenBody() {
  switch (currentScreen) {
    case 'boot':
      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:560px; margin:14vh auto; text-align:center;">
          <h1 class="ltr-token" dir="ltr" style="font-size:2rem;">${TERMS.GAME_TITLE}</h1>
          <p style="color:var(--text-muted);">
            ${isInitialized ? 'پایگاه داده آفلاین IndexedDB، موتورهای تحلیلی و دارایی‌های Pixel Art آماده هستند.' : 'در حال آماده‌سازی پایگاه داده آفلاین و دارایی‌های بازی...'}
          </p>
          <button id="btn-boot-continue" class="btn btn-primary" style="margin-top:12px;">ورود به سامانه CIPHER</button>
        </div>
      `;

    case 'safe_exit':
      return renderSafeExitScreen();

    case 'main_menu': {
      const hasProfiles = engine.profiles.length > 0;
      const { validSlots } = storage.loadSaveSlots();
      const canContinue = hasProfiles && validSlots.length > 0;
      return `
        <div class="menu-shell">
          <div class="panel panel-bronze dossier-panel menu-nav">
            <h1 class="ltr-token" dir="ltr" style="font-size:1.7rem; margin-bottom:4px;">${TERMS.GAME_TITLE}</h1>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;"><span style="font-size:0.86rem; color:var(--text-muted);">سازمان CIPHER — ژنو 2041</span><span class="stamp-tag">محرمانه</span></div>
            <button id="menu-new-game" class="btn btn-primary">${icon('campaign')} ${TERMS.MENU.NEW_GAME}</button>
            <button id="menu-continue" class="btn" ${canContinue ? '' : 'disabled'}>${icon('operation')} ${TERMS.MENU.CONTINUE}</button>
            <button id="menu-profiles" class="btn">${icon('profile')} ${TERMS.MENU.PROFILES}</button>
            <button id="menu-settings" class="btn">${icon('settings')} ${TERMS.MENU.SETTINGS}</button>
            <button id="menu-credits" class="btn">${icon('file')} ${TERMS.MENU.CREDITS}</button>
            <button id="menu-exit" class="btn btn-danger">${TERMS.MENU.EXIT}</button>
          </div>
          <div class="game-hero-banner">
            <h2 style="color:var(--accent-bronze-lt); margin-bottom:10px;">پرونده اصلی: ${TERMS.MAIN_CASE_NAME}</h2>
            <p style="line-height:1.85; color:var(--text-light);">
              در سال 2041، نشت اطلاعاتی مشکوکی در گره بایگانی ژنو رخ داده است. شما فرمانده یک واحد عملیاتی در سازمان <span class="ltr-token" dir="ltr">CIPHER</span> هستید. با گشت‌وگذار در صحنه جرم، گفت‌وگو با اعضا، تحلیل ریاضی مدارک و چیدمان تخته شواهد، شبکه <span class="ltr-token" dir="ltr">THE VEIL</span> را افشا کنید.
            </p>
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
              <span class="badge badge-fact">اجرای کاملاً آفلاین (IndexedDB)</span>
              <span class="badge badge-interp">ریاضی پایه نهم یکپارچه با تحقیق</span>
              <span class="badge badge-hyp">چندمسیره و تخته شواهد تعاملی</span>
            </div>
          </div>
        </div>
      `;
    }

    case 'profile_select':
      return `
        <div class="panel panel-bronze dossier-panel">
          <div class="panel-header">
            <h2>${TERMS.MENU.PROFILES}</h2>
            <div style="display:flex; gap:8px;">
              <button id="btn-new-profile" class="btn btn-primary">ساخت پرونده جدید</button>
              <button id="btn-back-menu" class="btn">بازگشت</button>
            </div>
          </div>
          ${
            engine.profiles.length === 0
              ? '<p style="color:var(--text-muted);">هنوز پرونده‌ای ساخته نشده است. یک پرونده جدید بسازید.</p>'
              : `<div class="grid-3">
                  ${engine.profiles
                    .map((p) => {
                      const pIdx = getPlayerPortraitIndex(p.appearance.appearanceIndex, p.appearance.outfitIndex);
                      const prog = computeLearningProgress(p);
                      const confirming = uiState.deleteConfirmProfileId === p.id;
                      return `
                        <div class="panel" style="background:var(--bg-charcoal-dk);">
                          <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
                            <div class="pixel-portrait" style="${portraitStyle(pIdx)}"></div>
                            <div>
                              <h3>${p.displayName}</h3>
                              <div style="font-size:0.84rem; color:var(--text-muted);">${p.appearance.codename}</div>
                              <div style="font-size:0.8rem; color:var(--accent-bronze-lt);">دقت یادگیری: ${prog.accuracyPct}% (${prog.totalCorrect}/${prog.totalAttempted})</div>
                            </div>
                          </div>
                          <div style="display:flex; gap:8px; justify-content:space-between;">
                            <button class="btn btn-primary" data-select-profile="${p.id}" style="flex:1;">ورود به لابی</button>
                            ${
                              confirming
                                ? `<button class="btn btn-danger" data-confirm-del-profile="${p.id}">تایید حذف</button>`
                                : `<button class="btn btn-danger" data-del-profile="${p.id}">حذف</button>`
                            }
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>`
          }
        </div>
      `;

    case 'character_create': {
      const previewIdx = getPlayerPortraitIndex(uiState.charApp, uiState.charOut);
      return `
        <div class="panel panel-bronze dossier-panel char-create-shell">
          <div class="panel-header" style="margin-bottom:10px; padding-bottom:8px;">
            <h2>ساخت شخصیت و پرونده فرمانده (24 ترکیب ظاهر)</h2>
            <button id="btn-cancel-char" class="btn">بازگشت</button>
          </div>
          <div class="grid-2" style="gap:16px;">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div class="grid-2" style="gap:10px;">
                <div>
                  <label style="display:block; margin-bottom:3px; font-size:0.84rem;">نام فرمانده</label>
                  <input id="inp-char-name" class="input-field" value="${uiState.charName}" placeholder="مثلاً: کیان سهرابی" />
                </div>
                <div>
                  <label style="display:block; margin-bottom:3px; font-size:0.84rem;">عنوان سازمانی</label>
                  <input id="inp-char-codename" class="input-field" value="${uiState.charCodename}" />
                </div>
              </div>
              <div>
                <label style="display:block; margin-bottom:4px; font-size:0.84rem;">مدل سر و مو (6 مدل)</label>
                <div class="grid-3" style="gap:6px;">
                  ${PLAYER_APPEARANCES.map(
                    (a, i) => `<button class="btn ${uiState.charApp === i ? 'btn-primary' : ''}" style="padding:6px 8px; font-size:0.78rem;" data-char-app="${i}">${a.name}</button>`
                  ).join('')}
                </div>
              </div>
              <div>
                <label style="display:block; margin-bottom:4px; font-size:0.84rem;">مجموعه لباس غیرنظامی (4 مدل)</label>
                <div class="grid-2" style="gap:6px;">
                  ${PLAYER_OUTFITS.map(
                    (o, i) => `<button class="btn ${uiState.charOut === i ? 'btn-primary' : ''}" style="padding:6px 8px; font-size:0.78rem;" data-char-out="${i}">${o.name}</button>`
                  ).join('')}
                </div>
              </div>
              <div>
                <label style="display:block; margin-bottom:4px; font-size:0.84rem;">انتخاب سریع از تمام 24 ترکیب (6×4)</label>
                <div class="variant-grid-24">
                  ${PLAYER_APPEARANCES.flatMap((a, ai) =>
                    PLAYER_OUTFITS.map((o, oi) => {
                      const pSlot = getPlayerPortraitIndex(ai, oi);
                      const col = pSlot % 5;
                      const row = Math.floor(pSlot / 5);
                      const active = uiState.charApp === ai && uiState.charOut === oi;
                      return `
                        <button class="variant-tile ${active ? 'active' : ''}" data-pick-combo="${ai}:${oi}" title="${a.name} — ${o.name}">
                          <span class="variant-thumb" style="background-position: -${col * 32}px -${row * 32}px;"></span>
                          <span dir="ltr">#${ai * 4 + oi + 1}</span>
                        </button>
                      `;
                    })
                  ).join('')}
                </div>
              </div>
            </div>
            <div class="panel" style="background:var(--bg-charcoal-dk); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;">
              <div style="display:flex; align-items:center; gap:18px;">
                <div class="pixel-portrait pixel-portrait-lg" style="${portraitStyle(previewIdx)}"></div>
                <div style="padding:10px; background:rgba(23,27,32,0.9); border:1.5px solid var(--accent-bronze); border-radius:8px;">
                  <canvas id="char-sprite-preview" width="32" height="48" style="width:48px; height:72px; image-rendering:pixelated; display:block;"></canvas>
                </div>
              </div>
              <div style="text-align:center;">
                <h3>${uiState.charName || 'فرمانده جدید'}</h3>
                <div style="color:var(--accent-bronze-lt); font-size:0.86rem;">${PLAYER_APPEARANCES[uiState.charApp]?.name} — ${PLAYER_OUTFITS[uiState.charOut]?.name}</div>
                <div style="color:var(--text-muted); font-size:0.82rem;">${uiState.charCodename || 'فرمانده واحد تحلیلی'} — ژنو 2041</div>
              </div>
              <button id="btn-create-char-submit" class="btn btn-primary" style="width:100%;">ثبت پرونده و ورود به لابی</button>
            </div>
          </div>
        </div>
      `;
    }

    case 'main_lobby': {
      const prof = engine.activeProfile;
      const pIdx = getPlayerPortraitIndex(prof.appearance.appearanceIndex, prof.appearance.outfitIndex);
      const prog = computeLearningProgress(prof);
      const { validSlots } = storage.loadSaveSlots();
      const mySaves = validSlots.filter((s) => s.profileId === prof.id);
      return `
        <div class="grid-2">
          <div class="panel panel-bronze dossier-panel">
            <div class="panel-header">
              <h2>سالن فرماندهی (لابی اصلی) <span class="ltr-token" dir="ltr" style="font-size:0.8rem; margin-right:6px;">${GAME_FULL_TITLE}</span></h2>
              <button id="btn-lobby-profiles" class="btn">تغییر پرونده</button>
            </div>
            <div style="display:flex; gap:16px; align-items:center; margin-bottom:18px;">
              <div class="pixel-portrait" style="${portraitStyle(pIdx)}"></div>
              <div>
                <h3>${prof.displayName}</h3>
                <div style="color:var(--text-muted); font-size:0.9rem;">${prof.appearance.codename}</div>
                <div style="color:var(--accent-bronze-lt); font-size:0.85rem;">پاسخ‌های صحیح ثبت‌شده: ${prog.totalCorrect} از ${prog.totalAttempted}</div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <button id="btn-lobby-new-campaign" class="btn btn-primary">${icon('campaign')} شروع کارزار جدید</button>
              <button id="btn-lobby-continue" class="btn btn-olive" ${mySaves.length > 0 ? '' : 'disabled'}>${icon('operation')} ادامه کارزار ذخیره شده</button>
              <button id="btn-lobby-learning" class="btn">${icon('math')} بایگانی یادگیری و آمار</button>
              <button id="btn-lobby-saves" class="btn">${icon('save')} مدیریت ذخیره‌ها و پشتیبان</button>
              <button id="btn-lobby-credits" class="btn">${icon('file')} سازندگان (CREDITS)</button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div style="display:flex; align-items:center; gap:8px;"><span class="pulse-dot"></span><h3>وضعیت فعلی شبکه CIPHER</h3></div>
            </div>
            <p style="line-height:1.8;">
              لابی مرکزی دروازه ورود به کارزارها و مرور آمار یادگیری شماست. برای آغاز تحقیق میدانی، از کارزار <strong class="ltr-token" dir="ltr">${TERMS.MAIN_CASE_NAME}</strong> وارد مقر <span class="ltr-token" dir="ltr">CIPHER</span> شوید.
            </p>
            <div class="grid-2" style="margin-top:16px;">
              <div class="panel" style="background:var(--bg-charcoal-dk);">
                <div style="color:var(--text-muted); font-size:0.85rem;">ذخیره‌های موجود</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--accent-bronze-lt);">${mySaves.length}</div>
              </div>
              <div class="panel" style="background:var(--bg-charcoal-dk);">
                <div style="color:var(--text-muted); font-size:0.85rem;">دقت کل ریاضی</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--accent-olive-lt);">${prog.accuracyPct}%</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    case 'campaign_select':
      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:820px; margin:0 auto;">
          <div class="panel-header">
            <h2>انتخاب کارزار</h2>
            <button id="btn-back-lobby" class="btn">بازگشت به لابی</button>
          </div>
          <div class="panel" style="background:var(--bg-charcoal-dk); border-color:var(--accent-bronze);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h3>${CAMPAIGN_SILENT_ARCHIVE.title} (<span class="ltr-token" dir="ltr">${CAMPAIGN_SILENT_ARCHIVE.codeName}</span>)</h3>
              <span class="badge badge-fact">نسخه 2.2.1 — تحقیق غیرخطی چپتر 1</span>
            </div>
            <p style="color:var(--text-muted);">${CAMPAIGN_SILENT_ARCHIVE.subtitle}</p>
            <p style="line-height:1.8;">${CAMPAIGN_SILENT_ARCHIVE.synopsis}</p>
            <button id="btn-choose-campaign" class="btn btn-primary" style="margin-top:10px;">انتخاب درجه سختی و آغاز</button>
          </div>
        </div>
      `;

    case 'difficulty_select':
      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:880px; margin:0 auto;">
          <div class="panel-header">
            <h2>انتخاب درجه سختی کارزار (قفل‌شونده در شروع)</h2>
            <button id="btn-back-camp" class="btn">بازگشت</button>
          </div>
          <p style="color:var(--text-muted); margin-bottom:14px;">
            سختی کارزار پس از آغاز قفل می‌شود. تنظیمات دسترسی‌پذیری یادگیری (مانند زمان بیشتر یا کنتراست بالا) مستقل از این انتخاب در بخش تنظیمات همیشه در دسترس هستند.
          </p>
          <div class="grid-2">
            ${Object.values(DIFFICULTY_PRESETS)
              .map(
                (d) => `
              <div class="panel" style="background:var(--bg-charcoal-dk); border-color:${uiState.selectedDifficulty === d.id ? 'var(--accent-bronze-lt)' : 'var(--border-subtle)'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <h3>${d.label}</h3>
                  <span class="ltr-token" dir="ltr">${d.startingOC} OC</span>
                </div>
                <p style="font-size:0.88rem; color:var(--text-muted); min-height:46px;">${d.description}</p>
                <button class="btn ${uiState.selectedDifficulty === d.id ? 'btn-primary' : ''}" data-pick-diff="${d.id}" style="width:100%;">
                  انتخاب سطح ${d.label}
                </button>
              </div>
            `
              )
              .join('')}
          </div>
          <div style="margin-top:18px; display:flex; justify-content:flex-end;">
            <button id="btn-confirm-difficulty" class="btn btn-primary">تایید و ورود به مقر CIPHER</button>
          </div>
        </div>
      `;

    case 'hq': {
      const scene = engine.explorationEngine.activeScene || CHAPTER_1_CASE.scenes.cipher_hq;
      const nearest = uiState.nearestInteractable;
      const unlockedCount = Object.values(engine.state.evidenceStates || {}).filter((e) => e && e.discoveredAt).length;
      const nearText = nearest
        ? nearest.enabled
          ? `[E] ${nearest.kind === 'npc' ? `گفت‌وگو با ${nearest.item.name}` : nearest.item.label}`
          : `${nearest.item.label} (${nearest.failedRequirement || 'قفل'})`
        : '';

      return `
        <div class="exploration-viewport">
          <canvas id="scene-canvas" width="768" height="480"></canvas>

          <div class="hud-float-tr">
            <div style="font-weight:700; color:var(--accent-bronze-lt); font-size:0.92rem;">${scene.name}</div>
            <div style="font-size:0.76rem; color:var(--text-muted);">${scene.sectionName || ''} | مدارک: <strong style="color:var(--text-light);">${unlockedCount} / 5</strong></div>
          </div>

          <div class="hud-float-tl">
            ${
              scene.id === 'cipher_hq'
                ? `
                  <button class="btn" data-scene-transfer="server_room_7">اتاق سرور 7</button>
                  <button class="btn" id="btn-quick-board">تخته شواهد</button>
                  <button class="btn" data-talk-npc="npc-arman">آرمان</button>
                  <button class="btn" id="btn-quick-team">تیم</button>
                  <button class="btn btn-olive" id="btn-quick-decision">گزارش نهایی</button>
                `
                : `
                  <button class="btn" data-obj-interact="obj-sr7-terminal">ترمینال (EV-01)</button>
                  <button class="btn" data-obj-interact="obj-sr7-thermal">حرارتی (EV-04)</button>
                  <button class="btn" data-obj-interact="obj-sr7-rack">رک کلید (EV-05)</button>
                  <button class="btn" id="btn-quick-board">تخته شواهد</button>
                  <button class="btn btn-olive" data-scene-transfer="cipher_hq">بازگشت به مقر</button>
                `
            }
            <button class="btn" id="btn-cam-zoom-in" title="بزرگ‌نمایی دوربین">+</button>
            <button class="btn" id="btn-cam-zoom-out" title="کوچک‌نمایی دوربین">-</button>
            <button class="btn" id="btn-cam-zoom-reset" title="بازنشانی دوربین">100%</button>
            <button class="btn" id="btn-hq-to-lobby">لابی</button>
          </div>

          <div class="hud-float-bottom">
            <button id="btn-scene-interact" class="btn btn-primary" style="pointer-events:auto; padding:6px 16px; display:${nearest ? 'inline-flex' : 'none'};">
              ${nearText}
            </button>
            <div class="hud-controls-bar">
              <span class="ltr-token" dir="ltr">WASD / Arrows</span> حرکت | کلیک: مسیریابی <span class="ltr-token" dir="ltr">A*</span> | <span class="ltr-token" dir="ltr">E</span>: تعامل | <span class="ltr-token" dir="ltr">ESC</span>: توقف
            </div>
          </div>
        </div>
      `;
    }

    case 'briefing':
      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:840px; margin:0 auto;">
          <div class="panel-header">
            <h2>توجیه عملیات — ${CAMPAIGN_SILENT_ARCHIVE.directorBriefing.speaker}</h2>
            <button id="btn-briefing-hq" class="btn">ورود به مقر CIPHER</button>
          </div>
          <div style="display:flex; gap:18px; align-items:flex-start;">
            <div class="pixel-portrait" style="${portraitStyle(CAMPAIGN_SILENT_ARCHIVE.directorBriefing.portraitIndex)}"></div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${CAMPAIGN_SILENT_ARCHIVE.directorBriefing.lines
                .map((line) => `<p style="margin:0; padding:10px 14px; background:var(--bg-charcoal-dk); border-radius:8px;">${line}</p>`)
                .join('')}
            </div>
          </div>
          <div style="margin-top:18px; display:flex; justify-content:flex-end; gap:10px;">
            <button id="btn-briefing-to-op" class="btn btn-primary">آغاز تحقیق میدانی در مقر و اتاق سرور 7</button>
          </div>
        </div>
      `;

    case 'operation': {
      const stages = CAMPAIGN_SILENT_ARCHIVE.operation.stages;
      return `
        <div class="panel panel-bronze dossier-panel">
          <div class="panel-header">
            <div>
              <h2>${CAMPAIGN_SILENT_ARCHIVE.operation.title}</h2>
              <div style="font-size:0.88rem; color:var(--text-muted);">${CAMPAIGN_SILENT_ARCHIVE.operation.objective}</div>
            </div>
            <button id="btn-op-hq" class="btn">بازگشت به مقر</button>
          </div>
          <div class="grid-2">
            ${stages
              .map((st, idx) => {
                const done = engine.state.completedStageIds.includes(st.id);
                const isCurrent = idx === engine.state.currentStageIndex;
                const locked = idx > engine.state.currentStageIndex && !done;
                const score3d = compute3DDifficultyScore(st.difficulty);
                return `
                  <div class="panel" style="background:var(--bg-charcoal-dk); border-color:${isCurrent ? 'var(--accent-bronze-lt)' : 'var(--border-subtle)'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <h3>${st.title}</h3>
                      <span class="badge ${done ? 'badge-fact' : isCurrent ? 'badge-interp' : 'badge-hyp'}">
                        ${done ? 'تکمیل‌شده' : isCurrent ? 'فعال' : 'قفل'}
                      </span>
                    </div>
                    <p style="font-size:0.88rem; color:var(--text-muted);">${st.narrativeIntro}</p>
                    <div style="font-size:0.8rem; color:var(--accent-bronze-lt); margin-bottom:10px;">
                      سختی ترکیبی (ریاضی/عملیاتی/داستانی): ${score3d} | پاداش مرحله: ${st.stageRewardOC} OC
                    </div>
                    <button class="btn ${isCurrent ? 'btn-primary' : ''}" data-open-stage="${idx}" ${locked ? 'disabled' : ''}>
                      ${isCurrent ? 'ورود به مرحله' : done ? 'مرور / تلاش مجدد' : 'قفل'}
                    </button>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    case 'stage': {
      const stage = engine.getCurrentStage();
      const retryCount = engine.state.stageRetryCounts[stage.id] || 0;
      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:780px; margin:0 auto;">
          <div class="panel-header">
            <h2>${stage.title}</h2>
            <span class="badge badge-interp">ماموریت ${engine.state.currentTaskIndex + 1} از ${stage.taskQuestionIds.length}</span>
          </div>
          <p style="line-height:1.8;">${stage.narrativeIntro}</p>
          ${
            retryCount > 0
              ? `<div style="padding:8px 12px; background:rgba(168,121,67,0.16); border-radius:6px; margin-bottom:12px;">
                  حالت تلاش مجدد (تکرار ${retryCount}): سوالات جایگزین فعال شده‌اند و پاداش تکراری غیرفعال است.
                </div>`
              : ''
          }
          <div style="display:flex; justify-content:space-between; margin-top:16px;">
            <button id="btn-stage-back-op" class="btn">بازگشت به عملیات</button>
            <button id="btn-stage-start-task" class="btn btn-primary">آغاز ماموریت تحلیلی</button>
          </div>
        </div>
      `;
    }

    case 'task':
      return renderTaskAndSolution(false);

    case 'solution':
      return renderTaskAndSolution(true);

    case 'evidence_board':
      return renderEvidenceBoardScreen(engine, uiState.board);

    case 'operation_results': {
      const isFailed = engine.state.failureLevel === 'critical';
      const ev = engine.lastEvaluation;
      const unlockedCount = Object.values(engine.state.evidenceStates || {}).filter((e) => e && e.discoveredAt).length;
      const qualityTitle =
        ev?.quality === 'optimal'
          ? 'نتیجه‌گیری قطعی (مسیر بهینه — فیلم دوربین)'
          : ev?.quality === 'valid_alternative'
          ? 'نتیجه‌گیری معتبر جایگزین (مسیر تله‌متری و رک)'
          : ev?.quality === 'flawed'
          ? 'گزارش ناقص / فرضیه اشتباه'
          : CAMPAIGN_SILENT_ARCHIVE.conclusion.title;

      return `
        <div class="panel panel-bronze dossier-panel" style="max-width:820px; margin:0 auto;">
          <div class="panel-header">
            <h2>${isFailed ? 'وضعیت بحرانی عملیات' : qualityTitle}</h2>
            <span class="badge ${isFailed || ev?.quality === 'flawed' ? 'badge-hyp' : 'badge-fact'}">
              ${isFailed ? 'پایداری صفر شد' : ev?.quality === 'flawed' ? 'کاهش پایداری' : 'پرونده مختومه شد'}
            </span>
          </div>
          <p style="line-height:1.85;">
            ${
              isFailed
                ? 'پایداری واحد تحلیلی به صفر رسید. می‌توانید مرحله فعلی را با پایداری 100% و سوالات جایگزین دوباره آغاز کنید.'
                : ev?.quality === 'optimal'
                ? 'با تطبیق لاگ سرور 7 و فیلم دوربین راهرو طبقه اول، ثابت کردید تکنسین شیفت بی‌گناه بوده و نفوذ از راه دور توسط THE VEIL انجام شده است.'
                : ev?.quality === 'valid_alternative'
                ? 'بدون نیاز به فیلم دوربین، با همبستگی سنسور حرارتی و کلیدهای رک پشتیبان، نفوذ از راه دور THE VEIL را اثبات کردید.'
                : 'گزارش نهایی پیش از اثبات کامل مسیر یا با تکیه بر فرضیه گمراه‌کننده ثبت شد و موجب اخطار انضباطی و کاهش پایداری گردید.'
            }
          </p>
          ${
            ev?.reasons?.length
              ? `<ul style="font-size:0.9rem; color:var(--text-muted); margin-bottom:14px;">${ev.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`
              : ''
          }
          <div class="grid-3" style="margin:16px 0;">
            <div class="panel" style="background:var(--bg-charcoal-dk);">
              <div style="color:var(--text-muted); font-size:0.84rem;">امتیاز عملکرد</div>
              <div style="font-size:1.5rem; color:var(--accent-bronze-lt); font-weight:700;">${engine.state.performanceScore}</div>
            </div>
            <div class="panel" style="background:var(--bg-charcoal-dk);">
              <div style="color:var(--text-muted); font-size:0.84rem;">اعتبار عملیاتی باقی‌مانده</div>
              <div style="font-size:1.5rem; color:var(--accent-olive-lt); font-weight:700;">${engine.state.operationalCredits} OC</div>
            </div>
            <div class="panel" style="background:var(--bg-charcoal-dk);">
              <div style="color:var(--text-muted); font-size:0.84rem;">مدارک کشف‌شده</div>
              <div style="font-size:1.5rem; color:var(--text-light); font-weight:700;">${unlockedCount} / 5</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            ${
              isFailed
                ? `<button id="btn-retry-stage" class="btn btn-primary">تلاش مجدد مرحله (پایداری 100%)</button>`
                : `<button id="btn-results-progression" class="btn btn-primary">مشاهده پیشرفت کارزار</button>`
            }
            <button id="btn-results-hq" class="btn">بازگشت به مقر</button>
          </div>
        </div>
      `;
    }

    case 'save_recovery': {
      const { validSlots, corruptedSlots } = storage.loadSaveSlots();
      const sorted = [...validSlots].sort((a, b) =>
        uiState.saveSort === 'name'
          ? a.name.localeCompare(b.name)
          : new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      );
      return `
        <div class="panel panel-bronze dossier-panel">
          <div class="panel-header">
            <h2>مدیریت ذخیره‌ها، بازیابی و پشتیبان‌گیری</h2>
            <div style="display:flex; gap:8px;">
              <button id="btn-export-backup" class="btn btn-digital">خروجی پشتیبان (JSON)</button>
              <label class="btn" style="cursor:pointer;">
                وارد کردن پشتیبان
                <input id="inp-import-backup" type="file" accept=".json" style="display:none;" />
              </label>
              <button id="btn-save-back" class="btn">بازگشت</button>
            </div>
          </div>

          ${
            corruptedSlots.length > 0
              ? `<div style="padding:10px 14px; background:rgba(143,69,69,0.24); border:1px solid var(--accent-red); border-radius:6px; margin-bottom:14px;">
                  هشدار بازیابی: ${corruptedSlots.length} فایل ذخیره آسیب‌دیده شناسایی و قرنطینه شد تا از خرابی بازی جلوگیری شود.
                </div>`
              : ''
          }

          ${
            engine.state
              ? `<div style="display:flex; gap:10px; margin-bottom:16px; align-items:center;">
                  <input id="inp-manual-save-name" class="input-field" style="max-width:300px;" placeholder="نام ذخیره دستی جدید..." />
                  <button id="btn-create-manual-save" class="btn btn-primary">ایجاد ذخیره دستی</button>
                  <select id="sel-save-sort" class="input-field" style="width:auto;">
                    <option value="newest" ${uiState.saveSort === 'newest' ? 'selected' : ''}>مرتب‌سازی: جدیدترین</option>
                    <option value="name" ${uiState.saveSort === 'name' ? 'selected' : ''}>مرتب‌سازی: نام</option>
                  </select>
                </div>`
              : ''
          }

          <div style="display:flex; flex-direction:column; gap:10px;">
            ${
              sorted.length === 0
                ? '<p style="color:var(--text-muted);">هیچ ذخیره معتبری ثبت نشده است.</p>'
                : sorted
                    .map((s) => {
                      const delConf = uiState.deleteConfirmSlotId === s.slotId;
                      const owConf = uiState.overwriteConfirmSlotId === s.slotId;
                      const isRenaming = uiState.renamingSlotId === s.slotId;
                      return `
                        <div class="panel" style="background:var(--bg-charcoal-dk); display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                          <div>
                            ${
                              isRenaming
                                ? `<div style="display:flex; gap:6px; align-items:center;">
                                    <input id="inp-rename-slot" class="input-field" value="${s.name}" style="max-width:220px; padding:4px 8px;" />
                                    <button id="btn-confirm-rename" data-slot-id="${s.slotId}" class="btn btn-olive" style="padding:4px 10px;">ثبت</button>
                                    <button id="btn-cancel-rename" class="btn" style="padding:4px 10px;">لغو</button>
                                  </div>`
                                : `<strong>${s.name}</strong>`
                            }
                            <span class="badge ${s.isCheckpoint ? 'badge-fact' : 'badge-interp'}" style="margin-right:6px;">
                              ${s.isAutoSave ? 'خودکار' : s.isCheckpoint ? 'نقطه بازبینی' : 'دستی'}
                            </span>
                            <div style="font-size:0.82rem; color:var(--text-muted);">
                              پرونده: ${s.profileName} | ${s.stageLabel} | Checksum: <span dir="ltr">${s.checksum}</span>
                            </div>
                          </div>
                          <div style="display:flex; gap:8px;">
                            <button class="btn btn-primary" data-load-slot="${s.slotId}">بارگذاری</button>
                            <button class="btn" data-rename-slot="${s.slotId}">تغییر نام</button>
                            ${
                              engine.state && !s.isAutoSave
                                ? owConf
                                  ? `<button class="btn btn-olive" data-confirm-ow-slot="${s.slotId}">تایید بازنویسی</button>`
                                  : `<button class="btn" data-ow-slot="${s.slotId}">بازنویسی</button>`
                                : ''
                            }
                            ${
                              delConf
                                ? `<button class="btn btn-danger" data-confirm-del-slot="${s.slotId}">تایید حذف</button>`
                                : `<button class="btn btn-danger" data-del-slot="${s.slotId}">حذف</button>`
                            }
                          </div>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      `;
    }

    case 'campaign_progression': {
      const prog = engine.activeProfile ? computeLearningProgress(engine.activeProfile) : null;
      return `
        <div class="panel panel-bronze dossier-panel char-create-shell">
          <div class="panel-header">
            <h2>پیشرفت کارزار و بایگانی یادگیری</h2>
            <button id="btn-prog-lobby" class="btn">بازگشت به لابی</button>
          </div>
          ${
            engine.state
              ? `<p>${CAMPAIGN_SILENT_ARCHIVE.conclusion.consequencesSuccess}</p>
                 <div style="margin-bottom:14px;">فصل‌های تکمیل‌شده: <strong>${engine.state.completedStageIds.length} از 5</strong></div>`
              : ''
          }
          ${
            prog
              ? `<div>
                  <h3>آمار تسلط بر فصل‌های ریاضی نهم (دقت کل: ${prog.accuracyPct}%)</h3>
                  <div class="grid-3" style="margin-top:10px;">
                    ${Object.entries(prog.chaptersMastered)
                      .map(
                        ([ch, d]) => `
                      <div class="panel" style="background:var(--bg-charcoal-dk);">
                        <strong>فصل ${ch}</strong>
                        <div style="color:var(--accent-bronze-lt);">${d.correct} از ${d.attempted} صحیح</div>
                      </div>
                    `
                      )
                      .join('') || '<div style="color:var(--text-muted);">هنوز سوالی ثبت نشده است.</div>'}
                  </div>
                </div>`
              : ''
          }
        </div>
      `;
    }

    default:
      return '';
  }
}

function renderModalOverlay() {
  if (!modalOverlay) return '';
  if (modalOverlay === 'settings') {
    const s = engine.settings;
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:90; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:520px;">
          <div class="panel-header">
            <h3>تنظیمات سامانه و دسترسی‌پذیری یادگیری</h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>زمان بیشتر برای تحلیل سوالات (مستقل از سختی کارزار)</span>
              <input id="set-extra-time" type="checkbox" ${s.extraTime ? 'checked' : ''} />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>کنتراست بالای فرمول‌های ریاضی</span>
              <input id="set-high-contrast" type="checkbox" ${s.highContrastMath ? 'checked' : ''} />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>جلوه‌های صوتی فعال</span>
              <input id="set-audio" type="checkbox" ${s.audioEnabled ? 'checked' : ''} />
            </label>
          </div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'credits') {
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:90; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:560px;">
          <div class="panel-header">
            <h3>سازندگان (<span class="ltr-token" dir="ltr">CREDITS</span>) — <span class="ltr-token" dir="ltr">${GAME_FULL_TITLE}</span></h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
            ${CREDITS_INFO.map(
              (c) => `<div class="panel" style="background:var(--bg-charcoal-dk); padding:10px 14px;">
                <div style="font-size:0.84rem; color:var(--accent-bronze-lt);">${c.role}</div>
                <div style="font-weight:700;">${c.name}</div>
              </div>`
            ).join('')}
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted); text-align:left;" dir="ltr">Release: ${GAME_FULL_TITLE} (Offline PC)</div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'team' && engine.state) {
    const mod = engine.getTeamModifiers();
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:60; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:760px; max-height:85vh; overflow-y:auto;">
          <div class="panel-header">
            <h3>مدیریت تیم عملیاتی (هم‌افزایی: ${mod.synergyScore} | تخفیف راهنما: ${mod.hintDiscountOC} OC)</h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <div class="grid-2">
            ${engine.state.team
              .map(
                (m) => `
              <div class="panel" style="background:var(--bg-charcoal-dk);">
                <div style="display:flex; gap:12px; align-items:center; margin-bottom:8px;">
                  <div class="pixel-portrait" style="${portraitStyle(m.portraitIndex)}"></div>
                  <div>
                    <strong>${m.name}</strong>
                    <div style="font-size:0.82rem; color:var(--accent-bronze-lt);">${m.role}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">تخصص اصلی: ${m.primarySpec}</div>
                  </div>
                </div>
                <div style="font-size:0.82rem; margin-bottom:8px;">
                  تحلیل: ${m.attributes.analysis} | فنی: ${m.attributes.technical} | خونسردی: ${m.attributes.composure}<br>
                  خستگی: ${m.fatigue}% | فشار روانی: ${m.stress}%
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn ${m.assignedToStage ? 'btn-olive' : ''}" data-toggle-team="${m.id}" style="flex:1;">
                    ${m.assignedToStage ? 'در ماموریت فعال' : 'اعزام به ماموریت'}
                  </button>
                  <button class="btn" data-rest-team="${m.id}">استراحت</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'dialogue' && uiState.activeDialogueId && engine.state) {
    const dlg = CHAPTER_1_CASE.dialogues[uiState.activeDialogueId];
    if (!dlg) return '';
    const visibleChoices = (dlg.choices || []).filter((c) => {
      if (!c.condition) return true;
      if (c.condition.hasFlag) return Boolean(engine.state.worldFlags?.[c.condition.hasFlag]);
      return true;
    });
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:65; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:640px;">
          <div class="panel-header">
            <div style="display:flex; align-items:center; gap:12px;">
              <div class="pixel-portrait" style="${portraitStyle(dlg.portraitIndex)}"></div>
              <h3>${dlg.speaker}</h3>
            </div>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <p style="line-height:1.85; background:var(--bg-charcoal-dk); padding:12px 14px; border-radius:6px; margin-bottom:14px;">${dlg.text}</p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${visibleChoices
              .map(
                (c) => `<button class="btn btn-primary" data-dialogue-choice="${c.id}" style="justify-content:flex-start; text-align:right;">${c.label}</button>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'ops_overview' && engine.state) {
    const evList = Object.values(engine.state.evidenceStates || {});
    const foundCount = evList.filter((e) => e && e.discoveredAt).length;
    const unlockedSegs = evList.reduce((acc, e) => acc + (e.segments || []).filter((sg) => sg.unlocked).length, 0);
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:65; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:640px;">
          <div class="panel-header">
            <h3>کنسول مرکزی عملیات — SILENT ARCHIVE</h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px;">
            <div style="background:var(--bg-charcoal-dk); padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:0.8rem; color:var(--text-muted);">اعتبار عملیاتی (OC)</div>
              <strong class="ltr-token" dir="ltr" style="font-size:1.15rem; color:var(--accent-bronze-lt);">${engine.state.operationalCredits ?? 100}</strong>
            </div>
            <div style="background:var(--bg-charcoal-dk); padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:0.8rem; color:var(--text-muted);">پایداری عملیات</div>
              <strong class="ltr-token" dir="ltr" style="font-size:1.15rem; color:#779B70;">${engine.state.stability ?? 100}%</strong>
            </div>
            <div style="background:var(--bg-charcoal-dk); padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:0.8rem; color:var(--text-muted);">مدارک کشف‌شده</div>
              <strong class="ltr-token" dir="ltr" style="font-size:1.15rem; color:#75B8A8;">${foundCount} / ${evList.length} (${unlockedSegs} بخش باز)</strong>
            </div>
          </div>
          <div style="background:var(--bg-charcoal-dk); padding:12px; border-radius:6px; font-size:0.9rem; line-height:1.8;">
            <strong>اهداف فعال عملیات:</strong>
            <ul style="margin:6px 0 0 0; padding-right:18px;">
              <li>اعزام به اتاق سرور 7 و استخراج داده‌های ترمینال (<span dir="ltr">EV-01</span>)، سنسور حرارتی (<span dir="ltr">EV-04</span>) و کلیدهای پشتیبان (<span dir="ltr">EV-05</span>).</li>
              <li>تطبیق و اتصال مدارک روی تخته شواهد و بررسی فرضیه‌های رقیب.</li>
              <li>ارائه گزارش نهایی به مدیر کیانی در بال مدیریت.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'ops_display' && engine.state) {
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:65; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:640px;">
          <div class="panel-header">
            <h3>نمایشگر اصلی پرونده — ژنو 2041</h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.9rem; line-height:1.8;">
            <div style="background:var(--bg-charcoal-dk); padding:10px 12px; border-right:3px solid #75B8A8; border-radius:5px;">
              <strong>رخداد ثبت‌شده:</strong> ساعت <span dir="ltr">02:14</span> بامداد، همگام‌سازی غیرمجاز در بخش بایگانی اتاق سرور 7.
            </div>
            <div style="background:var(--bg-charcoal-dk); padding:10px 12px; border-right:3px solid var(--accent-bronze); border-radius:5px;">
              <strong>سرنخ اولیه:</strong> شناسه کارت <span dir="ltr">105</span> در لاگ ورود ثبت شده، اما الگوی حرارتی و دوربین راهرو طبقه اول نیازمند راستی‌آزمایی است.
            </div>
          </div>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'ops_station' && engine.state) {
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:65; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:600px;">
          <div class="panel-header">
            <h3>ایستگاه تحلیلگر عملیات</h3>
            <button id="btn-close-modal" class="btn">بستن</button>
          </div>
          <p style="line-height:1.85; background:var(--bg-charcoal-dk); padding:12px; border-radius:6px; font-size:0.9rem;">
            گزارش تکمیلی تیم عملیات: برای باز کردن سریع‌تر مسیر بهینه، علاوه بر مدارک <span dir="ltr">EV-01</span>، <span dir="ltr">EV-04</span> و <span dir="ltr">EV-05</span> در اتاق سرور 7، بررسی تناقض زمانی در پرونده دوربین (<span dir="ltr">EV-06</span>) و گفت‌وگو با آرمان راد کلیدی است.
          </p>
        </div>
      </div>
    `;
  }
  if (modalOverlay === 'decision' && engine.state) {
    const hyps = (engine.state.board?.hypotheses || []).filter((h) => !h.deleted);
    return `
      <div style="position:fixed; inset:0; background:rgba(12,14,18,0.82); z-index:65; display:flex; align-items:center; justify-content:center; padding:20px;">
        <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:660px;">
          <div class="panel-header">
            <h3>ثبت گزارش نهایی پرونده به مدیر کیانی</h3>
            <button id="btn-close-modal" class="btn">انصراف</button>
          </div>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:12px;">
            فرضیه‌ای که می‌خواهید به عنوان نتیجه‌گیری رسمی پرونده ثبت شود را انتخاب کنید. گزارش زودهنگام یا بدون اثبات کافی باعث کاهش پایداری عملیات می‌شود.
          </p>
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
            ${hyps
              .map(
                (h) => `
              <label class="panel" style="background:var(--bg-charcoal-dk); display:flex; gap:10px; align-items:flex-start; cursor:pointer; border-color:${uiState.selectedDecisionHypId === h.id ? 'var(--accent-bronze-lt)' : 'var(--border-subtle)'};">
                <input type="radio" name="decision-hyp" value="${h.id}" ${uiState.selectedDecisionHypId === h.id ? 'checked' : ''} style="margin-top:4px;" />
                <div>
                  <strong>${h.title}</strong>
                  <div style="font-size:0.84rem; color:var(--text-muted);">${h.summary}</div>
                </div>
              </label>
            `
              )
              .join('')}
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="btn-submit-final-decision" class="btn btn-primary">ثبت گزارش نهایی و بستن پرونده</button>
          </div>
        </div>
      </div>
    `;
  }
  return '';
}

function handleSceneInteractionResult(res) {
  if (!res) return;
  if (!res.ok) {
    sound.play('error');
    showToast(res.reason || 'شیء یا شخص قابل تعاملی در نزدیکی شما نیست.');
    return;
  }
  if (res.kind === 'door') {
    sound.play('door');
    showToast(res.state === 'open' ? 'در باز شد.' : 'در بسته شد.');
    return;
  }
  if (res.kind === 'npc') {
    sound.play('notify');
    uiState.activeDialogueId = res.npc.dialogueRootId;
    modalOverlay = 'dialogue';
    render();
    return;
  }
  if (res.kind === 'object') {
    const obj = res.object;
    if (obj.actionType === 'scene_transfer') {
      sound.play('door');
      engine.explorationEngine.loadScene(engine.state, obj.targetId);
      engine.autoSave();
      render();
    } else if (obj.actionType === 'open_board') {
      sound.play('click');
      navigate('evidence_board');
    } else if (obj.actionType === 'open_team') {
      sound.play('click');
      modalOverlay = 'team';
      render();
    } else if (obj.actionType === 'final_decision') {
      sound.play('notify');
      modalOverlay = 'decision';
      render();
    } else if (obj.actionType === 'evidence_math') {
      sound.play('click');
      engine.startExplorationMathTask(obj);
      navigate('task');
    } else if (obj.actionType === 'ops_overview' || obj.actionType === 'ops_display' || obj.actionType === 'ops_station') {
      sound.play('notify');
      modalOverlay = obj.actionType;
      render();
    }
  }
}

function bindEvents() {
  document.getElementById('hud-btn-pause')?.addEventListener('click', () => {
    sound.play('click');
    engine.pauseManager.pause(currentScreen);
    if (activeTimer) activeTimer.handleVisibilityChange(true);
    render();
  });
  document.getElementById('hud-btn-settings')?.addEventListener('click', () => {
    sound.play('click');
    modalOverlay = 'settings';
    render();
  });
  document.getElementById('hud-btn-save')?.addEventListener('click', () => {
    sound.play('click');
    navigate('save_recovery');
  });
  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    sound.play('click');
    modalOverlay = null;
    uiState.activeDialogueId = null;
    render();
  });

  // Pause Modal Events
  document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
    sound.play('click');
    engine.pauseManager.resume();
    if (activeTimer) activeTimer.handleVisibilityChange(false);
    render();
  });
  document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
    sound.play('click');
    modalOverlay = 'settings';
    render();
  });
  document.getElementById('btn-pause-save-menu')?.addEventListener('click', async () => {
    sound.play('save');
    const res = await engine.pauseManager.safeSaveAndTransition(
      () => engine.autoSave('ذخیره هنگام بازگشت به منو'),
      () => {} 
    );
    if (res.ok) {
      stopActiveTimer();
      if (sceneRenderer) { sceneRenderer.unmount(); sceneRenderer = null; }
      navigate('main_menu');
    } else {
      render();
    }
  });
  document.getElementById('btn-pause-save-exit')?.addEventListener('click', async () => {
    sound.play('save');
    const res = await engine.pauseManager.safeSaveAndTransition(
      () => engine.autoSave('ذخیره هنگام خروج امن'),
      () => {} 
    );
    if (res.ok) {
      stopActiveTimer();
      if (sceneRenderer) { sceneRenderer.unmount(); sceneRenderer = null; }
      navigate('safe_exit');
    } else {
      render();
    }
  });
  document.getElementById('btn-pause-retry-save')?.addEventListener('click', async () => {
    const res = await engine.pauseManager.safeSaveAndTransition(
      () => engine.autoSave('تلاش مجدد ذخیره'),
      () => {} 
    );
    if (res.ok) {
      stopActiveTimer();
      navigate('main_menu');
    } else {
      render();
    }
  });
  document.getElementById('btn-pause-force-exit')?.addEventListener('click', () => {
    engine.pauseManager.resume();
    stopActiveTimer();
    navigate('main_menu');
  });
  document.getElementById('btn-return-from-exit')?.addEventListener('click', () => {
    sound.play('click');
    navigate('main_menu');
  });

  // Settings modal
  document.getElementById('set-extra-time')?.addEventListener('change', (e) => {
    engine.settings.extraTime = e.target.checked;
    storage.saveSettings(engine.settings);
  });
  document.getElementById('set-high-contrast')?.addEventListener('change', (e) => {
    engine.settings.highContrastMath = e.target.checked;
    storage.saveSettings(engine.settings);
    render();
  });
  document.getElementById('set-audio')?.addEventListener('change', (e) => {
    engine.settings.audioEnabled = e.target.checked;
    storage.saveSettings(engine.settings);
  });

  // Team modal
  document.querySelectorAll('[data-toggle-team]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.play('click');
      engine.toggleTeamAssignment(btn.getAttribute('data-toggle-team'));
      render();
    });
  });
  document.querySelectorAll('[data-rest-team]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.play('click');
      engine.restTeamMember(btn.getAttribute('data-rest-team'));
      showToast('خستگی و فشار روانی عضو تیم کاهش یافت.');
    });
  });

  // Dialogue modal
  document.querySelectorAll('[data-dialogue-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dlg = CHAPTER_1_CASE.dialogues[uiState.activeDialogueId];
      const choice = dlg?.choices?.find((c) => c.id === btn.getAttribute('data-dialogue-choice'));
      if (!choice) return;
      sound.play('click');
      if (choice.grantFlag) engine.state.worldFlags[choice.grantFlag] = true;
      if (choice.grantEvidenceId) {
        engine.discoverEvidenceById(choice.grantEvidenceId, engine.state.currentSceneId);
        showToast('مدرک جدید به تخته شواهد اضافه شد.');
      }
      if (choice.openDecision) {
        uiState.activeDialogueId = null;
        modalOverlay = 'decision';
        render();
        return;
      }
      if (choice.nextNodeId) {
        uiState.activeDialogueId = choice.nextNodeId;
        engine.autoSave();
        render();
      } else {
        uiState.activeDialogueId = null;
        modalOverlay = null;
        engine.autoSave();
        render();
      }
    });
  });

  // Final Decision modal
  document.querySelectorAll('input[name="decision-hyp"]').forEach((r) => {
    r.addEventListener('change', () => {
      uiState.selectedDecisionHypId = r.value;
      render();
    });
  });
  document.getElementById('btn-submit-final-decision')?.addEventListener('click', () => {
    sound.play('success');
    engine.submitFinalInvestigationDecision(uiState.selectedDecisionHypId);
    modalOverlay = null;
    navigate('operation_results');
  });

  // Boot
  document.getElementById('btn-boot-continue')?.addEventListener('click', async () => {
    await initPromise;
    sound.play('click');
    navigate('main_menu');
  });

  // Main Menu
  document.getElementById('menu-new-game')?.addEventListener('click', () => {
    sound.play('click');
    navigate('character_create');
  });
  document.getElementById('menu-continue')?.addEventListener('click', () => {
    sound.play('click');
    const firstProf = engine.profiles[0];
    if (firstProf) {
      const rec = recoverBestSaveForProfile(storage, firstProf.id);
      if (rec.recovered) {
        engine.loadFromSlot(rec.slot);
        showToast(rec.message);
        navigate('hq');
        return;
      }
    }
    navigate('profile_select');
  });
  document.getElementById('menu-profiles')?.addEventListener('click', () => {
    sound.play('click');
    navigate('profile_select');
  });
  document.getElementById('menu-settings')?.addEventListener('click', () => {
    sound.play('click');
    modalOverlay = 'settings';
    render();
  });
  document.getElementById('menu-credits')?.addEventListener('click', () => {
    sound.play('click');
    modalOverlay = 'credits';
    render();
  });
  document.getElementById('menu-exit')?.addEventListener('click', () => {
    sound.play('click');
    navigate('safe_exit');
  });

  // Profile Select
  document.getElementById('btn-new-profile')?.addEventListener('click', () => {
    sound.play('click');
    navigate('character_create');
  });
  document.getElementById('btn-back-menu')?.addEventListener('click', () => {
    sound.play('click');
    navigate('main_menu');
  });
  document.querySelectorAll('[data-select-profile]').forEach((b) => {
    b.addEventListener('click', () => {
      sound.play('click');
      engine.selectProfile(b.getAttribute('data-select-profile'));
      navigate('main_lobby');
    });
  });
  document.querySelectorAll('[data-del-profile]').forEach((b) => {
    b.addEventListener('click', () => {
      uiState.deleteConfirmProfileId = b.getAttribute('data-del-profile');
      render();
    });
  });
  document.querySelectorAll('[data-confirm-del-profile]').forEach((b) => {
    b.addEventListener('click', () => {
      sound.play('click');
      engine.deleteProfile(b.getAttribute('data-confirm-del-profile'));
      uiState.deleteConfirmProfileId = null;
      render();
    });
  });


  // Character Creation
  if (currentScreen === 'character_create') {
    const spCanvas = document.getElementById('char-sprite-preview');
    if (spCanvas) {
      const spImg = new Image();
      spImg.src = '/assets/art/characters/player/spritesheet.png';
      spImg.onload = () => {
        const sctx = spCanvas.getContext('2d');
        sctx.imageSmoothingEnabled = false;
        const vIdx = uiState.charApp * 4 + uiState.charOut;
        sctx.clearRect(0, 0, 32, 48);
        sctx.drawImage(spImg, 0, vIdx * 4 * 48, 32, 48, 0, 0, 32, 48);
      };
    }
    document.querySelectorAll('[data-pick-combo]').forEach((b) => {
      b.addEventListener('click', () => {
        syncCharInputs();
        sound.play('click');
        const [ai, oi] = b.getAttribute('data-pick-combo').split(':').map(Number);
        uiState.charApp = ai;
        uiState.charOut = oi;
        render();
      });
    });
  }
  document.getElementById('btn-cancel-char')?.addEventListener('click', () => navigate('profile_select'));
  document.getElementById('inp-char-name')?.addEventListener('input', (e) => {
    uiState.charName = e.target.value;
  });
  document.getElementById('inp-char-codename')?.addEventListener('input', (e) => {
    uiState.charCodename = e.target.value;
  });
  const syncCharInputs = () => {
    const n = document.getElementById('inp-char-name')?.value;
    const c = document.getElementById('inp-char-codename')?.value;
    if (typeof n === 'string') uiState.charName = n;
    if (typeof c === 'string') uiState.charCodename = c;
  };
  document.querySelectorAll('[data-char-app]').forEach((b) => {
    b.addEventListener('click', () => {
      syncCharInputs();
      sound.play('click');
      uiState.charApp = Number(b.getAttribute('data-char-app'));
      render();
    });
  });
  document.querySelectorAll('[data-char-out]').forEach((b) => {
    b.addEventListener('click', () => {
      syncCharInputs();
      sound.play('click');
      uiState.charOut = Number(b.getAttribute('data-char-out'));
      render();
    });
  });
  document.getElementById('btn-create-char-submit')?.addEventListener('click', () => {
    const nameInput = document.getElementById('inp-char-name')?.value?.trim();
    if (!nameInput) {
      showToast('لطفاً نام فرمانده را وارد کنید.');
      return;
    }
    sound.play('success');
    engine.createProfile(nameInput, uiState.charApp, uiState.charOut, uiState.charCodename);
    uiState.charName = '';
    navigate('main_lobby');
  });

  // Lobby
  document.getElementById('btn-lobby-profiles')?.addEventListener('click', () => navigate('profile_select'));
  document.getElementById('btn-lobby-new-campaign')?.addEventListener('click', () => navigate('campaign_select'));
  document.getElementById('btn-lobby-continue')?.addEventListener('click', () => {
    const rec = recoverBestSaveForProfile(storage, engine.activeProfile.id);
    if (rec.recovered) {
      engine.loadFromSlot(rec.slot);
      showToast(rec.message);
      navigate('hq');
    }
  });
  document.getElementById('btn-lobby-learning')?.addEventListener('click', () => navigate('campaign_progression'));
  document.getElementById('btn-lobby-saves')?.addEventListener('click', () => navigate('save_recovery'));
  document.getElementById('btn-lobby-credits')?.addEventListener('click', () => { sound.play('click'); modalOverlay = 'credits'; render(); });

  // Campaign & Difficulty
  document.getElementById('btn-back-lobby')?.addEventListener('click', () => navigate('main_lobby'));
  document.getElementById('btn-choose-campaign')?.addEventListener('click', () => navigate('difficulty_select'));
  document.getElementById('btn-back-camp')?.addEventListener('click', () => navigate('campaign_select'));
  document.querySelectorAll('[data-pick-diff]').forEach((b) => {
    b.addEventListener('click', () => {
      sound.play('click');
      uiState.selectedDifficulty = b.getAttribute('data-pick-diff');
      render();
    });
  });
  document.getElementById('btn-confirm-difficulty')?.addEventListener('click', () => {
    sound.play('door');
    engine.startNewCampaign(uiState.selectedDifficulty);
    navigate('briefing');
  });

  // 2D Exploration Scene (cipher_hq / server_room_7)
  if (currentScreen === 'hq') {
    const canvas = document.getElementById('scene-canvas');
    if (canvas) {
      sceneRenderer = new SceneRenderer(
        canvas,
        engine.explorationEngine,
        engine.pauseManager,
        engine.activeProfile?.appearance,
        engine.state,
        (nearest) => {
          uiState.nearestInteractable = nearest;
          const btnEl = document.getElementById('btn-scene-interact');
          if (btnEl) {
            if (nearest) {
              btnEl.style.display = 'inline-flex';
              btnEl.textContent = nearest.enabled
                ? `[E] ${nearest.kind === 'npc' ? `گفت‌وگو با ${nearest.item.name}` : nearest.item.label}`
                : `${nearest.item.label} (${nearest.failedRequirement || 'قفل'})`;
            } else {
              btnEl.style.display = 'none';
            }
          }
        },
        () => {
          const res = engine.explorationEngine.interact(engine.state);
          handleSceneInteractionResult(res);
        },
        (errMsg) => showToast(errMsg)
      );
      sceneRenderer.mount();

      document.getElementById('btn-scene-interact')?.addEventListener('click', () => {
        const res = engine.explorationEngine.interact(engine.state);
        handleSceneInteractionResult(res);
      });
      document.getElementById('btn-quick-board')?.addEventListener('click', () => {
        sound.play('click');
        navigate('evidence_board');
      });
      document.getElementById('btn-quick-team')?.addEventListener('click', () => {
        sound.play('click');
        modalOverlay = 'team';
        render();
      });
      document.getElementById('btn-quick-decision')?.addEventListener('click', () => {
        sound.play('notify');
        modalOverlay = 'decision';
        render();
      });
      document.querySelectorAll('[data-scene-transfer]').forEach((b) => {
        b.addEventListener('click', () => {
          sound.play('door');
          engine.explorationEngine.loadScene(engine.state, b.getAttribute('data-scene-transfer'));
          engine.autoSave();
          render();
        });
      });
      document.querySelectorAll('[data-talk-npc]').forEach((b) => {
        b.addEventListener('click', () => {
          const scene = engine.explorationEngine.activeScene;
          const npc = scene?.npcs?.find((n) => n.id === b.getAttribute('data-talk-npc'));
          if (npc) {
            handleSceneInteractionResult({ ok: true, kind: 'npc', npc });
          }
        });
      });
      document.querySelectorAll('[data-obj-interact]').forEach((b) => {
        b.addEventListener('click', () => {
          const scene = engine.explorationEngine.activeScene;
          const obj = scene?.interactables?.find((o) => o.id === b.getAttribute('data-obj-interact'));
          if (obj) {
            handleSceneInteractionResult({ ok: true, kind: 'object', object: obj });
          }
        });
      });
    }
    document.getElementById('btn-cam-zoom-in')?.addEventListener('click', () => sceneRenderer?.setUserZoom(sceneRenderer.camera.userScale + 0.15));
    document.getElementById('btn-cam-zoom-out')?.addEventListener('click', () => sceneRenderer?.setUserZoom(sceneRenderer.camera.userScale - 0.15));
    document.getElementById('btn-cam-zoom-reset')?.addEventListener('click', () => sceneRenderer?.setUserZoom(1.0));
    document.getElementById('btn-hq-to-lobby')?.addEventListener('click', () => navigate('main_lobby'));
  }

  // Briefing / Operation / Stage
  document.getElementById('btn-briefing-hq')?.addEventListener('click', () => {
    engine.operationDirector.completeNode(CHAPTER_1_CASE, engine.state, 'ACT-1-BRIEF');
    navigate('hq');
  });
  document.getElementById('btn-briefing-to-op')?.addEventListener('click', () => {
    engine.operationDirector.completeNode(CHAPTER_1_CASE, engine.state, 'ACT-1-BRIEF');
    navigate('hq');
  });
  document.getElementById('btn-op-hq')?.addEventListener('click', () => navigate('hq'));
  document.querySelectorAll('[data-open-stage]').forEach((b) => {
    b.addEventListener('click', () => {
      sound.play('click');
      const idx = Number(b.getAttribute('data-open-stage'));
      engine.state.currentStageIndex = idx;
      navigate('stage');
    });
  });
  document.getElementById('btn-stage-back-op')?.addEventListener('click', () => navigate('operation'));
  document.getElementById('btn-stage-start-task')?.addEventListener('click', () => {
    sound.play('click');
    navigate('task');
  });

  // Task & Solution
  if (currentScreen === 'task') {
    const { taskState } = engine.beginOrResumeTask();
    stopActiveTimer();
    activeTimer = new TaskTimer(
      taskState.remainingSec,
      (rem, elap) => {
        if (engine.state?.activeTask) {
          engine.state.activeTask.remainingSec = rem;
          engine.state.activeTask.elapsedSec = elap;
        }
        const el = document.getElementById('task-timer-val');
        if (el) el.textContent = `${rem}s`;
      },
      () => {
        showToast('زمان پیشنهادی به پایان رسید؛ همچنان می‌توانید تحلیل خود را ثبت کنید.');
      }
    );
    if (engine.pauseManager.state.isPaused) activeTimer.handleVisibilityChange(true);
    activeTimer.start();

    document.querySelectorAll('[data-choice-idx]').forEach((b) => {
      b.addEventListener('click', () => {
        sound.play('click');
        engine.state.activeTask.selectedIndex = Number(b.getAttribute('data-choice-idx'));
        render();
      });
    });

    document.querySelectorAll('[data-help-type]').forEach((b) => {
      b.addEventListener('click', () => {
        const res = engine.useHelp(b.getAttribute('data-help-type'));
        if (!res.ok) {
          sound.play('error');
          showToast(res.reason);
        } else {
          sound.play('notify');
          render();
        }
      });
    });

    document.getElementById('btn-back-stage')?.addEventListener('click', () => {
      if (engine.state?.activeTaskContext) {
        engine.state.activeTask = null;
        engine.state.activeTaskContext = null;
        navigate('hq');
      } else {
        navigate('stage');
      }
    });
    document.getElementById('btn-submit-answer')?.addEventListener('click', () => {
      const sel = engine.state.activeTask.selectedIndex;
      if (sel === null) return;
      stopActiveTimer();
      const res = engine.submitTaskAnswer(sel);
      sound.play(res.isCorrect ? 'success' : 'error');
      navigate('solution');
    });
  }

  if (currentScreen === 'solution') {
    document.getElementById('btn-next-after-solution')?.addEventListener('click', () => {
      sound.play('click');
      const res = engine.advanceAfterSolution();
      if (res.outcome === 'critical_failure' || res.outcome === 'operation_complete') {
        navigate('operation_results');
      } else if (res.outcome === 'return_to_scene') {
        engine.explorationEngine.loadScene(engine.state, res.sceneId);
        showToast('تحلیل ریاضی ثبت شد و بخش قفل‌شده مدرک باز گردید.');
        navigate('hq');
      } else if (res.outcome === 'stage_complete') {
        showToast('مرحله تکمیل شد! مدارک جدید روی تخته شواهد باز شدند.');
        navigate('hq');
      } else {
        navigate('task');
      }
    });
  }

  // Evidence Board
  if (currentScreen === 'evidence_board') {
    bindEvidenceBoardEvents(appEl, engine, uiState.board, render, sound);
  }

  // Operation Results
  document.getElementById('btn-retry-stage')?.addEventListener('click', () => {
    sound.play('click');
    engine.retryCurrentStage();
    navigate('hq');
  });
  document.getElementById('btn-results-progression')?.addEventListener('click', () => navigate('campaign_progression'));
  document.getElementById('btn-results-hq')?.addEventListener('click', () => navigate('hq'));

  // Save / Recovery (No window.prompt!)
  document.getElementById('btn-save-back')?.addEventListener('click', () => {
    navigate(engine.state ? 'hq' : 'main_lobby');
  });
  document.getElementById('sel-save-sort')?.addEventListener('change', (e) => {
    uiState.saveSort = e.target.value;
    render();
  });
  document.getElementById('btn-create-manual-save')?.addEventListener('click', () => {
    const nm = document.getElementById('inp-manual-save-name')?.value || 'ذخیره دستی';
    sound.play('save');
    engine.saveManualSlot(nm);
    showToast('ذخیره دستی با موفقیت ثبت شد.');
  });
  document.querySelectorAll('[data-load-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-load-slot');
      const { validSlots } = storage.loadSaveSlots();
      const slot = validSlots.find((s) => s.slotId === id);
      if (slot && engine.loadFromSlot(slot)) {
        sound.play('save');
        showToast(`ذخیره "${slot.name}" بارگذاری شد.`);
        navigate('hq');
      }
    });
  });
  document.querySelectorAll('[data-rename-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      uiState.renamingSlotId = b.getAttribute('data-rename-slot');
      render();
    });
  });
  document.getElementById('btn-confirm-rename')?.addEventListener('click', (e) => {
    const id = e.currentTarget.getAttribute('data-slot-id');
    const val = document.getElementById('inp-rename-slot')?.value?.trim();
    if (val) {
      storage.renameSaveSlot(id, val);
      sound.play('save');
    }
    uiState.renamingSlotId = null;
    render();
  });
  document.getElementById('btn-cancel-rename')?.addEventListener('click', () => {
    uiState.renamingSlotId = null;
    render();
  });
  document.querySelectorAll('[data-ow-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      uiState.overwriteConfirmSlotId = b.getAttribute('data-ow-slot');
      render();
    });
  });
  document.querySelectorAll('[data-confirm-ow-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-confirm-ow-slot');
      engine.saveManualSlot('ذخیره بازنویسی‌شده', id);
      uiState.overwriteConfirmSlotId = null;
      sound.play('save');
      showToast('ذخیره با موفقیت بازنویسی شد.');
    });
  });
  document.querySelectorAll('[data-del-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      uiState.deleteConfirmSlotId = b.getAttribute('data-del-slot');
      render();
    });
  });
  document.querySelectorAll('[data-confirm-del-slot]').forEach((b) => {
    b.addEventListener('click', () => {
      storage.deleteSaveSlot(b.getAttribute('data-confirm-del-slot'));
      uiState.deleteConfirmSlotId = null;
      sound.play('click');
      render();
    });
  });
  document.getElementById('btn-export-backup')?.addEventListener('click', () => {
    const json = storage.exportBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cipher-backup-${Date.now()}.json`;
    a.click();
    showToast('فایل پشتیبان آماده دانلود شد.');
  });
  document.getElementById('inp-import-backup')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await storage.importBackupJSON(String(reader.result));
      if (res.ok) {
        engine.profiles = storage.loadProfiles();
        sound.play('save');
        showToast(`بازیابی انجام شد: ${res.profilesImported} پرونده و ${res.savesImported} ذخیره.`);
      } else {
        sound.play('error');
        showToast(res.error);
      }
    };
    reader.readAsText(file);
  });

  // Progression
  document.getElementById('btn-prog-lobby')?.addEventListener('click', () => {
    navigate(engine.state ? 'hq' : 'main_lobby');
  });
}

function render() {
  if (sceneRenderer) {
    sceneRenderer.unmount();
    sceneRenderer = null;
  }

  const bgClass =
    currentScreen === 'main_menu' || currentScreen === 'boot' || currentScreen === 'safe_exit'
      ? 'bg-menu'
      : currentScreen === 'main_lobby' || currentScreen === 'profile_select' || currentScreen === 'character_create'
      ? 'bg-lobby'
      : currentScreen === 'evidence_board'
      ? 'bg-evidence'
      : 'bg-briefing';

  const contrastClass = engine.settings.highContrastMath ? 'high-contrast-math' : '';

  appEl.innerHTML = `
    <div class="screen-bg ${bgClass} ${contrastClass} ${currentScreen === 'hq' ? 'is-exploration' : ''}">
      ${renderTopHud()}
      <main class="screen-content">
        ${renderScreenBody()}
      </main>
      ${renderModalOverlay()}
      ${renderPauseModal(engine.pauseManager)}
      ${toastMsg ? `<div id="toast-banner" class="toast-banner">${toastMsg}</div>` : ''}
    </div>
  `;

  bindEvents();
}

// Initial boot
render();

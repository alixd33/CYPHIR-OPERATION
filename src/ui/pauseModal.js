/**
 * Pause & Exit Modal UI (TDS v2.2.1 Mandatory MVP Feature)
 */

export function renderPauseModal(pauseManager) {
  if (!pauseManager?.state.isPaused) return '';
  const err = pauseManager.state.saveError;
  return `
    <div id="pause-overlay" style="position:fixed; inset:0; background:rgba(10,12,16,0.84); z-index:80; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div class="panel panel-bronze dossier-panel" style="width:100%; max-width:440px; text-align:center;">
        <div class="panel-header" style="justify-content:center;">
          <h2>توقف عملیات (Pause)</h2>
        </div>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">
          تایمر، حرکت و ورودی‌های بازی متوقف شده‌اند.
        </p>
        ${
          err
            ? `<div style="padding:10px; background:rgba(143,69,69,0.28); border:1px solid var(--accent-red); border-radius:6px; margin-bottom:12px; font-size:0.86rem;">
                خطای ذخیره‌سازی: ${err}
                <div style="display:flex; gap:8px; justify-content:center; margin-top:8px;">
                  <button id="btn-pause-retry-save" class="btn btn-primary">تلاش مجدد ذخیره</button>
                  <button id="btn-pause-force-exit" class="btn btn-danger">خروج بدون ذخیره</button>
                </div>
              </div>`
            : ''
        }
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="btn-pause-resume" class="btn btn-primary">ادامه بازی (Resume)</button>
          <button id="btn-pause-settings" class="btn">تنظیمات</button>
          <button id="btn-pause-save-menu" class="btn btn-olive">ذخیره و بازگشت به منوی اصلی</button>
          <button id="btn-pause-save-exit" class="btn btn-danger">ذخیره و خروج امن</button>
        </div>
      </div>
    </div>
  `;
}

export function renderSafeExitScreen() {
  return `
    <div class="panel panel-bronze dossier-panel" style="max-width:540px; margin:14vh auto; text-align:center;">
      <h2 style="color:var(--accent-bronze-lt); margin-bottom:10px;">خروج ایمن از OPERATION: CIPHER</h2>
      <p style="line-height:1.8; color:var(--text-light);">
        وضعیت پرونده و پیشرفت شما با موفقیت در حافظه محلی ذخیره شد. اکنون می‌توانید این پنجره مرورگر را ببندید و فایل <span class="ltr-token" dir="ltr">stop-cipher.bat</span> را اجرا کنید.
      </p>
      <button id="btn-return-from-exit" class="btn btn-primary" style="margin-top:12px;">بازگشت به منوی اصلی</button>
    </div>
  `;
}

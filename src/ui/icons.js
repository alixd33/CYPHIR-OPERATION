/**
 * Consistent SVG Icon Helper (stroke-width 1.75, 24x24)
 */

const ICON_PATHS = {
  nav: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  campaign: '<path d="M4 19V5a2 2 0 0 1 2-2h12l-2 5 2 5H6a2 2 0 0 0-2 2z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  team: '<circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M15 19a4.5 4.5 0 0 1 6-4"/>',
  evidence: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  operation: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  objective: '<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z"/>',
  resource: '<polygon points="12 2 20 7 20 17 12 22 4 17 4 7"/><circle cx="12" cy="12" r="3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  notification: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.8-2.5 2.2-2.5 4"/><circle cx="12" cy="17.5" r=".7"/>',
  math: '<path d="M4 13h4l2 6 4-14h6"/><path d="M15 13l4 4m0-4l-4 4"/>',
  status_ok: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  status_warn: '<path d="M12 3L2 20h20z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".7"/>',
  save: '<path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><rect x="8" y="3" width="7" height="5"/><rect x="7" y="13" width="10" height="8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hq: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><rect x="9" y="13" width="6" height="8"/>',
};

export function icon(name, cls = 'icon-svg') {
  const body = ICON_PATHS[name] || ICON_PATHS.file;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function getPlayerPortraitIndex(appearanceIndex = 0, outfitIndex = 0) {
  const idx = appearanceIndex * 4 + outfitIndex;
  return idx < 12 ? idx : idx + 8;
}

export function portraitStyle(index) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return `background-position: -${col * 64}px -${row * 64}px;`;
}

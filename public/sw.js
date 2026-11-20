const CACHE_NAME = 'cipher-cache-v2.2.8';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/src/main.js',
  '/src/domain/difficulty.js',
  '/src/domain/economy.js',
  '/src/domain/eventBus.js',
  '/src/domain/mathRenderer.js',
  '/src/domain/scoring.js',
  '/src/domain/terminology.js',
  '/src/domain/timer.js',
  '/src/domain/version.js',
  '/src/content/characters/roster.js',
  '/src/engines/mathEngine.js',
  '/src/engines/investigationEngine.js',
  '/src/engines/explorationEngine.js',
  '/src/engines/pathfinding.js',
  '/assets/art/palette/global-palette.json',
  '/assets/art/tilesets/cipher-hq/tileset.png',
  '/assets/art/tilesets/server-room-7/tileset.png',
  '/assets/art/props/props_sheet.png',
  '/assets/art/characters/player/spritesheet.png',
  '/assets/art/characters/npc/kiani/spritesheet.png',
  '/assets/art/characters/npc/nava/spritesheet.png',
  '/assets/art/characters/npc/arman/spritesheet.png',
  '/assets/art/characters/npc/arash/spritesheet.png',
  '/src/engines/operationDirector.js',
  '/src/engines/pauseManager.js',
  '/src/questions/grade9Bank.js',
  '/src/story/campaignSilentArchive.js',
  '/src/content/cases/chapter1SilentArchive.js',
  '/src/persistence/saveSchema.js',
  '/src/persistence/idbStore.js',
  '/src/persistence/migration.js',
  '/src/persistence/storage.js',
  '/src/recovery/recoveryManager.js',
  '/src/systems/gameEngine.js',
  '/src/audio/soundManager.js',
  '/src/ui/icons.js',
  '/src/ui/hqCanvas.js',
  '/src/ui/wallSystem.js',
  '/src/content/palette.js',
  '/src/content/propCatalog.js',
  '/src/domain/worldConfig.js',
  '/src/ui/sceneRenderer.js',
  '/src/ui/evidenceBoard.js',
  '/src/ui/pauseModal.js',
  '/assets/fonts/NotoSansArabic-Regular.ttf',
  '/assets/fonts/NotoNaskhArabic-Regular.ttf',
  '/assets/fonts/NotoNaskhArabic-Bold.ttf',
  '/assets/fonts/NotoSansMath-Regular.ttf',
  '/assets/fonts/DejaVuMathTeXGyre.ttf',
  '/assets/fonts/DejaVuSansMono.ttf',
  '/assets/pixelart/player_sheet.png',
  '/assets/pixelart/npc_sheet.png',
  '/assets/pixelart/portraits_sheet.png',
  '/assets/pixelart/hq_tileset.png',
  '/assets/pixelart/evidence_icons.png',
  '/assets/pixelart/bg_menu.png',
  '/assets/pixelart/bg_lobby.png',
  '/assets/pixelart/bg_briefing.png',
  '/assets/pixelart/bg_evidence_wall.png',
  '/assets/audio/click.wav',
  '/assets/audio/hover.wav',
  '/assets/audio/door.wav',
  '/assets/audio/pin.wav',
  '/assets/audio/thread.wav',
  '/assets/audio/success.wav',
  '/assets/audio/error.wav',
  '/assets/audio/notify.wav',
  '/assets/audio/save.wav',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

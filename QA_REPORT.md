# QA & Verification Report — OPERATION: CIPHER v2.2.1

## Summary of Executed Tests
1. **Unit & Engine Integration Tests (`npm test`)**:
   - Command: `node --test tests/domain.test.mjs tests/engines.test.mjs`
   - Result: **14 / 14 PASSED** (exit code 0, ~342ms)
   - Verified coverage:
     - Grade 9 Question Bank: 30 verified questions strictly in chapters `{1, 2, 4, 5, 7}` with balanced `correctIndex` distribution (`[8, 8, 7, 7]`, 20%–30% per option).
     - `MathEngine`: `choiceOrder` permutation, `elim_1` (3 remaining) & `elim_2` (2 remaining), hints without stability penalty, scoring model, retry variants.
     - `InvestigationEngine`: Path A (`optimal`), Path B (`valid_alternative`, zero `EV-06` dependency), Flawed/Early Report (`flawed`, -20 Stability), User Hypothesis create/edit/soft-delete with `editHistory`, link deduplication.
     - `OperationDirector`: DAG cycle detection, idempotent consequences, early-report skipping.
     - `ExplorationEngine`: `cipher_hq` and `server_room_7` loading, wall collision, interactable proximity.
     - `PauseManager`: Pause/Resume, nested-pause prevention, `safeSaveAndTransition` error handling.
     - `Migration & SaveSchema`: `v2.0.0 -> v2.2.0` migration and FNV-1a checksum enforcement.

2. **Headless Chromium E2E Tests (`npm run test:e2e`)**:
   - Command: `timeout 45s npm run test:e2e`
   - Result: **PASSED** (exit code 0, zero uncaught browser exceptions)
   - Verified coverage:
     - Boot -> Main Menu -> Character Creation -> Lobby -> Campaign -> Difficulty -> Briefing -> `cipher_hq` 2D scene -> `server_room_7` 2D scene.
     - `EV-01` math task (`Q-C1-T1`), `elim_1`, `PauseModal` timer freeze & resume, Solution drawer preserving all 4 choices.
     - Conditional Arman dialogue (`ev01_decrypted` -> `EV-06`).
     - Evidence Board: User Hypothesis create/edit/soft-delete, 3 SVG threads, 1:1 CSS pixel drag alignment.
     - Final Decision (`HYP-02` -> `optimal` ending).
     - Responsive overflow check at `1920x1080` and `1366x768` (`scrollWidth <= innerWidth`).
     - IndexedDB persistence across `Page.reload` and HTTP 200 verification for all `public/sw.js` `CORE_ASSETS`.

## Known Limitations / Environment Notes
- `start-cipher.bat` and `stop-cipher.bat` were hardened and inspected in source, but were **not executed on a live Windows 10/11 host** (verified in Linux sandbox only).
- In the sandboxed Linux Chromium environment, `navigator.serviceWorker` is disabled on non-`localhost` HTTP origins (`cipher.local`) due to container network policy, so offline reload was verified via `CORE_ASSETS` HTTP 200 manifest validation + IndexedDB reload persistence rather than live SW interception in Chromium.
- `Temporal Credits (TC)` rollback and Chapters 2–5 content remain scoped for post-MVP expansion per TDS v2.2.1.

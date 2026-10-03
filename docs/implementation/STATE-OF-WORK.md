# Project Worbound — State of Work

**Snapshot date:** 2026-08-23  
**Version:** 0.1.0  
**Branch:** `master`  
**Delivery state:** Playable browser vertical slice; not release-certified 1.0

## Executive state

Project Worbound currently boots and plays as a client-only browser game. The deterministic gameplay foundation, original runtime art and audio, ten standard mazes, Arena and Pit milestones, four local game modes, keyboard controls, and browser gamepad support are integrated. The repository also contains the complete design package, storyboards, technical plan, asset provenance, tests, CI, and a GitHub Pages workflow.

The work has passed the local automated checks listed below. It has not completed the manual browser/controller matrix, design playtests, input-remapping flow, final accessibility pass, or legal/release review. No public deployment has been made because this checkout has no Git remote.

## Completed scope

### Design and planning

- Research dossier, game design document, decision log, and four illustrated storyboards under `docs/design/`.
- Browser technical plan covering architecture, input, assets, testing, deployment, milestones, and launch gates.
- Original-IP posture and third-party music/font provenance documentation.

### Playable game

- TypeScript, Phaser 4.2.1, and Vite 8 browser application at a responsive `640 × 360` logical resolution.
- Fixed 60 Hz framework-independent seeded simulation with serializable world state and stable world hashes.
- Solo + AI, two-player Alliance, two-player Classic, and Practice modes.
- Keyboard profiles for both players and up to two browser gamepads, including dead-zone/cardinal normalization, hot-disconnect pausing, and optional haptics.
- Cardinal movement/facing, aim modifier, one-live-projectile limit, wall and projectile collisions, lives, score ownership, protected reserve re-entry, and three-second forced return.
- Classic-only friendly fire and its scoring rule.
- Prowler → Veilmaw → Ravager succession, pursuit, firing, cloak/reveal behavior, and persistent radar tracking.
- Shared side gates with traversal lockout; Riftwing capture/escape and next-dungeon ×2; teleporting Gaoler encounter.
- Ten standard authored mazes plus Arena and Pit layouts, thirteen-dungeon milestone scheduling, bonus lives, and endless continuation.
- HUD, radar, objectives, multiplier state, pause/restart/menu controls, local high scores, and fullscreen support.
- Persisted music/SFX volume, reduced-effects, high-contrast radar, and haptics settings.
- Pause safety for browser blur, hidden tabs, and controller disconnects.

### Assets and delivery

- Seven actor atlases and deployment-sized title/game sprites.
- Fifty original procedural stereo source SFX; seventeen selected browser cues in both Ogg and AAC.
- Six runtime music files from openly licensed sources, with retained masters and notices.
- Runtime asset build and validation scripts.
- Chromium/Firefox/WebKit Playwright smoke-test definitions.
- GitHub Actions verification and GitHub Pages deployment workflows.

## Verification snapshot

Re-run on 2026-08-23:

| Check | Result |
| --- | --- |
| `npm test` | Pass — 27 tests across 3 files |
| `npm run typecheck` | Pass |
| `npm run validate:assets` | Pass |
| `npm run build` | Pass — 63 modules transformed |
| Production artifact | Approximately 7.1 MiB uncompressed on disk |
| Playwright discovery | Six journeys defined across three engines |

The build emits one non-blocking warning: the minified Phaser/application JavaScript chunk is approximately 1.42 MB before transfer compression and exceeds Vite's default 500 kB advisory threshold. Its reported gzip size is approximately 372 kB. Code-splitting remains a future optimization, not a current correctness failure.

Interactive Playwright execution and physical gamepad testing are not claimed as passed. The earlier in-app browser session exposed no usable browser instance; CI is configured to install Chromium and run its smoke project once the repository is pushed.

## Repository state

- Current branch: `master`.
- Git remote: none configured.
- The implementation and generated runtime package are present in the working tree but have not been committed.
- `dist/`, `node_modules/`, Playwright results, and coverage output are intentionally ignored.
- Preserve all existing modified/untracked files when resuming; they comprise the current implementation.

## Known remaining work

### Highest priority

1. Add an explicit controller join/reconnect screen so devices are assigned intentionally rather than only by detected order.
2. Implement keyboard/controller remapping, conflict detection, and controller glyph families.
3. Run the Playwright suite with installed Chromium, Firefox, and WebKit browsers; fix any real-engine boot/audio/input differences.
4. Complete the physical controller matrix, including two controllers, mixed controller/keyboard, USB/Bluetooth disconnects, and shared keyboard.
5. Add authored onboarding prompts and verify all Storyboard SB-01 beats with new players.

### Before content/release certification

- Add tap-to-pivot timing presets, HUD/radar scaling, captions, and the remaining accessibility controls.
- Add run-result statistics, local-best presentation, and attract-mode replay.
- Tune enemy intent and the complete progression through the first Pit using observed playtests.
- Expand same-tick collision/replay fixtures and add longer browser performance/memory soaks.
- Audition music loops, SFX, autoplay recovery, and both audio codecs in Safari, Firefox, and Chromium.
- Select a repository/domain, configure the Pages environment, and verify the immutable public artifact and rollback procedure.
- Complete IP/legal review and choose a distribution license for project-original art, SFX, code, and documentation.
- Add PWA/offline caching only after normal hosted updates are stable.

## Resume instructions

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`.

Before changing gameplay, establish the baseline:

```sh
npm test
npm run typecheck
npm run validate:assets
npm run build
```

For browser automation, install Playwright's browsers and run:

```sh
npx playwright install
npm run test:browser
```

## Key handoff files

- `README.md` — local run, controls, verification, and document links.
- `docs/design/02-game-design-document.md` — authoritative player-facing rules.
- `docs/design/05-technical-implementation-plan.md` — architecture, milestones, and release gates.
- `docs/implementation/README.md` — concise implementation status.
- `src/game/simulation.ts` — authoritative deterministic rules and update ordering.
- `src/game/mazes.ts` — authored maze pool and milestone scheduling.
- `src/input/browser-input.ts` — keyboard/gamepad normalization and device assignment.
- `src/scenes/AttractScene.ts` and `src/scenes/GameScene.ts` — menu/settings and gameplay presentation.
- `assets/README.md` and `assets/licenses/THIRD_PARTY_ASSETS.md` — asset inventory and provenance.
- `.github/workflows/ci.yml` and `.github/workflows/deploy-pages.yml` — verification and reference deployment.

## Recommended next milestone

Treat controller assignment/remapping plus real-browser execution as the next bounded milestone. Those checks validate the product's browser-and-controller promise before more presentation or content polish is added.

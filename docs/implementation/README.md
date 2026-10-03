# Project Worbound implementation status

**Implementation version:** 0.1.0 playable vertical slice  
**Date:** 2026-08-23  
**Runtime:** TypeScript, Phaser 4.2.1, Vite 8

For the detailed handoff, current verification evidence, repository state, and ordered next work, see [State of Work](./STATE-OF-WORK.md).

## What is playable

- Responsive 640×360 browser canvas with fullscreen and pixel-preserving presentation.
- Mouse, keyboard, and controller-aware title/mode selection.
- Solo + AI, two-player Alliance, two-player Classic, and Practice modes.
- Stable player slots for up to two polled browser gamepads plus both keyboard profiles.
- Fixed 60 Hz seeded simulation independent of Phaser and browser frame rate.
- Cardinal movement/aiming, one live projectile, wall/projectile collisions, lives, re-entry protection, and score ownership.
- Friendly fire and its 1,000-point incentive in Classic only.
- Prowler → Veilmaw → Ravager succession, pursuit, firing, cloak/reveal, and radar persistence.
- Shared gates with visible cooldown, Riftwing chase/next-dungeon ×2, and teleporting Gaoler encounter.
- Player-selected reserve re-entry with a three-second automatic fallback and protected return.
- Ten connected standard mazes across Lattice, Rings, Crossroads, Split Keep, Coils, and Gauntlet patterns, plus authored Arena and Pit layouts.
- Thirteen-dungeon milestone scheduling, endless layout continuation, later-dungeon pressure, and bonus lives.
- HUD, radar, objective/multiplier state, generated actor sheets, effects pulses, music, and event SFX.
- Persisted music/SFX volume, reduced-effects, high-contrast radar, and haptics options.
- Focus/visibility/controller-disconnect pause safety, quick restart, menu return, and versioned local high scores.

## Architecture delivered

- `src/game/` contains the serializable world, authored maze data, companion AI, fixed update pipeline, collision ordering, seeded PRNG, and world hashing.
- `src/input/` converts keyboard and Gamepad API state to device-independent commands.
- `src/scenes/` owns loading, menu, Phaser rendering, HUD/radar, lifecycle, and fixed-step orchestration.
- `src/audio/` maps immutable simulation events to runtime cues.
- `tools/asset_generation/build_web_assets.sh` creates small web atlases and Ogg/AAC cue pairs from the production masters.
- `tests/simulation/` verifies determinism, entry protection, shot limits, friendly-fire rules, Practice lives, gate lockout, re-entry, Riftwing/Gaoler resolution, settings migration, maze connectivity, and milestone scheduling.
- `tests/browser/` contains Chromium/Firefox/WebKit smoke journeys for CI or a workstation with Playwright browsers installed.

## Verification state

The following pass locally:

```text
npm test
npm run typecheck
npm run validate:assets
npm run build
```

The production artifact is 7.1 MiB uncompressed on disk, including the engine and dual-codec media, excluding source maps. This remains below the plan's 8 MB cumulative Dungeon 1 readiness budget. The in-app browser connection was unavailable during this implementation session, so interactive canvas/browser smoke tests have been added but not claimed as locally executed. CI installs Chromium and runs the smoke suite.

## Remaining production work

This is a playable vertical-slice foundation with the full maze target integrated, not a release-certified 1.0. Remaining milestones from the technical plan include:

- complete the explicit controller join/reconnect/remapping flow and platform glyph families;
- add tap-to-pivot timing presets, HUD scaling, captions, and the remaining accessibility controls;
- add authored onboarding prompts, richer enemy intent states/tuning, results statistics, and attract-mode replay;
- tune the complete first-Pit progression through observed playtests and audit every same-tick collision case;
- audition every music/SFX loop and codec fallback in Safari, Firefox, and Chromium;
- perform the manual controller matrix, three-engine browser run, performance trace, and design playtest cohorts;
- choose the public repository/domain and enable the included GitHub Pages deployment workflow;
- add PWA/offline update behavior only after ordinary web updates are stable;
- complete final IP/legal review and decide a distribution license for project-original art and SFX.

## Run and deploy

See the repository [README](../../README.md). The production `dist/` folder is static and the included workflow deploys it to GitHub Pages after tests and type checking.

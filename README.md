# Project Worbound

Project Worbound is a browser-first fixed-screen cosmic maze shooter inspired by the design dynamics of classic arcade maze combat. This repository contains the research/design package, original production assets, and a playable TypeScript/Phaser implementation.

## Run locally

Requirements: Node.js 24+ and npm.

```sh
npm install
npm run dev
```

Open <http://127.0.0.1:4173/>.

## Controls

| Action | Gold / Player 1 | Cyan / Player 2 | Controller |
| --- | --- | --- | --- |
| Move / face | W A S D | Arrow keys | D-pad or left stick |
| Fire | F or Space | Slash or Enter | South face button |
| Aim without moving | G | Period | West face button |
| Pause | Escape or P | Escape or P | Start/Menu |

Press `O` on the title screen for persisted audio/accessibility options. Press `X` to toggle fullscreen, `R` to restart a run, and `M` to return to the mode screen. After losing a life, press Fire to re-enter immediately or wait for the three-second fallback.

The menu supports mouse, keyboard, and controller selection. Solo mode gives the cyan Delver to the companion AI. Alliance disables friendly fire; Classic enables it. Ten standard mazes, the Arena milestone, and the recurring Pit feed an endless run.

## Verify and build

```sh
npm test
npm run test:browser
npm run typecheck
npm run build:assets
npm run validate:assets
npm run build
npm run preview
```

The optimized static build is written to `dist/` and can be hosted by any HTTPS static host.

Browser smoke tests require the Playwright browser packages (`npx playwright install`). CI installs Chromium automatically.

## Collision lab

Run `npm run dev`, then open <http://127.0.0.1:4173/collision-lab.html>.
The lab is a small Storybook-style scenario runner for the real game simulation:

- Select player/wall, enemy/wall, narrow-opening, simultaneous-gate, companion, or Riftwing scenarios across all twelve mazes.
- Run at 0.1×–4× speed, pause, advance exact tick counts, or scrub the recorded command history. Every reset uses seed 72.
- Overlay collision boxes, sprite bounds, and movement trails. Red collision boxes indicate positive-area wall overlap; lack of overlap does not imply successful navigation.
- Override Gold's direction to experiment. Rewinding and then stepping branches the recording. Scenario links preserve the fixture selection, not a manual recording.

The lab uses `stepWorld` and shares fixtures with `tests/simulation/collision.test.ts`.
Rendering is a diagnostic canvas with game sprites, not the full Phaser scene or its effects.
The lab also ships as `collision-lab.html` in the static build.

```sh
npm test -- tests/simulation/collision.test.ts
npm run test:browser -- tests/browser/collision-lab.spec.ts --project=chromium
```

Collision tests cover all four directions, all enemy tiers at maximum speed, narrow openings,
authored spawns, per-tick overlap checks in all mazes, and deterministic scenario replay.
All regression cases now assert corrected behavior with ordinary passing tests; no expected
failures are retained. Riftwing spawns on clear floor and follows body-aware routes to either
gate, including when the gate closes during the chase. Closed gates reject outward movement
but allow an actor already outside to retreat inside. The companion routes around walls and
only stops to aim when it has a clear shot. Exact wall tangency is allowed symmetrically.
Collision dimensions are shared by simulation, navigation, and the lab; the overlap oracle
uses an independent rectangle/tile intersection check. Moving sprites now fit a 16-pixel
corridor tile instead of rendering at 27–30 pixels. Decorative pixels are not collision data.

The collision suite also checks both Riftwing exits in every maze, per-tick body clearance,
and gate closure during a chase. Browser tests exercise replay, manual movement, pause,
and the fixed scenarios. The production game consumes pause press edges directly so rapid
consecutive Escape presses do not lose the resume command.

## Combat tuning and comparisons

The game now defaults to the **Balanced** profile: player movement remains 75 px/s,
player shots travel at 210 px/s, and Prowler / Veilmaw / Ravager shots travel at
150 / 165 / 180 px/s. Enemies stop, reveal, show a directional charge, and play a
short cue for 300 / 250 / 200 ms before firing along a committed direction. Gaoler
bolts travel at 180 px/s and show a 400 ms charge within their existing arrival cycle.
Friendly shots are thin streaks; hostile shots are diamonds with directional trails.
A small line under a living player indicates weapon readiness.

One recent fire press is retained for eight ticks (133 ms). It fires once when the
previous shot resolves, using the player's current facing. It expires if the weapon
stays busy and clears on death or phase changes. There is still only one live shot
per player. Shots leaving the playfield release their owner immediately.

Enemy charges reserve projectile slots: one shot per enemy and a total of two in
Dungeon 1, three in Dungeons 2–4, and four thereafter. Replacement enemies have a
300 ms visible arrival during which they cannot move, shoot, cause contact damage,
or take another hit. Dungeon 1 has one late transformation chain (eight regular-enemy
hits total); Dungeons 2–6 introduce two through six chains. Later dungeons retain
full chains and their earlier advanced spawns.

Open <http://127.0.0.1:4173/collision-lab.html?scenario=combat-duel> for a combat
comparison using the same simulation. The five combat stories cover close corners,
a four-tile duel, crossfire, missed long shots, and first-dungeon succession. Choose:

- **Previous timing:** original shot speeds, immediate fire, full chains.
- **Slower shots only:** the new speeds in isolation.
- **Warnings + buffer:** adds charge cues, buffering, shot limits, and arrival time.
- **Balanced + staged enemies:** also applies the gentler succession curve (game default).

Profiles compare combat tuning on the current collision implementation; they are
not historical builds. Profile changes reset the seed and recording. The default
scripted dodge waits 200 ms; change its delay, override movement, or use **Fire once**.
Human playtesting is still needed to assess difficulty and feel; automated tests
verify timing, repeatability, collision, and the scripted response outcomes.

```sh
npm test -- tests/simulation/combat.test.ts
npm run test:browser -- tests/browser/combat-lab.spec.ts --project=chromium
```

## Project documents

- [Design package](./docs/design/README.md)
- [Technical implementation plan](./docs/design/05-technical-implementation-plan.md)
- [Implementation status](./docs/implementation/README.md)
- [State of work / handoff](./docs/implementation/STATE-OF-WORK.md)
- [Asset package](./assets/README.md)

## Architecture

Game rules run in a framework-independent fixed-tick simulation under `src/game/`. Phaser scenes render snapshots and translate browser input/audio into commands and effects. The simulation uses a seeded PRNG and can be regression-tested with deterministic world hashes.

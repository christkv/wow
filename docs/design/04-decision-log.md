# Decision Log and Open Questions

## Settled for the current design baseline

| ID | Decision | Rationale |
|---|---|---|
| D-001 | Use the arcade release as the behavior reference; home ports are supporting evidence only. | Ports differ in controls, AI companion behavior, lives, and timing. |
| D-002 | Preserve a shared fixed screen and four-way movement. | Spatial readability and shared social tension depend on them. |
| D-003 | Preserve one live projectile per player. | This turns shooting into tactical commitment. |
| D-004 | Keep radar central and wall-free in Classic rules. | Divided attention is a defining skill. |
| D-005 | Keep enemy succession inside a stable six-slot encounter budget. | Escalation remains legible while danger grows. |
| D-006 | Solo mode includes a fallible AI companion by default. | Two-body geometry is part of the source’s identity. |
| D-007 | Classic two-player uses lethal friendly fire and individual scores. | Cooperation-versus-temptation is the social core. |
| D-008 | Alliance mode offers non-lethal co-op with separate score category. | Supports mixed-skill pairs without rewriting Classic. |
| D-009 | Use a curated layout pool, with Arena at 4 and Pit at 13. | Authored geometry produces reliable tactical questions and landmarks. |
| D-010 | Capturing the escape target arms ×2 for the next dungeon only. | Future value creates continuation pressure. |
| D-011 | The host is a one-hit teleport duel, not a health-bar boss. | Maintains arcade pace and precision. |
| D-012 | Use original names, sprites, music, voice, and writing. | Mechanics can be studied without copying protected expression. |
| D-013 | No meta-progression or upgrades in the base design. | Persistent power would undermine score comparability and one-hit clarity. |

## Assumptions to validate

| ID | Assumption | Failure signal | Response |
|---|---|---|---|
| A-001 | Tap-to-pivot can feel intentional on modern controls. | Frequent accidental steps or reports of input lag | Promote aim modifier or provide per-device threshold presets |
| A-002 | A lower-center radar is readable on common 16:9 displays. | Players tunnel on the maze and call cloaked deaths unfair | Tighten vertical composition; test movable/scalable radar |
| A-003 | AI crossfire is amusing rather than punitive. | Solo deaths blamed on companion more than player choice | Strengthen lane reservation and firing telegraph |
| A-004 | Friendly-fire score is desirable in Classic. | Pairs intentionally grief and abandon shared progress | Preserve lethal fire but test zero/negative direct score in a variant |
| A-005 | Arena at 4 and Pit at 13 create good session milestones. | New players never see Arena or skilled players reach Pit without tension | Rebalance reserves and early speed without moving identity landmarks first |
| A-006 | Six threats remain readable with modern effects. | Radar and main screen become visual noise | Reduce trails/glow, not population, before changing the core budget |
| A-007 | Original scoring ratios remain satisfying. | Players ignore Riftwing or advanced threats feel underpaid | Adjust phase/milestone bonuses while protecting simple ratios |

## Product questions requiring owner input later

1. Is the intended product an explicitly licensed remake, an unlicensed fan project, or an original commercial homage?
2. Which first-class play context matters most: keyboard, gamepad on a television, handheld, or custom cabinet?
3. Is online co-op a launch requirement? If yes, it needs its own latency/friendly-fire design pass.
4. Should the game remain endless-only, or add a finite 13-dungeon “first descent” completion card alongside endless score attack?
5. Should Classic friendly-fire kills award the original-style 1,000 points, or should only deliberate versus events score?
6. How expressive should the Gaoler’s voice be: rare arcade barks, or a larger reactive announcer system?
7. Are global leaderboards, daily seeds/layout rotations, and replay ghosts desired product features?

## Recommended next research sprint

1. Capture and log the first 15 arcade dungeons across three runs.
2. Measure movement, projectile, cloak, gate, re-entry, and Gaoler timings frame-by-frame.
3. Catalog every distinct maze and identify mirrored variants.
4. Observe solo companion behavior in at least 30 combat situations.
5. Build a paper/video prototype of the HUD and run five comprehension tests.
6. Test tap-to-pivot versus aim-modifier controls before any content expansion.
7. Hold an IP review once product intent is known.

## Exit criteria for pre-production design

- Product owner resolves the seven product questions above.
- A small rules prototype validates the five design pillars.
- At least one original-game expert reviews the research dossier for factual errors.
- Accessibility review validates radar, cloak, color, flash, and input alternatives.
- The proposed names and visual direction pass an IP/trademark review appropriate to the project’s intended release.


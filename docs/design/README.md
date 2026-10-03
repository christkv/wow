# Project Worbound — Design Package

**Status:** Pre-production design baseline  
**Date:** 2026-08-21  
**Working title:** Project Worbound  
**Reference target:** The 1980-copyright / 1981 arcade release of *Wizard of Wor*

This package defines a faithful-but-original fixed-screen maze shooter inspired by the classic arcade game. Documents 01–04 establish player experience, rules, pacing, presentation, and validation; document 05 establishes the recommended browser implementation and rollout architecture.

## Read in this order

1. [Research dossier](./01-research-dossier.md) — what the original did, the confidence behind each finding, and the design DNA worth preserving.
2. [Game design document](./02-game-design-document.md) — the proposed game, from pillars and rules through progression, modes, art, audio, accessibility, and playtest targets.
3. [Storyboards](./03-storyboards.md) — four six-panel experience sequences with visual sheets and panel-level intent.
4. [Decision log](./04-decision-log.md) — settled decisions, assumptions, unresolved questions, and suggested next research.
5. [Storyboard generation prompts](./assets/storyboards/PROMPTS.md) — provenance and reproducible prompts for the concept sheets.
6. [Production asset package](../../assets/README.md) — complete sprites, maze tiles, HUD, VFX, screens, SFX, openly licensed music, font, manifests, and source provenance.
7. [Technical implementation plan](./05-technical-implementation-plan.md) — browser stack, deterministic architecture, keyboard/controller support, content pipeline, testing, deployment, milestones, and launch gates.

## Package map

```text
docs/design/
├── README.md
├── 01-research-dossier.md
├── 02-game-design-document.md
├── 03-storyboards.md
├── 04-decision-log.md
├── 05-technical-implementation-plan.md
└── assets/storyboards/
    ├── PROMPTS.md
    ├── sb-01-first-ninety-seconds.png
    ├── sb-02-invisible-hunt-and-worluk.png
    ├── sb-03-trust-crossfire-recovery.png
    └── sb-04-pit-and-sorcerer.png
```

The production-facing files live in the repository-level `assets/` directory so future implementation can consume them without coupling runtime content to design documentation.

## Product thesis

The game should feel understandable in ten seconds and strategically tense for years. Its distinctiveness comes from five interacting constraints:

- a single active shot makes every trigger pull a commitment;
- invisible hunters force the player to divide attention between maze and radar;
- a simultaneous companion creates crossfire, rescue, and accidental betrayal;
- the post-clear escape creature converts mastery into a wager on the next dungeon;
- a taunting, teleporting host turns a score run into a personal feud.

This is the experience contract. Visual nostalgia is useful, but it is not a substitute for these dynamics.

## IP posture

“Project Worbound” and all proposed character names are placeholders. The reference game’s title, named characters, original sprites, speech recordings, musical phrases, cabinet art, and exact copy should not be shipped without a license and legal review. The GDD therefore separates documented reference behavior from original presentation decisions.

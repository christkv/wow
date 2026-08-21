# Project Worbound image-generation prompt set

**Generation mode:** built-in ImageGen  
**Date:** 2026-08-21  
**Purpose:** original production concept/asset package for Project Worbound

The outputs were normalized after generation so every character sheet has exact `314 px` cells, every tile/UI/VFX sheet has exact `157 px` cells, and each 16:9 screen is exactly `1696 × 954`.

## Common visual language

Late-1980s 16-bit arcade pixel art; readable silhouette; crisp hard pixels; no antialiasing, blur, texture filtering, glow outside the sprite, gradients, text, watermark, border, grid line, shadow, or neighboring-cell overlap. Limited palette of void black/deep navy, electric cyan/cobalt, gold/orange, violet/magenta, scarlet, and ice white. Original designs only; do not copy any existing game's sprite, maze, logo, character, or cabinet art.

## Character sheets

Apply this structure to every character prompt: transparent PNG; strict `4 × 4` atlas; exactly 16 evenly sized cells; same scale, baseline, padding, light direction, and silhouette in every cell. The generated native-looking sprite should read as roughly `32 × 32` pixels when downscaled. Direction rows requested as north/east/south/west; final observed output order is south/east/north/west and is documented in the art README.

### Delver Gold

Create a gold-and-orange armored dungeon ranger called the Delver: squat helmet, dark visor, small shoulder guards, compact rectangular energy carbine, no cape. Columns are idle, walk A, walk B, fire with one straight muzzle bolt. Heroic, simple, readable at thumbnail size.

### Delver Cyan

Precise recolor edit of the approved Delver Gold sheet. Preserve every pixel shape, pose, silhouette, registration, padding, transparency, and the 4 × 4 layout. Replace the gold/orange player colors with electric cyan/cobalt/ice-white highlights. Do not redesign or move anything.

### Prowler

Create a compact cobalt-blue alien predator called the Prowler: low hunched posture, broad head, two short horns, clawed forearms, digitigrade legs, small pale eyes. Columns are idle, scuttle A, scuttle B, fire with a short blue plasma spit.

### Veilmaw

Create an amber-and-gold alien hunter called the Veilmaw: taller than Prowler, masked wedge-shaped head, long hooked arms, plated shoulders, narrow bright eyes. Columns are stalk A, stalk B, fire, cloak. In cloak frames the body remains the same pose but is represented by sparse amber/cyan edge pixels and partial transparency.

### Ravager

Create a scarlet-and-crimson elite alien called the Ravager: lean fast silhouette, swept-back horns, sharp shoulder plates, long forearms, bright white eyes. Columns are sprint A, sprint B, fire, cloak. Cloak uses broken red/magenta edge pixels and partial transparency.

### Riftwing

Create a small flying cyan-and-magenta escape creature called the Riftwing: manta/bat silhouette, central bright eye, forked tail, angular energy wings. Columns are wings closed, half-open, fully open, and high-speed dash with a very short contained energy trail.

### Gaoler

Create a large floating violet-and-ultraviolet dungeon host called the Gaoler: hooded skull-like mask, crown-like horns, glowing cyan eyes, broad robe/armor mantle, no visible legs, one hand carrying forked lightning. Columns are materialize, hover, cast, dematerialize. Teleport frames dissolve into contained violet/cyan pixel fragments.

## Environment sheet

Create a transparent `8 × 8` atlas of 64 original modular top-down arcade maze tiles with strict equal cells and no gutters or overlap. Include straight walls, corners, T-junctions, crosses, dead ends, floor variants, pits, cyan-lit edges, blue stone blocks, gold/cyan player gates, violet warp gates, entry alcoves, radar markers, traps, torches, portal pieces, and sparse dungeon ornaments. Each tile must be independently usable and seamlessly align on its four edges.

## VFX sheet

Create a transparent `8 × 8` atlas of 64 original pixel-art effects: gold and cyan player shots; red enemy shots; wall sparks; creature impacts; projectile cancellation; cloak/reveal; player starburst death; Riftwing capture/escape; Gaoler lightning, teleport, hit, and defeat; warp gate open/close; score pop; double-score aura; spawn rings; smoke; scan/radar pulse. Keep all effects centered and contained within their cells.

## HUD sheet

Create a transparent `8 × 8` atlas of 64 original one-color or two-color pixel HUD icons. Include Gold/Cyan Delver portraits and lives, ready/shot-live, score, high score, stage, radar pips, invisible warning, double-score armed/active, Riftwing caught/escaped, Gaoler warning, pause, sound, music, accessibility, friendly-fire warning, gate, countdown, and compact arrow/button glyphs. High contrast and legible at 16–32 px.

## Screen illustrations

### Attract background

Create a 16:9 late-1980s arcade pixel-art attract-screen background. A floating cyan-edged maze platform occupies the lower half; the gold and cyan Delvers enter through opposite gates; small blue, amber, scarlet, and cyan/magenta creatures inhabit the maze. One enormous violet Gaoler emerges from darkness on the left, reaching toward the arena. Leave a broad clean black/very-dark area across the upper center for an overlaid title. No text, logo, watermark, interface, copied characters, or duplicate Gaoler.

### Gameplay reference

Create a 16:9 pixel-art gameplay reference screen for a fixed-screen maze shooter. Orthographic top-down blue-stone labyrinth centered on black; cyan-lit wall edges; gold Delver at lower-left and cyan Delver at lower-right; blue Prowlers, amber Veilmaws, scarlet Ravagers, one cyan/magenta Riftwing; radar panel and restrained score/lives indicators; a violet Gaoler warning silhouette outside the playfield. Demonstrate readable scale, clean lanes, projectile contrast, and sparse atmospheric glow. Do not use readable text or copy an existing layout.

## Refinement prompts

1. **Attract-screen cleanup:** preserve the approved composition, palette, maze, players, creatures, and title-safe upper-center negative space; remove the duplicate right-side Gaoler so exactly one Gaoler remains on the left; reconstruct the right background with dark cavern architecture and stars.
2. **Cyan alpha extraction:** preserve the approved cyan Delver sheet exactly; remove the solid black background and all disconnected black backdrop regions; output true transparency while retaining deliberate dark outline pixels attached to each sprite.

The title logo was constructed separately as editable SVG using the supplied OFL font, then composited over the final background.

# Project Worbound art pack

This is the production-facing pixel-art package for the design baseline. The art is original to Project Worbound and intentionally avoids copying the reference game's sprites, cabinet art, maze layouts, logo, or named characters.

## Atlas conventions

All atlases use a transparent background, a top-left origin, zero-based row/column indices, and no gutters. Use nearest-neighbor sampling only.

### Character sheets

Each character sheet is `1256 × 1256`, arranged as a `4 × 4` grid of `314 × 314` cells.

Rows are directions in this observed order:

| Row | Direction |
| ---: | --- |
| 0 | south |
| 1 | east |
| 2 | north |
| 3 | west |

Columns are actor-specific states:

| Actor | Column 0 | Column 1 | Column 2 | Column 3 |
| --- | --- | --- | --- | --- |
| Delver Gold / Cyan | idle | walk A | walk B | fire |
| Prowler | idle | scuttle A | scuttle B | fire |
| Veilmaw | stalk A | stalk B | fire | cloak |
| Ravager | sprint A | sprint B | fire | cloak |
| Riftwing | wings closed | wings half | wings open | dash |
| Gaoler | materialize | hover | cast | dematerialize |

Pre-split frames live in `sprites/frames/<actor>/` and use `<actor>-<direction>-<state>.png` names.

### Tile, HUD, and VFX sheets

`maze-tiles.png`, `hud-icons.png`, and `game-effects.png` are each `1256 × 1256`, arranged as an `8 × 8` grid of `157 × 157` cells. Each cell also exists as a separate PNG:

- `tiles/cells/tile-r<row>-c<column>.png`
- `ui/icons/icon-r<row>-c<column>.png`
- `vfx/frames/vfx-r<row>-c<column>.png`

These generated collections are curated visual vocabularies rather than strict animation timelines. Build final runtime animations by selecting compatible cells and setting their durations in game data.

## Screens and identity

- `screens/attract-screen.png` — composed 16:9 title/attract screen, `1696 × 954`.
- `screens/attract-background.png` — title-free background for animation or localization.
- `screens/gameplay-reference.png` — visual target for scale, color, lighting, HUD, and maze density.
- `ui/title-logo.svg` — editable vector title treatment.
- `ui/title-logo.png` — raster title treatment.
- `worbound-palette.gpl` — the production palette for GIMP, Aseprite, and compatible tools.

The title uses Press Start 2P, supplied under the SIL Open Font License in `../fonts/`.

## Sources and reproduction

The normalized production files are in `sprites/`, `tiles/`, `ui/`, `vfx/`, and `screens/`. Unmodified image-generation output is preserved in `source/generated/`. The complete prompt set is in [IMAGEGEN_PROMPTS.md](./IMAGEGEN_PROMPTS.md). Run `../../tools/asset_generation/split_atlases.sh` to rebuild individual cells.

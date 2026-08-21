# Project Worbound — complete asset package

**Package date:** 2026-08-21  
**Design baseline:** `docs/design/`  
**Machine-readable index:** `manifest.json`

This package supplies the first complete visual and audio vocabulary for Project Worbound: both Delvers, every designed creature tier, the Riftwing and Gaoler, maze construction pieces, HUD symbols, effects, title/gameplay screens, title identity, sound effects, encounter music, and a redistributable display font.

## Inventory

| Area | Contents |
| --- | --- |
| Actors | 7 transparent 4×4 sheets and 112 split PNG frames |
| Environment | 1 transparent 8×8 maze atlas and 64 split tiles |
| HUD | 1 transparent 8×8 icon atlas and 64 split icons |
| VFX | 1 transparent 8×8 effects atlas and 64 split cells |
| Screens | composed attract screen, title-free background, gameplay reference |
| Identity | editable SVG logo, PNG logo, 15-color palette, OFL pixel font |
| SFX | 50 original procedural stereo WAV cues with per-file manifest |
| Music | 5 runtime roles/filesets from 3 CC0 works, with source masters retained |

## Start here

- [Art guide](./art/README.md) — sheet dimensions, row/column semantics, filenames, palette, and source policy.
- [Audio guide](./audio/README.md) — cue coverage, formats, loop roles, and regeneration.
- [Music source map](./audio/music/README.md) — production roles mapped to downloaded works.
- [Third-party notices](./licenses/THIRD_PARTY_ASSETS.md) — CC0 music and OFL font provenance.
- [Image-generation prompts](./art/IMAGEGEN_PROMPTS.md) — complete built-in ImageGen prompt set and refinements.

## Directory map

```text
assets/
├── manifest.json
├── art/
│   ├── sprites/        # production actor atlases + split frames
│   ├── tiles/          # maze atlas + split cells
│   ├── ui/             # HUD atlas, split icons, SVG/PNG title
│   ├── vfx/            # effects atlas + split cells
│   ├── screens/        # attract and gameplay visual targets
│   └── source/         # unnormalized ImageGen output
├── audio/
│   ├── sfx/            # 50 WAV cues + detailed manifest
│   └── music/          # runtime music + original downloads
├── fonts/              # Press Start 2P + OFL text
└── licenses/           # third-party notices
```

## Production notes

- Preserve hard edges: nearest-neighbor scaling, integer scale factors, no texture filtering.
- The large cells are source-resolution masters, not the intended on-screen size. Downsample or pack them losslessly during implementation.
- The `8 × 8` generated collections are visual vocabularies. Curate final runtime sequences and terrain adjacency in game data.
- The composed `art/screens/attract-screen.png` is the strongest presentation reference; `gameplay-reference.png` is the scale/readability reference.
- Spoken Gaoler lines are deliberately absent. The pack uses original non-verbal motifs until casting and localization are decided.

## Rebuild and verify

```sh
python3 tools/asset_generation/generate_sfx.py
./tools/asset_generation/split_atlases.sh
python3 tools/asset_generation/validate_assets.py
```

The first command regenerates deterministic SFX; the second rebuilds split cells; the third validates dimensions, counts, formats, audio signal, and required provenance files.

## Rights summary

- Music: CC0 1.0, recorded per work in `licenses/THIRD_PARTY_ASSETS.md`.
- Press Start 2P: SIL Open Font License 1.1; full text in `fonts/OFL.txt`.
- Project art, logo, procedural SFX, docs, and scripts: project-original; distribution license not yet selected.

This is a production provenance summary, not legal advice. Complete an IP/legal review before release, as required by the design package.

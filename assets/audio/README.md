# Project Worbound audio pack

The audio package contains 50 original procedural sound effects and five music roles built from openly licensed tracks.

## Sound effects

All files under `sfx/` are deterministic, project-original `44.1 kHz`, 16-bit stereo PCM WAV files. They were synthesized without imported samples. The library covers:

- UI navigation, confirm, cancel, pause, and errors;
- footsteps, weapon readiness, player shots, impacts, projectile cancellation, friendly fire, and death;
- creature vocal motifs, fire, cloak, reveal, and transformation;
- gates, protected-entry countdown, and re-entry;
- Riftwing spawn, wing pulse, capture, and escape;
- Gaoler warning ambience, teleport, laugh/voice motifs, lightning, hit, and defeat;
- scoring, bonus life, dungeon/arena/Pit stings, and game over.

`sfx/manifest.json` records duration, format, purpose, and rights for every cue. Run `../../tools/asset_generation/generate_sfx.py` to reproduce the library.

Non-verbal synthesized motifs stand in for the Gaoler's personality. Spoken dialogue remains a casting/localization production decision and is not borrowed from the reference game.

## Music roles

| Runtime file | Role | Loop guidance |
| --- | --- | --- |
| `music/attract-intro.ogg` | attract/title lead-in | play once before attract loop |
| `music/attract-loop.ogg` | attract/title loop | loop continuously |
| `music/dungeon-loop.ogg` | standard dungeon bed | loop; MP3 original also retained |
| `music/gaoler-loop.ogg` | Gaoler encounter | loop continuously |
| `music/pit-climax-loop.ogg` | Pit/high-intensity encounter | loop continuously |

The selected music is CC0. Original downloads are preserved under `music/source/`; normalized/renamed runtime files live directly under `music/`. Full provenance is recorded in `../licenses/THIRD_PARTY_ASSETS.md`.

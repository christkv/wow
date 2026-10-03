#!/usr/bin/env python3
"""Validate the Project Worbound production asset package."""

from __future__ import annotations

import json
import math
import struct
import subprocess
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def png_info(path: Path) -> tuple[int, int, str]:
    with path.open("rb") as handle:
        header = handle.read(26)
    require(header[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {path}")
    require(header[12:16] == b"IHDR", f"Missing PNG IHDR: {path}")
    width, height = struct.unpack(">II", header[16:24])
    color_type = header[25]
    mode = {0: "L", 2: "RGB", 3: "P", 4: "LA", 6: "RGBA"}.get(color_type, f"type-{color_type}")
    return width, height, mode


def check_png(path: Path, size: tuple[int, int], modes: set[str]) -> None:
    require(path.is_file(), f"Missing image: {path}")
    width, height, mode = png_info(path)
    require((width, height) == size, f"Wrong size for {path}: {(width, height)} != {size}")
    require(mode in modes, f"Wrong color mode for {path}: {mode} not in {sorted(modes)}")


def check_png_group(directory: Path, pattern: str, count: int, size: tuple[int, int]) -> None:
    files = sorted(directory.glob(pattern))
    require(len(files) == count, f"Wrong file count in {directory}: {len(files)} != {count}")
    for path in files:
        check_png(path, size, {"RGBA"})


def check_sfx() -> None:
    directory = ASSETS / "audio" / "sfx"
    manifest_path = directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    entries = manifest["assets"]
    require(len(entries) == 50, f"SFX manifest has {len(entries)} entries")
    require(len(list(directory.glob("*.wav"))) == 50, "SFX directory does not contain exactly 50 WAV files")
    for entry in entries:
        path = directory / entry["file"]
        with wave.open(str(path), "rb") as handle:
            require(handle.getnchannels() == 2, f"SFX is not stereo: {path}")
            require(handle.getsampwidth() == 2, f"SFX is not 16-bit: {path}")
            require(handle.getframerate() == 44_100, f"SFX is not 44.1 kHz: {path}")
            frames = handle.readframes(handle.getnframes())
        samples = struct.unpack(f"<{len(frames) // 2}h", frames)
        peak = max(abs(sample) for sample in samples)
        require(peak > 0, f"Silent SFX: {path}")
        require(peak <= 30_147, f"SFX exceeds normalized 0.92 peak: {path} ({peak})")
        actual_duration = len(samples) / 2 / 44_100
        require(math.isclose(actual_duration, entry["duration_seconds"], abs_tol=0.0011), f"Duration mismatch: {path}")
        require("rights" in entry and "license" not in entry, f"Rights metadata is ambiguous: {path}")


def duration_seconds(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def main() -> None:
    manifest = json.loads((ASSETS / "manifest.json").read_text())
    require(manifest["project"] == "Project Worbound", "Unexpected manifest project")

    sprite_names = ["delver-gold", "delver-cyan", "prowler", "veilmaw", "ravager", "riftwing", "gaoler"]
    for name in sprite_names:
        check_png(ASSETS / "art" / "sprites" / f"{name}.png", (1256, 1256), {"RGBA"})
        check_png_group(ASSETS / "art" / "sprites" / "frames" / name, "*.png", 16, (314, 314))

    check_png(ASSETS / "art" / "tiles" / "maze-tiles.png", (1256, 1256), {"RGBA"})
    check_png(ASSETS / "art" / "ui" / "hud-icons.png", (1256, 1256), {"RGBA"})
    check_png(ASSETS / "art" / "vfx" / "game-effects.png", (1256, 1256), {"RGBA"})
    check_png_group(ASSETS / "art" / "tiles" / "cells", "*.png", 64, (157, 157))
    check_png_group(ASSETS / "art" / "ui" / "icons", "*.png", 64, (157, 157))
    check_png_group(ASSETS / "art" / "vfx" / "frames", "*.png", 64, (157, 157))

    for name in ["attract-screen", "attract-background", "gameplay-reference"]:
        check_png(ASSETS / "art" / "screens" / f"{name}.png", (1696, 954), {"RGB", "RGBA"})
    check_png(ASSETS / "art" / "ui" / "title-logo.png", (1696, 360), {"RGBA"})

    runtime = ASSETS / "runtime" / "web"
    for name in sprite_names:
        check_png(runtime / "sprites" / f"{name}.png", (256, 256), {"RGBA"})
    check_png(runtime / "screens" / "attract-screen.png", (640, 360), {"RGB", "RGBA"})
    runtime_cues = sorted((runtime / "audio").glob("*.ogg"))
    runtime_aac = sorted((runtime / "audio").glob("*.m4a"))
    require(len(runtime_cues) == 17, f"Expected 17 Vorbis runtime cues, found {len(runtime_cues)}")
    require(len(runtime_aac) == 19, f"Expected 17 AAC cue fallbacks plus 2 AAC music fallbacks, found {len(runtime_aac)}")
    require(all(duration_seconds(path) > 0.05 for path in [*runtime_cues, *runtime_aac]), "Runtime audio is missing or implausibly short")

    required_text = [
        ASSETS / "README.md",
        ASSETS / "art" / "README.md",
        ASSETS / "art" / "IMAGEGEN_PROMPTS.md",
        ASSETS / "art" / "worbound-palette.gpl",
        ASSETS / "audio" / "README.md",
        ASSETS / "audio" / "music" / "README.md",
        ASSETS / "licenses" / "THIRD_PARTY_ASSETS.md",
        ASSETS / "fonts" / "OFL.txt",
        ASSETS / "fonts" / "PressStart2P-Regular.ttf",
    ]
    for path in required_text:
        require(path.is_file() and path.stat().st_size > 0, f"Missing or empty required file: {path}")

    check_sfx()

    music = [
        ASSETS / "audio" / "music" / "attract-intro.ogg",
        ASSETS / "audio" / "music" / "attract-loop.ogg",
        ASSETS / "audio" / "music" / "dungeon-loop.mp3",
        ASSETS / "audio" / "music" / "dungeon-loop.ogg",
        ASSETS / "audio" / "music" / "gaoler-loop.ogg",
        ASSETS / "audio" / "music" / "pit-climax-loop.ogg",
    ]
    durations = {path.name: round(duration_seconds(path), 3) for path in music}
    require(all(value > 10 for value in durations.values()), "Music contains a missing or implausibly short file")
    source_music = list((ASSETS / "audio" / "music" / "source").glob("*"))
    require(len(source_music) == 5, f"Expected five music source files, found {len(source_music)}")

    print("PASS: 7 actor atlases / 112 actor frames")
    print("PASS: 3 grid atlases / 192 split cells")
    print("PASS: 3 screens + title identity + palette + font")
    print("PASS: 7 web atlases + web attract screen + dual-codec runtime audio")
    print("PASS: 50 stereo PCM SFX with non-silent normalized signal")
    print("PASS: 6 runtime music files / 5 retained source files")
    print("Music durations:", json.dumps(durations, sort_keys=True))


if __name__ == "__main__":
    main()

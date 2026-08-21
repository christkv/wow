#!/usr/bin/env python3
"""Generate the original Project Worbound procedural SFX library.

The script uses only the Python standard library. Outputs are deterministic,
44.1 kHz, 16-bit stereo PCM WAV files. No sample or recording is imported.
"""

from __future__ import annotations

import json
import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
OUTPUT_DIR = Path(__file__).resolve().parents[2] / "assets" / "audio" / "sfx"
TAU = math.tau


def oscillator(kind: str, phase: float) -> float:
    cycle = (phase / TAU) % 1.0
    if kind == "sine":
        return math.sin(phase)
    if kind == "square":
        return 1.0 if cycle < 0.5 else -1.0
    if kind == "triangle":
        return 1.0 - 4.0 * abs(cycle - 0.5)
    if kind == "saw":
        return 2.0 * cycle - 1.0
    raise ValueError(f"Unknown oscillator: {kind}")


def envelope(t: float, duration: float, attack: float, release: float) -> float:
    a = 1.0 if attack <= 0 else min(1.0, t / attack)
    r = 1.0 if release <= 0 else min(1.0, max(0.0, duration - t) / release)
    return a * r


def tone(
    duration: float,
    start_hz: float,
    end_hz: float | None = None,
    *,
    kind: str = "square",
    amplitude: float = 0.35,
    attack: float = 0.004,
    release: float = 0.04,
    vibrato_hz: float = 0.0,
    vibrato_depth: float = 0.0,
    pan: float = 0.0,
) -> tuple[list[float], list[float]]:
    end_hz = start_hz if end_hz is None else end_hz
    count = max(1, round(duration * SAMPLE_RATE))
    left: list[float] = []
    right: list[float] = []
    phase = 0.0
    left_gain = math.sqrt((1.0 - pan) * 0.5)
    right_gain = math.sqrt((1.0 + pan) * 0.5)
    for index in range(count):
        t = index / SAMPLE_RATE
        progress = index / max(1, count - 1)
        hz = start_hz + (end_hz - start_hz) * progress
        if vibrato_hz:
            hz *= 1.0 + vibrato_depth * math.sin(TAU * vibrato_hz * t)
        phase += TAU * hz / SAMPLE_RATE
        value = oscillator(kind, phase) * amplitude * envelope(t, duration, attack, release)
        left.append(value * left_gain)
        right.append(value * right_gain)
    return left, right


def noise(
    duration: float,
    *,
    amplitude: float = 0.25,
    attack: float = 0.001,
    release: float = 0.08,
    pan: float = 0.0,
    seed: int = 1,
    smoothing: float = 0.15,
) -> tuple[list[float], list[float]]:
    rng = random.Random(seed)
    count = max(1, round(duration * SAMPLE_RATE))
    left: list[float] = []
    right: list[float] = []
    state = 0.0
    left_gain = math.sqrt((1.0 - pan) * 0.5)
    right_gain = math.sqrt((1.0 + pan) * 0.5)
    for index in range(count):
        t = index / SAMPLE_RATE
        raw = rng.uniform(-1.0, 1.0)
        state += (raw - state) * smoothing
        value = state * amplitude * envelope(t, duration, attack, release)
        left.append(value * left_gain)
        right.append(value * right_gain)
    return left, right


def silence(duration: float) -> tuple[list[float], list[float]]:
    count = max(1, round(duration * SAMPLE_RATE))
    return [0.0] * count, [0.0] * count


def mix(*layers: tuple[list[float], list[float]]) -> tuple[list[float], list[float]]:
    size = max((len(layer[0]) for layer in layers), default=0)
    left = [0.0] * size
    right = [0.0] * size
    for layer_left, layer_right in layers:
        for index, value in enumerate(layer_left):
            left[index] += value
        for index, value in enumerate(layer_right):
            right[index] += value
    return left, right


def place(
    base: tuple[list[float], list[float]],
    layer: tuple[list[float], list[float]],
    offset: float,
) -> tuple[list[float], list[float]]:
    start = round(offset * SAMPLE_RATE)
    required = start + len(layer[0])
    if len(base[0]) < required:
        extension = required - len(base[0])
        base[0].extend([0.0] * extension)
        base[1].extend([0.0] * extension)
    for index, value in enumerate(layer[0]):
        base[0][start + index] += value
    for index, value in enumerate(layer[1]):
        base[1][start + index] += value
    return base


def sequence(
    notes: list[float],
    step: float,
    *,
    kind: str = "square",
    amplitude: float = 0.28,
    note_ratio: float = 0.78,
    pan_spread: float = 0.0,
) -> tuple[list[float], list[float]]:
    result = silence(max(step, len(notes) * step))
    for index, hz in enumerate(notes):
        pan = 0.0
        if pan_spread:
            pan = -pan_spread if index % 2 == 0 else pan_spread
        result = place(
            result,
            tone(
                step * note_ratio,
                hz,
                kind=kind,
                amplitude=amplitude,
                release=min(0.05, step * 0.3),
                pan=pan,
            ),
            index * step,
        )
    return result


def normalize(stereo: tuple[list[float], list[float]], peak: float = 0.92) -> tuple[list[float], list[float]]:
    maximum = max((abs(value) for channel in stereo for value in channel), default=1.0)
    scale = 1.0 if maximum <= peak else peak / maximum
    return ([value * scale for value in stereo[0]], [value * scale for value in stereo[1]])


def write_wav(name: str, stereo: tuple[list[float], list[float]], category: str, purpose: str) -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stereo = normalize(stereo)
    path = OUTPUT_DIR / f"{name}.wav"
    frame_count = max(len(stereo[0]), len(stereo[1]))
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        for index in range(frame_count):
            left = stereo[0][index] if index < len(stereo[0]) else 0.0
            right = stereo[1][index] if index < len(stereo[1]) else 0.0
            handle.writeframesraw(struct.pack("<hh", int(left * 32767), int(right * 32767)))
    return {
        "file": path.name,
        "category": category,
        "purpose": purpose,
        "duration_seconds": round(frame_count / SAMPLE_RATE, 3),
        "sample_rate": SAMPLE_RATE,
        "channels": 2,
        "format": "PCM_S16LE",
        "rights": "Project-original; distribution license to be chosen by project owner",
    }


def make_library() -> list[dict[str, object]]:
    items: list[tuple[str, tuple[list[float], list[float]], str, str]] = []

    # UI and navigation.
    items += [
        ("ui-move", sequence([660, 880], 0.045, amplitude=0.18), "ui", "Menu focus moves"),
        ("ui-confirm", sequence([523.25, 783.99, 1046.5], 0.075, kind="triangle", amplitude=0.25), "ui", "Confirm/select"),
        ("ui-cancel", sequence([659.25, 440], 0.07, kind="square", amplitude=0.2), "ui", "Cancel/back"),
        ("ui-pause", mix(tone(0.12, 220, kind="square", amplitude=0.25), tone(0.12, 330, kind="triangle", amplitude=0.16)), "ui", "Pause toggled"),
        ("ui-error", sequence([196, 174.61, 146.83], 0.07, kind="square", amplitude=0.22), "ui", "Unavailable action"),
    ]

    # Player movement and weapon state.
    items += [
        ("player-step", mix(tone(0.055, 130, 95, kind="triangle", amplitude=0.18), noise(0.04, amplitude=0.08, seed=11)), "player", "One movement pulse"),
        ("shot-ready", sequence([880, 1320], 0.045, kind="triangle", amplitude=0.18), "weapon", "Weapon becomes ready"),
        ("player-fire-gold", mix(tone(0.18, 1180, 420, kind="square", amplitude=0.36, pan=-0.2), tone(0.12, 2360, 900, kind="triangle", amplitude=0.14, pan=-0.2)), "weapon", "Gold Delver fires"),
        ("player-fire-cyan", mix(tone(0.18, 1320, 480, kind="square", amplitude=0.34, pan=0.2), tone(0.12, 2640, 1040, kind="triangle", amplitude=0.14, pan=0.2)), "weapon", "Cyan Delver fires"),
        ("weapon-live-loop", mix(tone(0.8, 110, kind="triangle", amplitude=0.07, vibrato_hz=7, vibrato_depth=0.03), tone(0.8, 220, kind="sine", amplitude=0.04)), "loop", "Subtle one-shot-in-flight loop"),
    ]

    # Impacts, cancellation, and deaths.
    items += [
        ("impact-wall", mix(tone(0.13, 260, 80, kind="triangle", amplitude=0.3), noise(0.1, amplitude=0.22, release=0.09, seed=22)), "impact", "Projectile hits wall"),
        ("impact-creature", mix(tone(0.22, 720, 90, kind="square", amplitude=0.28), noise(0.18, amplitude=0.3, seed=23, smoothing=0.24)), "impact", "Regular creature destroyed"),
        ("projectile-cancel", mix(tone(0.16, 900, 1500, kind="triangle", amplitude=0.25), tone(0.16, 1500, 500, kind="square", amplitude=0.18)), "impact", "Two projectiles cancel"),
        ("friendly-fire", sequence([1046.5, 523.25, 155.56], 0.09, kind="square", amplitude=0.28), "impact", "Partner shot destroys a Delver"),
        ("player-death", mix(tone(0.72, 980, 55, kind="saw", amplitude=0.3, release=0.25), noise(0.58, amplitude=0.32, release=0.3, seed=24)), "player", "Non-gory starburst death"),
    ]

    # Creature voices and state changes.
    items += [
        ("prowler-voice", mix(tone(0.28, 150, 105, kind="square", amplitude=0.28, vibrato_hz=24, vibrato_depth=0.08), noise(0.22, amplitude=0.18, seed=31)), "enemy", "Prowler vocalization"),
        ("veilmaw-voice", mix(tone(0.38, 240, 115, kind="saw", amplitude=0.24, vibrato_hz=10, vibrato_depth=0.12), tone(0.38, 480, 230, kind="triangle", amplitude=0.1)), "enemy", "Veilmaw vocalization"),
        ("ravager-voice", mix(tone(0.34, 95, 180, kind="square", amplitude=0.3, vibrato_hz=30, vibrato_depth=0.09), noise(0.3, amplitude=0.2, seed=33, smoothing=0.3)), "enemy", "Ravager vocalization"),
        ("enemy-fire", mix(tone(0.22, 360, 130, kind="saw", amplitude=0.3), noise(0.12, amplitude=0.12, seed=34)), "weapon", "Regular enemy fires"),
        ("cloak", mix(tone(0.55, 1200, 90, kind="sine", amplitude=0.27), noise(0.45, amplitude=0.11, seed=35, smoothing=0.04)), "enemy", "Enemy cloaks"),
        ("reveal", mix(tone(0.3, 90, 1260, kind="triangle", amplitude=0.25), sequence([440, 880, 1760], 0.07, amplitude=0.11)), "enemy", "Cloaked enemy reveals"),
        ("transform", mix(sequence([220, 329.63, 493.88, 739.99], 0.11, kind="saw", amplitude=0.2), tone(0.55, 140, 560, kind="triangle", amplitude=0.16)), "enemy", "Tier replacement transformation"),
    ]

    # Gates and re-entry.
    items += [
        ("gate-open", mix(tone(0.5, 85, 680, kind="triangle", amplitude=0.25), tone(0.5, 170, 1360, kind="sine", amplitude=0.12)), "gate", "Warp gate opens"),
        ("gate-traverse", mix(tone(0.36, 1800, 120, kind="saw", amplitude=0.22), noise(0.3, amplitude=0.15, seed=41, smoothing=0.08)), "gate", "Entity traverses warp gate"),
        ("gate-seal", mix(tone(0.2, 240, 60, kind="square", amplitude=0.3), noise(0.11, amplitude=0.2, seed=42)), "gate", "Warp gate seals"),
        ("gate-hum-loop", mix(tone(1.0, 70, kind="sine", amplitude=0.09, vibrato_hz=3, vibrato_depth=0.05), tone(1.0, 140, kind="triangle", amplitude=0.04)), "loop", "Open warp gate ambience"),
        ("entry-tick", tone(0.07, 880, kind="square", amplitude=0.2, release=0.025), "entry", "Re-entry countdown tick"),
        ("entry-forced", sequence([880, 660, 330], 0.075, kind="square", amplitude=0.28), "entry", "Countdown expires and entry is forced"),
        ("entry-release", mix(tone(0.24, 210, 840, kind="triangle", amplitude=0.22), noise(0.16, amplitude=0.08, seed=43)), "entry", "Delver leaves protected alcove"),
    ]

    # Riftwing phase.
    items += [
        ("riftwing-spawn", mix(sequence([392, 587.33, 880, 1318.51], 0.1, kind="triangle", amplitude=0.24), tone(0.65, 120, 960, kind="sine", amplitude=0.1)), "riftwing", "Riftwing phase starts"),
        ("riftwing-flap", mix(tone(0.14, 900, 520, kind="triangle", amplitude=0.18), noise(0.1, amplitude=0.1, seed=51, smoothing=0.07)), "riftwing", "Wing pulse"),
        ("riftwing-caught", mix(sequence([523.25, 659.25, 783.99, 1046.5, 1567.98], 0.11, kind="square", amplitude=0.24), tone(0.76, 180, 720, kind="triangle", amplitude=0.11)), "riftwing", "Riftwing captured; next double armed"),
        ("riftwing-escaped", mix(sequence([659.25, 523.25, 392, 293.66], 0.14, kind="saw", amplitude=0.22), tone(0.7, 450, 70, kind="triangle", amplitude=0.12)), "riftwing", "Riftwing escapes"),
    ]

    # Gaoler phase and non-verbal voice identity.
    items += [
        ("gaoler-imminent-loop", mix(tone(1.2, 48, kind="sine", amplitude=0.13, vibrato_hz=1.7, vibrato_depth=0.08), tone(1.2, 96, kind="triangle", amplitude=0.06), noise(1.2, amplitude=0.04, seed=61, smoothing=0.015)), "loop", "Gaoler warning ambience"),
        ("gaoler-teleport-in", mix(tone(0.72, 70, 1900, kind="saw", amplitude=0.24), noise(0.62, amplitude=0.2, seed=62, smoothing=0.05)), "gaoler", "Gaoler materializes"),
        ("gaoler-teleport-out", mix(tone(0.5, 1700, 55, kind="triangle", amplitude=0.24), noise(0.4, amplitude=0.14, seed=63, smoothing=0.06)), "gaoler", "Gaoler dematerializes"),
        ("gaoler-lightning", mix(tone(0.58, 1900, 85, kind="square", amplitude=0.28, vibrato_hz=45, vibrato_depth=0.15), noise(0.55, amplitude=0.32, seed=64, smoothing=0.34)), "gaoler", "Gaoler lightning bolt"),
        ("gaoler-hit", mix(sequence([1760, 880, 440, 220], 0.09, kind="square", amplitude=0.25), noise(0.38, amplitude=0.22, seed=65)), "gaoler", "Gaoler is struck"),
        ("gaoler-voice-sting", mix(tone(0.85, 105, 72, kind="saw", amplitude=0.25, vibrato_hz=18, vibrato_depth=0.11), tone(0.85, 210, 144, kind="square", amplitude=0.09)), "gaoler", "Non-verbal synthetic host vocal"),
        ("gaoler-laugh", sequence([196, 246.94, 196, 293.66, 196, 349.23], 0.11, kind="saw", amplitude=0.23, pan_spread=0.35), "gaoler", "Synthetic non-verbal laugh motif"),
    ]

    # Scoring, stage, and run punctuation.
    items += [
        ("score-small", tone(0.09, 880, 1320, kind="triangle", amplitude=0.16, release=0.025), "score", "100/200 point event"),
        ("score-large", sequence([880, 1174.66, 1567.98], 0.06, kind="square", amplitude=0.18), "score", "500+ point event"),
        ("double-armed", sequence([392, 587.33, 783.99, 1174.66], 0.13, kind="triangle", amplitude=0.25), "score", "Next-dungeon double score armed"),
        ("double-active", mix(sequence([392, 523.25, 659.25, 783.99, 1046.5], 0.12, kind="square", amplitude=0.24), tone(0.9, 196, 392, kind="sine", amplitude=0.1)), "score", "Double score activates now"),
        ("dungeon-start", sequence([146.83, 220, 293.66, 440], 0.14, kind="square", amplitude=0.24), "stage", "Standard dungeon begins"),
        ("arena-sting", mix(sequence([146.83, 220, 293.66, 349.23, 440], 0.16, kind="saw", amplitude=0.24), tone(1.1, 73.42, kind="square", amplitude=0.08)), "stage", "Arena milestone announced"),
        ("pit-sting", mix(sequence([110, 110, 164.81, 123.47, 92.5], 0.22, kind="square", amplitude=0.26), noise(1.2, amplitude=0.1, seed=71, smoothing=0.025)), "stage", "Pit milestone announced"),
        ("bonus-life", sequence([523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98], 0.1, kind="triangle", amplitude=0.24), "score", "Bonus life awarded"),
        ("personal-best", sequence([392, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98], 0.11, kind="square", amplitude=0.22), "score", "New personal best"),
        ("game-over", mix(sequence([329.63, 293.66, 246.94, 196, 146.83, 98], 0.24, kind="square", amplitude=0.24), tone(1.65, 82.41, 41.2, kind="triangle", amplitude=0.11, release=0.45)), "stage", "Run ends"),
    ]

    metadata: list[dict[str, object]] = []
    for name, stereo, category, purpose in items:
        metadata.append(write_wav(name, stereo, category, purpose))
    metadata.sort(key=lambda item: str(item["file"]))
    return metadata


def main() -> None:
    metadata = make_library()
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps({"generator": Path(__file__).name, "assets": metadata}, indent=2) + "\n")
    print(f"Generated {len(metadata)} SFX files in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

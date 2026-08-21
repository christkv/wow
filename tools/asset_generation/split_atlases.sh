#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$project_root"

directions=(south east north west)

split_sprite_sheet() {
  local sheet_path="$1"
  local actor_name="$2"
  shift 2
  local states=("$@")
  local output_dir="assets/art/sprites/frames/$actor_name"
  mkdir -p "$output_dir"

  local row column crop_x crop_y
  for row in 0 1 2 3; do
    for column in 0 1 2 3; do
      crop_x=$((column * 314))
      crop_y=$((row * 314))
      ffmpeg -loglevel error -y -i "$sheet_path" \
        -vf "crop=314:314:${crop_x}:${crop_y},format=rgba" -frames:v 1 \
        "$output_dir/${directions[$row]}-${states[$column]}.png"
    done
  done
}

split_grid_sheet() {
  local sheet_path="$1"
  local output_dir="$2"
  local prefix="$3"
  mkdir -p "$output_dir"

  local row column crop_x crop_y
  for row in 0 1 2 3 4 5 6 7; do
    for column in 0 1 2 3 4 5 6 7; do
      crop_x=$((column * 157))
      crop_y=$((row * 157))
      ffmpeg -loglevel error -y -i "$sheet_path" \
        -vf "crop=157:157:${crop_x}:${crop_y},format=rgba" -frames:v 1 \
        "$output_dir/${prefix}-r${row}-c${column}.png"
    done
  done
}

split_sprite_sheet assets/art/sprites/delver-gold.png delver-gold idle walk-a walk-b fire
split_sprite_sheet assets/art/sprites/delver-cyan.png delver-cyan idle walk-a walk-b fire
split_sprite_sheet assets/art/sprites/prowler.png prowler idle scuttle-a scuttle-b fire
split_sprite_sheet assets/art/sprites/veilmaw.png veilmaw stalk-a stalk-b fire cloak
split_sprite_sheet assets/art/sprites/ravager.png ravager sprint-a sprint-b fire cloak
split_sprite_sheet assets/art/sprites/riftwing.png riftwing flap-closed flap-half flap-open dash
split_sprite_sheet assets/art/sprites/gaoler.png gaoler materialize hover cast dematerialize

split_grid_sheet assets/art/tiles/maze-tiles.png assets/art/tiles/cells tile
split_grid_sheet assets/art/ui/hud-icons.png assets/art/ui/icons icon
split_grid_sheet assets/art/vfx/game-effects.png assets/art/vfx/frames vfx

echo "Split 112 actor frames and 192 atlas cells."

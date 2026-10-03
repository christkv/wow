#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$project_root"

runtime_root="assets/runtime/web"
mkdir -p "$runtime_root/sprites" "$runtime_root/screens" "$runtime_root/audio"

actors=(delver-gold delver-cyan prowler veilmaw ravager riftwing gaoler)
for actor in "${actors[@]}"; do
  ffmpeg -hide_banner -loglevel error -y \
    -i "assets/art/sprites/${actor}.png" \
    -vf "scale=256:256:flags=neighbor,format=rgba" \
    -frames:v 1 "$runtime_root/sprites/${actor}.png"
done

ffmpeg -hide_banner -loglevel error -y \
  -i assets/art/screens/attract-screen.png \
  -vf "scale=640:360:flags=neighbor,format=rgb24" \
  -frames:v 1 "$runtime_root/screens/attract-screen.png"

sfx=(
  player-fire-gold
  player-fire-cyan
  enemy-fire
  impact-wall
  impact-creature
  player-death
  cloak
  reveal
  transform
  riftwing-spawn
  riftwing-caught
  riftwing-escaped
  gaoler-teleport-in
  gaoler-lightning
  gaoler-hit
  dungeon-start
  game-over
)
for cue in "${sfx[@]}"; do
  ffmpeg -hide_banner -loglevel error -y \
    -i "assets/audio/sfx/${cue}.wav" \
    -c:a vorbis -strict -2 -q:a 4 \
    "$runtime_root/audio/${cue}.ogg"
  ffmpeg -hide_banner -loglevel error -y \
    -i "assets/audio/sfx/${cue}.wav" \
    -c:a aac -b:a 96k \
    "$runtime_root/audio/${cue}.m4a"
done

ffmpeg -hide_banner -loglevel error -y \
  -i assets/audio/music/attract-loop.ogg \
  -c:a aac -b:a 112k "$runtime_root/audio/music-attract.m4a"
ffmpeg -hide_banner -loglevel error -y \
  -i assets/audio/music/dungeon-loop.ogg \
  -c:a aac -b:a 112k "$runtime_root/audio/music-dungeon.m4a"

echo "Built 7 web actor atlases, 1 web screen, and dual-codec runtime audio in $runtime_root."

import { MAZES, mazeForDungeon } from "./mazes";
import type { MapRotation, MazeDefinition } from "./model";

const MAPS = Object.values(MAZES);
export function createMapRotation(seed: number, enabled = false): MapRotation {
  // Avalanche nearby timestamp seeds before the first shuffle draw.
  let mixed = seed ^ 0x3c6ef372;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85ebca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2b2ae35);
  return { enabled, rngState: (mixed ^ (mixed >>> 16)) >>> 0 || 1, remaining: [], previous: null };
}
function random(rotation: MapRotation): number {
  let x = rotation.rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  rotation.rngState = x >>> 0;
  return rotation.rngState / 4_294_967_296;
}
export function nextMaze(rotation: MapRotation, dungeon: number): MazeDefinition {
  if (!rotation.enabled) return mazeForDungeon(dungeon);
  if (!rotation.remaining.length) {
    rotation.remaining = MAPS.map((_map, index) => index);
    for (let i = rotation.remaining.length - 1; i > 0; i--) {
      const j = Math.floor(random(rotation) * (i + 1));
      [rotation.remaining[i], rotation.remaining[j]] = [rotation.remaining[j]!, rotation.remaining[i]!];
    }
    // Draw from the end, keeping the boundary between bags repeat-free too.
    const last = rotation.remaining.length - 1;
    if (rotation.remaining[last] === rotation.previous) {
      [rotation.remaining[0], rotation.remaining[last]] = [rotation.remaining[last]!, rotation.remaining[0]!];
    }
  }
  const index = rotation.remaining.pop()!;
  rotation.previous = index;
  return MAPS[index]!;
}

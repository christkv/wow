import { TILE_SIZE, type MazeDefinition, type Vector } from "./model";

const WIDTH = 34;
const HEIGHT = 16;
const GATE_ROW = 7;

type Segment = readonly [x1: number, y1: number, x2: number, y2: number];
type Cell = readonly [x: number, y: number];

const DEFAULT_ENEMY_CELLS: readonly Cell[] = [[3, 2], [8, 7], [13, 2], [20, 13], [25, 7], [30, 2]];

function blankMaze(): boolean[][] {
  const walls = Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => false));
  for (let x = 0; x < WIDTH; x += 1) {
    walls[0]![x] = true;
    walls[HEIGHT - 1]![x] = true;
  }
  for (let y = 0; y < HEIGHT; y += 1) {
    walls[y]![0] = true;
    walls[y]![WIDTH - 1] = true;
  }
  walls[GATE_ROW]![0] = false;
  walls[GATE_ROW]![WIDTH - 1] = false;
  return walls;
}

function wallLine(walls: boolean[][], [x1, y1, x2, y2]: Segment): void {
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x1;
  let y = y1;
  for (;;) {
    walls[y]![x] = true;
    if (x === x2 && y === y2) break;
    x += dx;
    y += dy;
  }
}

function cell([x, y]: Cell): Vector {
  return { x: (x + 0.5) * TILE_SIZE, y: (y + 0.5) * TILE_SIZE };
}

function authoredMaze(
  id: string,
  segments: readonly Segment[],
  openings: readonly Cell[] = [],
  enemyCells: readonly Cell[] = DEFAULT_ENEMY_CELLS
): MazeDefinition {
  const walls = blankMaze();
  for (const segment of segments) wallLine(walls, segment);
  const playerCells: Record<"gold" | "cyan", Cell> = { gold: [3, 13], cyan: [30, 13] };
  for (const [x, y] of [...openings, ...enemyCells, playerCells.gold, playerCells.cyan]) walls[y]![x] = false;
  return {
    id,
    width: WIDTH,
    height: HEIGHT,
    walls,
    playerSpawns: { gold: cell(playerCells.gold), cyan: cell(playerCells.cyan) },
    enemySpawns: enemyCells.map(cell),
    gateRow: GATE_ROW
  };
}

const lattice01 = authoredMaze("lattice-01", [
  [5, 2, 5, 5], [5, 9, 5, 13], [10, 1, 10, 4], [10, 7, 10, 11],
  [16, 2, 16, 6], [16, 9, 16, 13], [23, 1, 23, 4], [23, 7, 23, 11],
  [28, 2, 28, 5], [28, 9, 28, 13], [2, 4, 8, 4], [12, 4, 14, 4],
  [18, 4, 21, 4], [25, 4, 31, 4], [2, 11, 8, 11], [12, 11, 14, 11],
  [18, 11, 21, 11], [25, 11, 31, 11]
]);

const lattice02 = authoredMaze("lattice-02", [
  [7, 1, 7, 6], [7, 9, 7, 14], [13, 3, 13, 12], [20, 3, 20, 12],
  [26, 1, 26, 6], [26, 9, 26, 14], [2, 3, 5, 3], [9, 3, 17, 3],
  [22, 3, 24, 3], [28, 3, 31, 3], [2, 12, 5, 12], [9, 12, 17, 12],
  [22, 12, 24, 12], [28, 12, 31, 12], [10, 7, 15, 7], [18, 8, 23, 8]
], [[13, 7], [20, 8]], [[3, 2], [9, 8], [16, 5], [18, 10], [24, 7], [30, 2]]);

const rings01 = authoredMaze("rings-01", [
  [5, 3, 28, 3], [5, 12, 28, 12], [5, 3, 5, 12], [28, 3, 28, 12],
  [10, 6, 23, 6], [10, 9, 23, 9], [10, 6, 10, 9], [23, 6, 23, 9]
], [[5, 7], [16, 3], [28, 8], [17, 12], [10, 7], [23, 8]], [[3, 2], [7, 7], [13, 7], [20, 8], [26, 8], [30, 2]]);

const rings02 = authoredMaze("rings-02", [
  [3, 2, 30, 2], [3, 13, 30, 13], [3, 2, 3, 13], [30, 2, 30, 13],
  [8, 5, 25, 5], [8, 10, 25, 10], [8, 5, 8, 10], [25, 5, 25, 10],
  [14, 7, 19, 7], [14, 8, 19, 8]
], [[3, 7], [17, 2], [30, 7], [16, 13], [8, 7], [25, 8], [16, 7], [17, 8]], [[5, 3], [6, 8], [12, 7], [21, 8], [27, 7], [28, 3]]);

const crossroads01 = authoredMaze("crossroads-01", [
  [2, 5, 31, 5], [2, 10, 31, 10], [11, 1, 11, 14], [22, 1, 22, 14],
  [5, 2, 5, 3], [28, 12, 28, 13]
], [[6, 5], [11, 3], [11, 8], [11, 12], [17, 5], [17, 10], [22, 3], [22, 7], [22, 12], [27, 10]], [[3, 2], [8, 7], [14, 3], [19, 12], [25, 8], [30, 2]]);

const crossroads02 = authoredMaze("crossroads-02", [
  [4, 4, 29, 4], [4, 11, 29, 11], [8, 1, 8, 14], [17, 1, 17, 14], [25, 1, 25, 14],
  [12, 7, 15, 7], [19, 8, 22, 8]
], [[8, 3], [8, 8], [8, 12], [13, 4], [20, 4], [17, 6], [17, 10], [25, 3], [25, 7], [25, 12], [14, 11], [21, 11]], [[3, 2], [6, 7], [12, 2], [21, 13], [27, 8], [30, 2]]);

const splitKeep01 = authoredMaze("split-keep-01", [
  [16, 1, 16, 14], [17, 1, 17, 14], [4, 4, 12, 4], [4, 11, 12, 11],
  [21, 4, 29, 4], [21, 11, 29, 11], [7, 6, 7, 9], [26, 6, 26, 9]
], [[16, 3], [17, 3], [16, 7], [17, 7], [16, 12], [17, 12], [7, 7], [26, 8]]);

const splitKeep02 = authoredMaze("split-keep-02", [
  [14, 1, 14, 14], [19, 1, 19, 14], [5, 3, 11, 3], [5, 12, 11, 12],
  [22, 3, 28, 3], [22, 12, 28, 12], [14, 6, 19, 6], [14, 9, 19, 9]
], [[14, 3], [14, 8], [14, 12], [19, 3], [19, 7], [19, 12], [16, 6], [17, 9]], [[3, 2], [8, 8], [12, 5], [21, 10], [25, 7], [30, 2]]);

const coils01 = authoredMaze("coils-01", [
  [4, 2, 29, 2], [4, 2, 4, 13], [4, 13, 26, 13], [8, 5, 29, 5],
  [29, 5, 29, 10], [11, 10, 29, 10], [11, 7, 11, 10], [11, 7, 24, 7]
], [[4, 7], [16, 2], [20, 5], [29, 7], [18, 10], [16, 13], [11, 8], [24, 7]], [[3, 3], [7, 7], [13, 3], [20, 12], [26, 8], [30, 3]]);

const gauntlet01 = authoredMaze("gauntlet-01", [
  [6, 1, 6, 11], [11, 4, 11, 14], [16, 1, 16, 11], [21, 4, 21, 14], [26, 1, 26, 11],
  [2, 6, 4, 6], [8, 9, 9, 9], [13, 6, 14, 6], [18, 9, 19, 9], [23, 6, 24, 6], [28, 9, 31, 9]
], [[6, 3], [6, 8], [11, 6], [11, 11], [16, 3], [16, 8], [21, 6], [21, 11], [26, 3], [26, 8]]);

const arena01 = authoredMaze("arena-01", [
  [6, 4, 9, 4], [6, 11, 9, 11], [24, 4, 27, 4], [24, 11, 27, 11],
  [15, 6, 18, 6], [15, 9, 18, 9]
]);

const pit01 = authoredMaze("pit-01", [], [], [[3, 2], [9, 4], [14, 7], [19, 8], [24, 11], [30, 2]]);

export const STANDARD_MAZES: readonly MazeDefinition[] = [
  lattice01, lattice02, rings01, rings02, crossroads01,
  crossroads02, splitKeep01, splitKeep02, coils01, gauntlet01
];

export const MAZES = {
  lattice01, lattice02, rings01, rings02, crossroads01, crossroads02,
  splitKeep01, splitKeep02, coils01, gauntlet01, arena: arena01, pit: pit01
} as const;

function isPitDungeon(dungeon: number): boolean {
  return dungeon >= 13 && (dungeon - 13) % 6 === 0;
}

function isArenaDungeon(dungeon: number): boolean {
  return dungeon === 4 || (dungeon > 13 && dungeon % 6 === 4);
}

function standardOrdinal(dungeon: number): number {
  let ordinal = -1;
  for (let candidate = 1; candidate <= dungeon; candidate += 1) {
    if (!isPitDungeon(candidate) && !isArenaDungeon(candidate)) ordinal += 1;
  }
  return ordinal;
}

export function mazeForDungeon(dungeon: number): MazeDefinition {
  if (isPitDungeon(dungeon)) return pit01;
  if (isArenaDungeon(dungeon)) return arena01;
  return STANDARD_MAZES[standardOrdinal(dungeon) % STANDARD_MAZES.length] ?? lattice01;
}

import { DIRECTION_VECTOR, TILE_SIZE, type Direction, type MazeDefinition, type Vector } from "./model";

export const PLAYER_RADIUS = 5;
export const ENEMY_RADIUS = 5;
export const RIFTWING_RADIUS = 4;
export const PLAYER_SPEED = 1.25;
export const RIFTWING_SPEED = 1.45;

export function isWall(maze: MazeDefinition, x: number, y: number): boolean {
  const cx = Math.floor(x / TILE_SIZE), cy = Math.floor(y / TILE_SIZE);
  if (cy < 0 || cy >= maze.height) return true;
  if (cx < 0 || cx >= maze.width) return cy !== maze.gateRow;
  return maze.walls[cy]?.[cx] ?? true;
}

// Half-open tile ranges exclude exact tangency on either side of the body.
export function isWalkable(maze: MazeDefinition, x: number, y: number, radius: number): boolean {
  for (let cy = Math.floor((y - radius) / TILE_SIZE); cy < Math.ceil((y + radius) / TILE_SIZE); cy++) {
    for (let cx = Math.floor((x - radius) / TILE_SIZE); cx < Math.ceil((x + radius) / TILE_SIZE); cx++) {
      if (isWall(maze, (cx + .5) * TILE_SIZE, (cy + .5) * TILE_SIZE)) return false;
    }
  }
  return true;
}

export function tryMove(maze: MazeDefinition, actor: { x: number; y: number }, direction: Direction, speed: number, radius: number, gateOpen: boolean): boolean {
  const vector = DIRECTION_VECTOR[direction];
  const nextX = actor.x + vector.x * speed, nextY = actor.y + vector.y * speed;
  const width = maze.width * TILE_SIZE;
  const protrusion = (x: number): number => Math.max(0, radius - x, x + radius - width);
  // A gate may close while another actor straddles the boundary. Always allow
  // that actor to retreat inside, but never let a closed gate start/finish an exit.
  if (!gateOpen && protrusion(nextX) > 0 && protrusion(nextX) >= protrusion(actor.x)) return false;
  const steps = Math.max(1, Math.ceil(speed / (TILE_SIZE / 2)));
  for (let i = 1; i <= steps; i++) {
    if (!isWalkable(maze, actor.x + vector.x * speed * i / steps, actor.y + vector.y * speed * i / steps, radius)) return false;
  }
  const inGateLane = Math.abs(nextY - (maze.gateRow + .5) * TILE_SIZE) + radius <= TILE_SIZE / 2;
  if (gateOpen && inGateLane && direction === "west" && nextX < -radius) {
    const exitX = width - radius;
    if (!isWalkable(maze, exitX, nextY, radius)) return false;
    actor.x = exitX;
  } else if (gateOpen && inGateLane && direction === "east" && nextX > width + radius) {
    if (!isWalkable(maze, radius, nextY, radius)) return false;
    actor.x = radius;
  } else actor.x = nextX;
  actor.y = nextY;
  return true;
}

export function nearestFloor(maze: MazeDefinition, position: Vector, radius: number): Vector {
  let best: Vector | null = null, distance = Infinity;
  for (let y = 0; y < maze.height; y++) for (let x = 0; x < maze.width; x++) {
    const p = { x: (x + .5) * TILE_SIZE, y: (y + .5) * TILE_SIZE };
    const d = (p.x - position.x) ** 2 + (p.y - position.y) ** 2;
    if (d < distance && isWalkable(maze, p.x, p.y, radius)) { best = p; distance = d; }
  }
  if (!best) throw new Error(`Maze ${maze.id} has no floor for radius ${radius}`);
  return best;
}

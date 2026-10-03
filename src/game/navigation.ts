import { DIRECTION_VECTOR, TILE_SIZE, type Direction, type MazeDefinition, type Vector } from "./model";
import { isWalkable, nearestFloor, tryMove } from "./collision";

const DIRECTIONS: readonly Direction[] = ["north", "east", "south", "west"];
interface RouteStep { direction: Direction; distance: number }

// Breadth-first routes use body-clear tile centers; no random choices or hidden
// actor state. Re-evaluate each tick so openings cannot be skipped between turns.
export function navigationStep(maze: MazeDefinition, actor: Vector, target: Vector, radius: number, speed: number, gateOpen: boolean): RouteStep | null {
  const goal = nearestFloor(maze, target, radius);
  const goalX = Math.floor(goal.x / TILE_SIZE), goalY = Math.floor(goal.y / TILE_SIZE);
  const cx = Math.max(0, Math.min(maze.width - 1, Math.floor(actor.x / TILE_SIZE)));
  const cy = Math.max(0, Math.min(maze.height - 1, Math.floor(actor.y / TILE_SIZE)));
  const key = (x: number, y: number): number => y * maze.width + x;
  const distances = new Int32Array(maze.width * maze.height).fill(-1);
  const queue: Array<[number, number]> = [[goalX, goalY]];
  distances[key(goalX, goalY)] = 0;
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i]!;
    for (const direction of DIRECTIONS) {
      const v = DIRECTION_VECTOR[direction], nx = x + v.x, ny = y + v.y;
      if (nx < 0 || nx >= maze.width || ny < 0 || ny >= maze.height || distances[key(nx, ny)] !== -1) continue;
      if (!isWalkable(maze, (nx + .5) * TILE_SIZE, (ny + .5) * TILE_SIZE, radius)) continue;
      distances[key(nx, ny)] = distances[key(x, y)]! + 1;
      queue.push([nx, ny]);
    }
  }

  function toward(point: Vector, horizontal: boolean): RouteStep | null {
    const delta = horizontal ? point.x - actor.x : point.y - actor.y;
    if (Math.abs(delta) < 1e-8) return null;
    const direction: Direction = horizontal ? (delta > 0 ? "east" : "west") : (delta > 0 ? "south" : "north");
    // Validate the whole straight segment before committing to this lane.
    if (!tryMove(maze, { ...actor }, direction, Math.abs(delta), radius, gateOpen)) return null;
    return { direction, distance: Math.min(speed, Math.abs(delta)) };
  }

  if (cx === goalX && cy === goalY) {
    // At an exit, align to the gate before crossing. When closed, an actor
    // already outside first retreats to the gate's floor center.
    const outside = target.x < 0 || target.x > maze.width * TILE_SIZE;
    const destination = outside && !gateOpen ? goal : target;
    return toward(destination, false) ?? toward(destination, true);
  }
  const distance = distances[key(cx, cy)]!;
  for (const direction of DIRECTIONS) {
    const v = DIRECTION_VECTOR[direction], nx = cx + v.x, ny = cy + v.y;
    if (nx < 0 || nx >= maze.width || ny < 0 || ny >= maze.height || distances[key(nx, ny)] !== distance - 1 || distance <= 0) continue;
    const waypoint = { x: (nx + .5) * TILE_SIZE, y: (ny + .5) * TILE_SIZE };
    const horizontal = v.x !== 0;
    const direct = toward(waypoint, horizontal);
    if (direct) return direct;
    const alignment = toward({ x: (cx + .5) * TILE_SIZE, y: (cy + .5) * TILE_SIZE }, !horizontal);
    if (alignment) return alignment;
  }
  return null;
}

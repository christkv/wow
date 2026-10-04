import { PLAYER_RADIUS, ENEMY_RADIUS, RIFTWING_RADIUS } from "../game/collision";
import { companionCommand } from "../game/ai";
import { MAZES } from "../game/mazes";
import { ACTOR_DISPLAY_SIZE, NEUTRAL_COMMAND, TILE_SIZE, type CombatProfile, type Direction, type MazeDefinition, type PlayerCommand, type PlayerId, type WorldState } from "../game/model";
import { createWorld, stepWorld } from "../game/simulation";

export const AUDIT_SEED = 72;
export const DIRECTIONS: readonly Direction[] = ["north", "east", "south", "west"];
export const commands = (gold: Direction | null = null, cyan: Direction | null = null): Record<PlayerId, PlayerCommand> => ({
  gold: { ...NEUTRAL_COMMAND, move: gold }, cyan: { ...NEUTRAL_COMMAND, move: cyan }
});

export interface CollisionScenario {
  id: string;
  title: string;
  description: string;
  expected: string;
  regression?: boolean;
  combat?: boolean;
  pickup?: boolean;
  create: (profile?: CombatProfile) => WorldState;
  commands: (world: WorldState, reactionTicks?: number) => Record<PlayerId, PlayerCommand>;
}

// Fixtures intentionally use the public simulation API. No replacement physics.
export function fixtureWorld(maze: MazeDefinition = MAZES.pit, enemyCount = 0): WorldState {
  const world = createWorld({ pickups: false, mode: "practice", seed: AUDIT_SEED, enemyCount });
  world.maze = maze;
  // Keep ordinary movement fixtures isolated from enemy AI and phase changes.
  world.phase = "entry";
  world.phaseTicks = 1_000_000;
  for (const id of ["gold", "cyan"] as const) Object.assign(world.players[id], maze.playerSpawns[id]);
  return world;
}

export function wallWorld(direction: Direction, enemy = false): WorldState {
  const walls = MAZES.pit.walls.map(row => [...row]);
  walls[4]![5] = true;
  const world = fixtureWorld({ ...MAZES.pit, id: "single-wall", walls }, enemy ? 1 : 0);
  const starts = { north: { x: 88, y: 104 }, east: { x: 56, y: 72 }, south: { x: 88, y: 40 }, west: { x: 120, y: 72 } };
  const actor = enemy ? world.enemies[0]! : world.players.gold;
  Object.assign(actor, starts[direction], { facing: direction });
  if (enemy) {
    world.phase = "clear";
    Object.assign(actor, { decisionTicks: 1_000_000, fireCooldownTicks: 1_000_000 });
  }
  return world;
}

export function riftwingWorld(maze: MazeDefinition): WorldState {
  const world = fixtureWorld(cloneMaze(maze));
  world.phase = "clear";
  stepWorld(world, commands()); // Trigger the real spawn code, including its seeded gate choice.
  return world;
}

function cloneMaze(maze: MazeDefinition): MazeDefinition {
  return { ...maze, walls: maze.walls.map(row => [...row]) };
}

export const COLLISION_SCENARIOS: readonly CollisionScenario[] = [
  ...DIRECTIONS.map(direction => ({
    id: `wall-${direction}`, title: `Player → wall / ${direction}`,
    description: "Gold approaches an isolated wall. The full movement step is rejected on contact.",
    expected: "The collision box stays outside the wall; reversing should work immediately.",
    create: () => wallWorld(direction), commands: () => commands(direction)
  })),
  {
    id: "enemy-wall", title: "Enemy → wall", description: "A Prowler approaches the same wall, then chooses a new direction when blocked.",
    expected: "Enemy corners never enter a solid tile.", create: () => wallWorld("east", true), commands: () => commands()
  },
  {
    id: "narrow-opening", title: "Player / narrow opening", description: "Gold is slightly off-center beside a one-tile opening in Rings. Try manual south, then east.",
    expected: "East is blocked at y=115. Passage becomes possible at 117 ≤ y ≤ 123.",
    create: () => { const w = fixtureWorld(MAZES.rings01); Object.assign(w.players.gold, { x: 74, y: 115 }); return w; },
    commands: () => commands("east")
  },
  {
    id: "gate-stranding", title: "Gate / simultaneous traversal", regression: true,
    description: "Gold finishes a westward crossing while Cyan is partway outside the right gate.",
    expected: "Cyan finishes entering even while the gate is closed. New outward movement waits for cooldown.",
    create: () => { const w = fixtureWorld(); Object.assign(w.players.gold, { x: -4, y: 120 }); Object.assign(w.players.cyan, { x: 545, y: 120 }); return w; },
    commands: w => commands(w.tick === 0 ? "west" : null, "west")
  },
  {
    id: "companion-corner", title: "Companion / corner deadlock", regression: true,
    description: "Cyan starts off-center beside a narrow opening. The target is held stationary.",
    expected: "Cyan aligns with the opening, finds a clear shot, and defeats the target.",
    create: () => {
      const w = fixtureWorld(MAZES.rings01, 1);
      w.remainingChains = 0; // Isolate reaching a clear shot, not replacement timing.
      w.phase = "gaoler"; // No Gaoler: freeze enemy updates while exercising companion commands.
      Object.assign(w.players.cyan, { x: 74, y: 115 }); Object.assign(w.enemies[0]!, { x: 120, y: 123 }); return w;
    },
    commands: w => ({ gold: NEUTRAL_COMMAND, cyan: companionCommand(w) })
  },
  {
    id: "riftwing-clearance", title: "Riftwing / clearance mismatch", regression: true,
    description: "Riftwing fits horizontally through the opening with its 8×8 body. Its route checks use the same body size as movement.",
    expected: "Riftwing heads west through the opening toward the left gate.",
    create: () => {
      const w = riftwingWorld(MAZES.rings01);
      Object.assign(w.riftwing!, { x: 88, y: 116.5, facing: "west", targetGate: "left" }); return w;
    }, commands: () => commands()
  },
  {
    id: "closed-gate", title: "Riftwing / closed gate", regression: true,
    description: "Riftwing is already approaching the left exit with 100 ticks of gate cooldown remaining.",
    expected: "Riftwing retreats inside and waits for the gate to reopen before escaping.",
    create: () => {
      const w = riftwingWorld(MAZES.pit); w.gateCooldownTicks = 100;
      Object.assign(w.riftwing!, { x: -3, y: 120, facing: "west", targetGate: "left" }); return w;
    }, commands: () => commands()
  },
  ...Object.values(MAZES).map(maze => ({
    id: `riftwing-${maze.id}`, title: `Riftwing / ${maze.id}`, regression: true,
    description: "The real clear-phase transition spawns Riftwing. Seed 72 makes the chase repeatable; players stay still.",
    expected: "Spawn without wall overlap, navigate the maze, and eventually escape. Red boxes mark actual overlap; a yellow box can still be stuck navigating.",
    create: () => riftwingWorld(maze), commands: () => commands()
  }))
];

export interface CollisionBody { id: string; x: number; y: number; halfSize: number; sprite: string; displaySize: number; facing: Direction }

// Body sizes are shared with movement. The independent overlap oracle below does
// rectangle/tile intersection, not the production four-corner sampling algorithm.
export function collisionBodies(world: WorldState): CollisionBody[] {
  const bodies: CollisionBody[] = Object.values(world.players).filter(p => p.alive).map(p => ({
    ...p, halfSize: PLAYER_RADIUS, sprite: `delver-${p.id}`, displaySize: ACTOR_DISPLAY_SIZE
  }));
  bodies.push(...world.enemies.map(e => ({ ...e, id: `enemy-${e.id}`, halfSize: ENEMY_RADIUS, sprite: e.kind, displaySize: ACTOR_DISPLAY_SIZE })));
  if (world.pickups.brute) bodies.push({ ...world.pickups.brute, id: "brute", halfSize: ENEMY_RADIUS, sprite: "ravager", displaySize: ACTOR_DISPLAY_SIZE });
  if (world.riftwing) bodies.push({ ...world.riftwing, id: "riftwing", halfSize: RIFTWING_RADIUS, sprite: "riftwing", displaySize: ACTOR_DISPLAY_SIZE });
  return bodies;
}

export function overlapsWall(maze: MazeDefinition, body: { x: number; y: number; halfSize: number }): boolean {
  const { x, y, halfSize: r } = body;
  for (let cy = Math.floor((y - r) / TILE_SIZE); cy <= Math.floor((y + r) / TILE_SIZE); cy++) {
    for (let cx = Math.floor((x - r) / TILE_SIZE); cx <= Math.floor((x + r) / TILE_SIZE); cx++) {
      const solid = cy < 0 || cy >= maze.height || ((cx < 0 || cx >= maze.width) ? cy !== maze.gateRow : maze.walls[cy]?.[cx] ?? true);
      if (solid && x + r > cx * TILE_SIZE && x - r < (cx + 1) * TILE_SIZE && y + r > cy * TILE_SIZE && y - r < (cy + 1) * TILE_SIZE) return true;
    }
  }
  return false;
}

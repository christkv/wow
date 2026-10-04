import {
  DIRECTION_VECTOR,
  NEUTRAL_COMMAND,
  TILE_SIZE,
  type Direction,
  type EnemyKind,
  type EnemyState,
  type GameEvent,
  type MazeDefinition,
  type PlayerCommand,
  type PlayerId,
  type PlayerState,
  type ProjectileState,
  type Vector,
  type WorldOptions,
  type WorldState
} from "./model";
import { mazeForDungeon } from "./mazes";

import { ENEMY_RADIUS, PLAYER_RADIUS, PLAYER_SPEED, RIFTWING_RADIUS, RIFTWING_SPEED, isWall, nearestFloor, tryMove } from "./collision";
import { navigationStep } from "./navigation";
export { isWall } from "./collision";
import { combatTuning, enemyShotLimit, successionChains } from "./combat";
import { activeEffect, bombReaches, canPlayerFire, createPickups, damageBrute, resetPickups, updateBrute, updatePickups } from "./pickups";
const PROJECTILE_RADIUS = 2.5;
const ENTRY_TICKS = 60;
const TRANSITION_TICKS = 120;

function player(id: PlayerId, spawn: Vector): PlayerState {
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    facing: "north",
    lives: 3,
    score: 0,
    alive: true,
    respawnTicks: 0,
    shotId: null,
    fireBufferUntil: 0,
    invulnerableTicks: ENTRY_TICKS
  };
}

function random(world: WorldState): number {
  let x = world.rngState | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rngState = x >>> 0;
  return world.rngState / 4_294_967_296;
}

function distanceSquared(a: Vector, b: Vector): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function crossedGate(beforeX: number, afterX: number, maze: MazeDefinition): boolean {
  return Math.abs(afterX - beforeX) > maze.width * TILE_SIZE * 0.5;
}

function makeEnemy(world: WorldState, spawn: Vector): EnemyState {
  return {
    id: world.nextEntityId++,
    kind: "prowler",
    tier: 0,
    x: spawn.x,
    y: spawn.y,
    facing: random(world) < 0.5 ? "east" : "west",
    decisionTicks: 1,
    fireCooldownTicks: 90 + Math.floor(random(world) * 120),
    cloaked: false,
    windupTicks: 0,
    fireDirection: null,
    arrivalTicks: 0
  };
}

function populateEnemies(world: WorldState, count: number): void {
  world.remainingChains = Math.min(count, combatTuning(world).stagedSuccession ? successionChains(world.dungeon) : count);
  world.enemies = world.maze.enemySpawns.slice(0, count).map((spawn, index) => {
    const enemy = makeEnemy(world, spawn);
    if (world.dungeon >= 8 && index < 2) transformEnemy(enemy);
    if (world.dungeon >= 12 && index === 0) transformEnemy(enemy);
    if (enemy.tier > 0) world.remainingChains = Math.max(0, world.remainingChains - 1);
    return enemy;
  });
}

export function createWorld(options: WorldOptions): WorldState {
  const seed = options.seed ?? 0x57_4f_52;
  const maze = mazeForDungeon(1);
  const world: WorldState = {
    mode: options.mode,
    seed,
    combatProfile: options.combatProfile ?? "balanced",
    remainingChains: 0,
    pickups: createPickups(seed, options.pickups ?? true),
    tick: 0,
    rngState: seed >>> 0 || 1,
    dungeon: 1,
    maze,
    phase: "entry",
    phaseTicks: ENTRY_TICKS,
    objective: "ENTER THE MAZE",
    multiplier: 1,
    nextDouble: false,
    gateCooldownTicks: 0,
    players: {
      gold: player("gold", maze.playerSpawns.gold),
      cyan: player("cyan", maze.playerSpawns.cyan)
    },
    enemies: [],
    projectiles: [],
    riftwing: null,
    gaoler: null,
    nextEntityId: 1
  };
  populateEnemies(world, options.enemyCount ?? 6);
  return world;
}

function spawnProjectile(
  world: WorldState,
  ownerType: ProjectileState["ownerType"],
  ownerId: ProjectileState["ownerId"],
  x: number,
  y: number,
  direction: Direction
): ProjectileState {
  const vector = DIRECTION_VECTOR[direction];
  const projectile: ProjectileState = {
    id: world.nextEntityId++,
    ownerType,
    ownerId,
    x: x + vector.x * 8,
    y: y + vector.y * 8,
    direction,
    ttlTicks: 180,
    ...(ownerType === "player" && activeEffect(world, ownerId as PlayerId, "piercing") ? { piercing: true, hitEnemyIds: [] } : {}),
    speed: ownerType === "player" ? combatTuning(world).playerSpeed
      : ownerType === "gaoler" ? combatTuning(world).gaolerSpeed
      : combatTuning(world).enemySpeeds[world.enemies.find(enemy => enemy.id === ownerId)?.tier ?? 0]
  };
  world.projectiles.push(projectile);
  return projectile;
}

function nearestLivingPlayer(world: WorldState, position: Vector): PlayerState | null {
  const living = Object.values(world.players).filter((candidate) => candidate.alive);
  if (living.length === 0) return null;
  living.sort((a, b) => distanceSquared(a, position) - distanceSquared(b, position));
  return living[0] ?? null;
}

function clearLine(maze: MazeDefinition, a: Vector, b: Vector): Direction | null {
  const sameRow = Math.abs(a.y - b.y) < TILE_SIZE * 0.45;
  const sameColumn = Math.abs(a.x - b.x) < TILE_SIZE * 0.45;
  if (!sameRow && !sameColumn) return null;
  const direction: Direction = sameRow
    ? (b.x > a.x ? "east" : "west")
    : (b.y > a.y ? "south" : "north");
  const vector = DIRECTION_VECTOR[direction];
  const distance = Math.sqrt(distanceSquared(a, b));
  for (let step = TILE_SIZE * 0.6; step < distance; step += TILE_SIZE * 0.5) {
    if (isWall(maze, a.x + vector.x * step, a.y + vector.y * step)) return null;
  }
  return direction;
}

function possibleDirections(world: WorldState, position: Vector, speed: number): Direction[] {
  const directions: Direction[] = ["north", "east", "south", "west"];
  return directions.filter((direction) => {
    const probe = { x: position.x, y: position.y };
    return tryMove(world.maze, probe, direction, speed, ENEMY_RADIUS, world.gateCooldownTicks === 0);
  });
}

function chooseEnemyDirection(world: WorldState, enemy: EnemyState): Direction {
  const choices = possibleDirections(world, enemy, enemySpeed(enemy, world.dungeon));
  if (choices.length === 0) return enemy.facing;
  const target = nearestLivingPlayer(world, enemy);
  if (target && random(world) < 0.72) {
    choices.sort((a, b) => {
      const av = DIRECTION_VECTOR[a];
      const bv = DIRECTION_VECTOR[b];
      const ad = distanceSquared({ x: enemy.x + av.x * TILE_SIZE, y: enemy.y + av.y * TILE_SIZE }, target);
      const bd = distanceSquared({ x: enemy.x + bv.x * TILE_SIZE, y: enemy.y + bv.y * TILE_SIZE }, target);
      return ad - bd;
    });
    return choices[0] ?? enemy.facing;
  }
  return choices[Math.floor(random(world) * choices.length)] ?? enemy.facing;
}

function enemySpeed(enemy: EnemyState, dungeon: number): number {
  const base = enemy.tier === 0 ? 0.56 : enemy.tier === 1 ? 0.76 : 0.98;
  return base * Math.min(1.45, 1 + Math.max(0, dungeon - 1) * 0.035);
}

function fireEnemy(world: WorldState, enemy: EnemyState, events: GameEvent[]): void {
  const direction = enemy.fireDirection!;
  spawnProjectile(world, "enemy", enemy.id, enemy.x, enemy.y, direction);
  enemy.facing = direction;
  enemy.fireDirection = null;
  enemy.windupTicks = 0;
  enemy.fireCooldownTicks = 110 + Math.floor(random(world) * 100) - enemy.tier * 18;
  events.push({ type: "enemy-shot", x: enemy.x, y: enemy.y });
}

function clearFireBuffers(world: WorldState): void {
  for (const state of Object.values(world.players)) state.fireBufferUntil = 0;
}

function firePlayer(world: WorldState, state: PlayerState, events: GameEvent[]): void {
  const shot = spawnProjectile(world, "player", state.id, state.x, state.y, state.facing);
  state.shotId = shot.id;
  state.fireBufferUntil = 0;
  events.push({ type: "shot", x: state.x, y: state.y, player: state.id });
}

function flushFireBuffers(world: WorldState, events: GameEvent[]): void {
  if (world.phase === "entry" || world.phase === "transition" || world.phase === "game-over") { clearFireBuffers(world); return; }
  for (const state of Object.values(world.players)) {
    if (!state.alive || state.fireBufferUntil < world.tick) state.fireBufferUntil = 0;
    if (state.alive && canPlayerFire(world, state.id) && state.fireBufferUntil > 0) firePlayer(world, state, events);
  }
}

function updateEnemies(world: WorldState, events: GameEvent[]): void {
  const tuning = combatTuning(world);
  for (const enemy of [...world.enemies].sort((a, b) => a.id - b.id)) {
    if (enemy.arrivalTicks > 0) { enemy.arrivalTicks--; continue; }
    if (enemy.fireDirection !== null) {
      enemy.cloaked = false;
      enemy.windupTicks--;
      if (enemy.windupTicks <= 0) fireEnemy(world, enemy, events);
      continue;
    }
    enemy.decisionTicks -= 1;
    enemy.fireCooldownTicks = Math.max(0, enemy.fireCooldownTicks - 1);
    const target = nearestLivingPlayer(world, enemy);
    const line = target ? clearLine(world.maze, enemy, target) : null;
    const shouldCloak = enemy.tier > 0 && line === null && world.tick % 300 > 85;
    if (enemy.cloaked !== shouldCloak) {
      enemy.cloaked = shouldCloak;
      events.push({ type: shouldCloak ? "cloak" : "reveal", x: enemy.x, y: enemy.y });
    }

    const activeShots = world.projectiles.filter(shot => shot.ownerType === "enemy");
    const reserved = world.enemies.filter(candidate => candidate.fireDirection !== null).length;
    const canFire = !tuning.limitEnemyShots || (
      !activeShots.some(shot => shot.ownerId === enemy.id)
      && activeShots.length + reserved < enemyShotLimit(world.dungeon)
    );
    if (line && enemy.fireCooldownTicks === 0 && canFire) {
      enemy.facing = line;
      enemy.fireDirection = line;
      enemy.windupTicks = tuning.warnings[enemy.tier];
      enemy.cloaked = false;
      if (enemy.windupTicks === 0) fireEnemy(world, enemy, events);
      else events.push({ type: "enemy-windup", x: enemy.x, y: enemy.y });
      continue;
    }

    const beforeX = enemy.x;
    const moved = tryMove(
      world.maze, enemy, enemy.facing, enemySpeed(enemy, world.dungeon),
      ENEMY_RADIUS, world.gateCooldownTicks === 0
    );
    if (moved && crossedGate(beforeX, enemy.x, world.maze)) {
      world.gateCooldownTicks = 180;
      events.push({ type: "gate", x: enemy.x, y: enemy.y });
    }
    if (enemy.decisionTicks <= 0 || !moved) {
      enemy.facing = chooseEnemyDirection(world, enemy);
      enemy.decisionTicks = 18 + Math.floor(random(world) * 45);
    }
  }
}

function updatePlayers(
  world: WorldState,
  commands: Readonly<Record<PlayerId, PlayerCommand>>,
  events: GameEvent[]
): void {
  for (const id of ["gold", "cyan"] as const) {
    const state = world.players[id];
    const command = commands[id] ?? NEUTRAL_COMMAND;
    if (!state.alive) {
      state.fireBufferUntil = 0;
      if (state.lives > 0) {
        state.respawnTicks -= 1;
        if (state.respawnTicks <= 0 || command.fire) {
          const spawn = world.maze.playerSpawns[id];
          state.x = spawn.x;
          state.y = spawn.y;
          state.alive = true;
          state.invulnerableTicks = ENTRY_TICKS;
        }
      }
      continue;
    }

    if (command.bomb && world.phase === "clear" && activeEffect(world, id, "bomb")) detonateBomb(world, id, events);
    state.invulnerableTicks = Math.max(0, state.invulnerableTicks - 1);
    if (command.move) {
      state.facing = command.move;
      if (!command.aim) {
        const beforeX = state.x;
        tryMove(world.maze, state, command.move, PLAYER_SPEED, PLAYER_RADIUS, world.gateCooldownTicks === 0);
        if (crossedGate(beforeX, state.x, world.maze)) {
          world.gateCooldownTicks = 180;
          events.push({ type: "gate", x: state.x, y: state.y, player: id });
        }
      }
    }

    if (world.phase === "entry" || world.phase === "transition") state.fireBufferUntil = 0;
    else {
      if (state.fireBufferUntil < world.tick) state.fireBufferUntil = 0;
      if (command.fire && combatTuning(world).bufferTicks > 0) state.fireBufferUntil = world.tick + combatTuning(world).bufferTicks;
      if (canPlayerFire(world, state.id) && (command.fire || state.fireBufferUntil > 0)) firePlayer(world, state, events);
    }
  }
}

function hitPlayer(world: WorldState, id: PlayerId, events: GameEvent[], friendly = false): void {
  const target = world.players[id];
  if (!target.alive || target.invulnerableTicks > 0 || world.mode === "practice") return;
  if (activeEffect(world, id, "shield")) {
    world.pickups.effect = null;
    target.invulnerableTicks = 30;
    events.push({ type: "shield-hit", x: target.x, y: target.y, player: id });
    return;
  }
  if (world.pickups.effect?.owner === id) world.pickups.effect = null;
  target.alive = false;
  target.fireBufferUntil = 0;
  target.lives -= 1;
  target.respawnTicks = 180;
  for (const shot of world.projectiles) {
    if (shot.ownerType === "player" && shot.ownerId === id) shot.ttlTicks = 0;
  }
  target.shotId = null;
  events.push({ type: friendly ? "friendly-fire" : "player-hit", x: target.x, y: target.y, player: id });
  if (world.phase === "gaoler") {
    world.gaoler = null;
    beginTransition(world, events);
  }
}

function damageEnemy(world: WorldState, enemy: EnemyState, owner: PlayerState, events: GameEvent[]): void {
  const points = [100, 200, 500][enemy.tier] ?? 100;
  owner.score += points * world.multiplier;
  events.push({ type: "enemy-hit", x: enemy.x, y: enemy.y, player: owner.id, value: points * world.multiplier });
  const startsChain = enemy.tier === 0 && world.remainingChains > 0
    && world.enemies.filter(candidate => candidate.tier === 0).length <= world.remainingChains;
  if (enemy.tier === 1 || startsChain) {
    if (startsChain) world.remainingChains--;
    transformEnemy(enemy);
    enemy.arrivalTicks = combatTuning(world).arrivalTicks;
    events.push({ type: "transform", x: enemy.x, y: enemy.y });
  } else {
    world.enemies = world.enemies.filter((candidate) => candidate.id !== enemy.id);
    events.push({ type: "enemy-killed", x: enemy.x, y: enemy.y, player: owner.id });
  }
}

function detonateBomb(world: WorldState, id: PlayerId, events: GameEvent[]): void {
  const origin = world.players[id];
  world.pickups.effect = null;
  for (const enemy of [...world.enemies]) {
    if (enemy.arrivalTicks === 0 && bombReaches(world, origin, enemy)) damageEnemy(world, enemy, origin, events);
  }
  const brute = world.pickups.brute;
  if (brute && bombReaches(world, origin, brute)) damageBrute(world, id, events);
  world.projectiles = world.projectiles.filter(p => p.ownerType === "player" || !bombReaches(world, origin, p));
  const cells: Vector[] = [];
  for (let y = 0; y < world.maze.height; y++) for (let x = 0; x < world.maze.width; x++) {
    const p = { x: (x + .5) * TILE_SIZE, y: (y + .5) * TILE_SIZE };
    if (bombReaches(world, origin, p)) cells.push(p);
  }
  world.pickups.blast = { cells, ticks: 18 };
  events.push({ type: "bomb", x: origin.x, y: origin.y, player: id });
}

function transformEnemy(enemy: EnemyState): void {
  enemy.tier = (enemy.tier + 1) as 1 | 2;
  const kinds: readonly EnemyKind[] = ["prowler", "veilmaw", "ravager"];
  enemy.kind = kinds[enemy.tier] ?? "ravager";
  enemy.fireCooldownTicks = 75;
  enemy.decisionTicks = 1;
  enemy.cloaked = false;
  enemy.windupTicks = 0;
  enemy.fireDirection = null;
}

function collideProjectiles(world: WorldState, removed: Set<number>, events: GameEvent[]): void {
  for (let i = 0; i < world.projectiles.length; i += 1) {
    const a = world.projectiles[i];
    if (!a || removed.has(a.id)) continue;
    for (let j = i + 1; j < world.projectiles.length; j += 1) {
      const b = world.projectiles[j];
      if (!b || removed.has(b.id) || a.ownerType === b.ownerType && a.ownerId === b.ownerId) continue;
      if (distanceSquared(a, b) <= 20) {
        removed.add(a.id);
        removed.add(b.id);
        events.push({ type: "wall-impact", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        break;
      }
    }
  }
}

function updateProjectiles(world: WorldState, events: GameEvent[]): void {
  const removed = new Set<number>();
  for (const projectile of world.projectiles) {
    projectile.ttlTicks -= 1;
    const vector = DIRECTION_VECTOR[projectile.direction];
    const steps = 3;
    for (let step = 0; step < steps && !removed.has(projectile.id); step += 1) {
      projectile.x += vector.x * projectile.speed / steps;
      projectile.y += vector.y * projectile.speed / steps;
      if (isWall(world.maze, projectile.x, projectile.y)) {
        removed.add(projectile.id);
        events.push({ type: "wall-impact", x: projectile.x, y: projectile.y });
      }
    }
    if (projectile.x < 0 || projectile.x >= world.maze.width * TILE_SIZE || projectile.y < 0 || projectile.y >= world.maze.height * TILE_SIZE) removed.add(projectile.id);
    if (projectile.ttlTicks <= 0) removed.add(projectile.id);
  }

  collideProjectiles(world, removed, events);

  for (const projectile of world.projectiles) {
    if (removed.has(projectile.id)) continue;
    if (projectile.ownerType === "player") {
      const owner = world.players[projectile.ownerId as PlayerId];
      const enemy = world.enemies.find((candidate) => !projectile.hitEnemyIds?.includes(candidate.id) && candidate.arrivalTicks === 0 && distanceSquared(projectile, candidate) <= (ENEMY_RADIUS + PROJECTILE_RADIUS) ** 2);
      if (enemy) {
        if (!projectile.piercing) removed.add(projectile.id);
        else projectile.hitEnemyIds!.push(enemy.id);
        damageEnemy(world, enemy, owner, events);
        continue;
      }

      const brute = world.pickups.brute;
      if (brute && brute.arrivalTicks === 0 && !projectile.hitEnemyIds?.includes(brute.id) && distanceSquared(projectile, brute) <= (ENEMY_RADIUS + PROJECTILE_RADIUS) ** 2) {
        if (!projectile.piercing) removed.add(projectile.id);
        else projectile.hitEnemyIds!.push(brute.id);
        damageBrute(world, owner.id, events);
        continue;
      }

      if (world.riftwing && distanceSquared(projectile, world.riftwing) <= 70) {
        removed.add(projectile.id);
        owner.score += 1_000 * world.multiplier;
        world.nextDouble = true;
        events.push({ type: "riftwing-caught", x: world.riftwing.x, y: world.riftwing.y, player: owner.id, value: 1_000 * world.multiplier });
        world.riftwing = null;
        beginGaolerOrTransition(world, events);
        continue;
      }

      if (world.gaoler?.visible && distanceSquared(projectile, world.gaoler) <= 110) {
        removed.add(projectile.id);
        owner.score += 2_500 * world.multiplier;
        world.nextDouble = true;
        events.push({ type: "gaoler-hit", x: world.gaoler.x, y: world.gaoler.y, player: owner.id, value: 2_500 * world.multiplier });
        world.gaoler = null;
        beginTransition(world, events);
        continue;
      }

      if (world.mode === "classic") {
        const otherId: PlayerId = owner.id === "gold" ? "cyan" : "gold";
        const other = world.players[otherId];
        if (other.alive && distanceSquared(projectile, other) <= 65) {
          removed.add(projectile.id);
          const wasAlive = other.alive;
          hitPlayer(world, otherId, events, true);
          if (wasAlive && !other.alive) owner.score += 1_000 * world.multiplier;
        }
      }
    } else {
      for (const id of ["gold", "cyan"] as const) {
        const target = world.players[id];
        if (target.alive && distanceSquared(projectile, target) <= 65) {
          removed.add(projectile.id);
          hitPlayer(world, id, events);
          break;
        }
      }
    }
  }

  world.projectiles = world.projectiles.filter((projectile) => !removed.has(projectile.id));
  for (const state of Object.values(world.players)) {
    state.shotId = world.projectiles.find(p => p.ownerType === "player" && p.ownerId === state.id)?.id ?? null;
  }
}

function updateContacts(world: WorldState, events: GameEvent[]): void {
  for (const id of ["gold", "cyan"] as const) {
    const state = world.players[id];
    if (!state.alive) continue;
    if (world.enemies.some((enemy) => enemy.arrivalTicks === 0 && distanceSquared(state, enemy) <= (PLAYER_RADIUS + ENEMY_RADIUS) ** 2)) {
      hitPlayer(world, id, events);
    }
    const brute = world.pickups.brute;
    if (brute && brute.arrivalTicks === 0 && distanceSquared(state, brute) <= (PLAYER_RADIUS + ENEMY_RADIUS) ** 2) hitPlayer(world, id, events);
    if (world.riftwing && distanceSquared(state, world.riftwing) <= 80) hitPlayer(world, id, events);
  }
}

function targetGatePosition(world: WorldState): Vector {
  const right = world.riftwing?.targetGate === "right";
  return {
    x: right ? world.maze.width * TILE_SIZE + 10 : -10,
    y: (world.maze.gateRow + 0.5) * TILE_SIZE
  };
}

function updateRiftwing(world: WorldState, events: GameEvent[]): void {
  const riftwing = world.riftwing;
  if (!riftwing) return;
  const route = navigationStep(world.maze, riftwing, targetGatePosition(world), RIFTWING_RADIUS, RIFTWING_SPEED, world.gateCooldownTicks === 0);
  const beforeX = riftwing.x;
  if (route) {
    riftwing.facing = route.direction;
    tryMove(world.maze, riftwing, route.direction, route.distance, RIFTWING_RADIUS, world.gateCooldownTicks === 0);
  }
  const width = world.maze.width * TILE_SIZE;
  if (crossedGate(beforeX, riftwing.x, world.maze) || riftwing.x < -8 || riftwing.x > width + 8) {
    events.push({ type: "riftwing-escaped", x: riftwing.x, y: riftwing.y });
    world.riftwing = null;
    beginGaolerOrTransition(world, events);
  }
}

function teleportGaoler(world: WorldState): void {
  const candidates = world.maze.enemySpawns;
  const choice = candidates[Math.floor(random(world) * candidates.length)] ?? { x: 272, y: 128 };
  if (!world.gaoler) return;
  world.gaoler.x = choice.x;
  world.gaoler.y = choice.y;
  world.gaoler.visible = true;
  world.gaoler.cycleTicks = 120;
  world.gaoler.hasFired = false;
  world.gaoler.fireDirection = null;
}

function updateGaoler(world: WorldState, events: GameEvent[]): void {
  const gaoler = world.gaoler;
  if (!gaoler) return;
  gaoler.cycleTicks -= 1;
  const warningStart = 78 + combatTuning(world).gaolerWarningTicks;
  if (gaoler.visible && !gaoler.hasFired && gaoler.fireDirection === null && gaoler.cycleTicks <= warningStart) {
    const target = nearestLivingPlayer(world, gaoler);
    if (target) {
      const dx = Math.abs(target.x - gaoler.x), dy = Math.abs(target.y - gaoler.y);
      gaoler.fireDirection = dx > dy ? (target.x > gaoler.x ? "east" : "west") : (target.y > gaoler.y ? "south" : "north");
      if (warningStart > 78) events.push({ type: "gaoler-windup", x: gaoler.x, y: gaoler.y });
    }
  }
  if (gaoler.visible && !gaoler.hasFired && gaoler.fireDirection !== null && gaoler.cycleTicks <= 78) {
    spawnProjectile(world, "gaoler", "gaoler", gaoler.x, gaoler.y, gaoler.fireDirection);
    gaoler.hasFired = true;
    events.push({ type: "gaoler-fire", x: gaoler.x, y: gaoler.y });
  }
  if (gaoler.cycleTicks <= 18) gaoler.visible = false;
  if (gaoler.cycleTicks <= 0) teleportGaoler(world);
}

function startRiftwing(world: WorldState, events: GameEvent[]): void {
  resetPickups(world);
  clearFireBuffers(world);
  world.phase = "riftwing";
  world.objective = "CATCH THE RIFTWING";
  world.phaseTicks = 0;
  world.gateCooldownTicks = 0;
  const spawn = nearestFloor(world.maze, { x: world.maze.width * TILE_SIZE / 2, y: world.maze.height * TILE_SIZE / 2 }, RIFTWING_RADIUS);
  world.riftwing = {
    ...spawn,
    facing: random(world) < 0.5 ? "west" : "east",
    targetGate: random(world) < 0.5 ? "left" : "right"
  };
  events.push({ type: "riftwing-spawn", x: world.riftwing.x, y: world.riftwing.y });
}

function beginGaolerOrTransition(world: WorldState, events: GameEvent[]): void {
  clearFireBuffers(world);
  const gaolerChance = Math.min(0.65, 0.18 + world.dungeon * 0.035);
  if (world.dungeon === 2 || (world.dungeon > 2 && random(world) < gaolerChance)) {
    world.phase = "gaoler";
    world.objective = "STRIKE THE GAOLER";
    world.gaoler = { x: 0, y: 0, visible: false, cycleTicks: 1, hasFired: false, fireDirection: null };
    teleportGaoler(world);
    events.push({ type: "gaoler-arrive", x: world.gaoler.x, y: world.gaoler.y });
  } else {
    beginTransition(world, events);
  }
}

function beginTransition(world: WorldState, events: GameEvent[]): void {
  resetPickups(world);
  clearFireBuffers(world);
  world.phase = "transition";
  world.objective = world.nextDouble ? "NEXT DUNGEON ×2" : "DUNGEON CLEAR";
  world.phaseTicks = TRANSITION_TICKS;
  world.projectiles = [];
  for (const state of Object.values(world.players)) state.shotId = null;
  if (world.dungeon === 4 || world.dungeon === 12) {
    for (const state of Object.values(world.players)) state.lives = Math.min(6, state.lives + 1);
  }
  events.push({ type: "dungeon-clear" });
}

function startNextDungeon(world: WorldState, events: GameEvent[]): void {
  resetPickups(world);
  world.dungeon += 1;
  world.maze = mazeForDungeon(world.dungeon);
  world.multiplier = world.nextDouble ? 2 : 1;
  world.nextDouble = false;
  world.phase = "entry";
  world.phaseTicks = ENTRY_TICKS;
  world.objective = world.maze.id === "pit-01"
    ? "THE PIT — NO COVER"
    : world.multiplier === 2 ? "×2 ACTIVE — ENTER" : "ENTER THE MAZE";
  world.gateCooldownTicks = 0;
  world.enemies = [];
  world.projectiles = [];
  world.riftwing = null;
  world.gaoler = null;
  for (const id of ["gold", "cyan"] as const) {
    const state = world.players[id];
    const spawn = world.maze.playerSpawns[id];
    state.x = spawn.x;
    state.y = spawn.y;
    state.facing = "north";
    state.shotId = null;
    state.fireBufferUntil = 0;
    if (state.lives > 0) {
      state.alive = true;
      state.invulnerableTicks = ENTRY_TICKS;
    }
  }
  populateEnemies(world, 6);
  events.push({ type: "dungeon-start" });
}

function shouldGameOver(world: WorldState): boolean {
  if (world.mode === "solo") return world.players.gold.lives <= 0 && !world.players.gold.alive;
  return Object.values(world.players).every((state) => state.lives <= 0 && !state.alive);
}

export function stepWorld(
  world: WorldState,
  commands: Readonly<Record<PlayerId, PlayerCommand>>
): GameEvent[] {
  const events: GameEvent[] = [];
  if (world.phase === "game-over") return events;

  world.tick += 1;
  world.gateCooldownTicks = Math.max(0, world.gateCooldownTicks - 1);
  if (world.phase === "clear") updateBrute(world, events);
  updatePickups(world, events);
  updatePlayers(world, commands, events);

  if (world.phase === "entry") {
    world.phaseTicks -= 1;
    if (world.phaseTicks <= 0) {
      world.phase = "clear";
      world.objective = "CLEAR THE DUNGEON";
      events.push({ type: "dungeon-start" });
    }
  } else if (world.phase === "clear") {
    updateEnemies(world, events);
  } else if (world.phase === "riftwing") {
    updateRiftwing(world, events);
  } else if (world.phase === "gaoler") {
    updateGaoler(world, events);
  } else if (world.phase === "transition") {
    world.phaseTicks -= 1;
    if (world.phaseTicks <= 0) startNextDungeon(world, events);
  }

  updateProjectiles(world, events);
  updateContacts(world, events);

  if (world.phase === "clear" && world.enemies.length === 0) startRiftwing(world, events);
  if (shouldGameOver(world)) {
    clearFireBuffers(world);
    resetPickups(world);
    world.phase = "game-over";
    world.objective = "RUN ENDED";
    world.projectiles = [];
    events.push({ type: "game-over" });
  }
  flushFireBuffers(world, events);
  return events;
}

export function worldHash(world: WorldState): string {
  const normalized = JSON.stringify(world, (_key, value: unknown) => {
    if (typeof value === "number" && !Number.isInteger(value)) return Number(value.toFixed(4));
    return value;
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

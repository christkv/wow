import { ENEMY_RADIUS, PLAYER_RADIUS, isWalkable, isWall, tryMove } from "./collision";
import { navigationStep } from "./navigation";
import { TILE_SIZE, type GameEvent, type PickupEffectKind, type PickupOutcome, type PickupState, type PlayerId, type Vector, type WorldState } from "./model";

export const PICKUP_RULES = {
  effectTicks: 480, cursedEffectTicks: 720, bombTicks: 600, cursedBombTicks: 900,
  bruteWarningTicks: 60, bruteTicks: 720, bruteHealth: 3,
  rapidIntervalTicks: 6, rapidShotLimit: 4,
  burstIntervalTicks: 6, ricochetBounces: 2,
  bombRadius: 48, bruteSpeed: 0.65, cursedChance: 0.25, bruteChance: 0.5
} as const;
export const EFFECT_LABELS: Record<PickupEffectKind, string> = {
  twin: "TWIN SHOT", piercing: "PIERCING", bomb: "BOMB READY", shield: "SHIELD",
  crossfire: "CROSSFIRE", burst: "BURST", ricochet: "RICOCHET", speed: "DOUBLE SPEED", rapid: "RAPID FIRE"
};
const distance2 = (a: Vector, b: Vector): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// A separate seeded stream keeps item rolls from changing enemy decisions.
export function pickupRandom(state: PickupState): number {
  let x = state.rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.rngState = x >>> 0;
  return state.rngState / 4_294_967_296;
}
export function createPickups(seed: number, enabled: boolean): PickupState {
  const state: PickupState = { enabled, rngState: (seed ^ 0x6a09e667) >>> 0 || 1, nextSpawnTicks: 0, box: null, effect: null, brute: null, blast: null };
  state.nextSpawnTicks = 360 + Math.floor(pickupRandom(state) * 241);
  return state;
}
export function resetPickups(world: WorldState): void {
  const state = world.pickups;
  state.box = null; state.effect = null; state.brute = null; state.blast = null;
  state.nextSpawnTicks = 360 + Math.floor(pickupRandom(state) * 241);
}
export function activeEffect(world: WorldState, owner: PlayerId, kind: PickupEffectKind): boolean {
  return world.pickups.effect?.owner === owner && world.pickups.effect.kind === kind && world.pickups.effect.ticks > 0;
}
export function canPlayerFire(world: WorldState, owner: PlayerId): boolean {
  const count = world.projectiles.filter(p => p.ownerType === "player" && p.ownerId === owner && p.ttlTicks > 0).length;
  if (world.pickups.effect?.owner === owner && world.pickups.effect.burst) return false;
  if (activeEffect(world, owner, "rapid")) return count < PICKUP_RULES.rapidShotLimit && world.tick >= (world.pickups.effect!.rapidNextTick ?? 0);
  return count < (activeEffect(world, owner, "twin") || activeEffect(world, owner, "ricochet") ? 2 : 1);
}

/** Floor cells in the living players' connected component; no gate teleport dependency. */
export function pickupSpawnCandidates(world: WorldState, clearance = 48): Vector[] {
  const living = Object.values(world.players).filter(p => p.alive);
  const queue: Vector[] = [], seen = new Set<string>();
  const add = (x: number, y: number): void => {
    const key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= world.maze.width || y >= world.maze.height || seen.has(key)) return;
    seen.add(key);
    const p = { x: (x + .5) * TILE_SIZE, y: (y + .5) * TILE_SIZE };
    if (isWalkable(world.maze, p.x, p.y, PLAYER_RADIUS)) queue.push(p);
  };
  for (const p of living) add(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE));
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!, x = Math.floor(p.x / TILE_SIZE), y = Math.floor(p.y / TILE_SIZE);
    add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
  }
  return queue.filter(p => living.every(player => distance2(p, player) >= clearance ** 2)
    && Object.values(world.maze.playerSpawns).every(spawn => distance2(p, spawn) >= 32 ** 2)
    && world.enemies.every(enemy => distance2(p, enemy) >= 24 ** 2));
}
export function rollPickup(state: PickupState, cursed: boolean): PickupOutcome {
  if (cursed && pickupRandom(state) < PICKUP_RULES.bruteChance) return "brute";
  const rewards: readonly PickupEffectKind[] = ["twin", "piercing", "bomb", "shield", "crossfire", "burst", "ricochet", "speed", "rapid"];
  return rewards[Math.floor(pickupRandom(state) * rewards.length)]!;
}

export function updatePickups(world: WorldState, events: GameEvent[]): void {
  const state = world.pickups;
  if (state.blast && --state.blast.ticks <= 0) state.blast = null;
  if (!state.enabled || world.phase !== "clear") return;
  if (state.effect) {
    if (--state.effect.ticks <= 0 || !world.players[state.effect.owner].alive) {
      events.push({ type: "effect-expired", player: state.effect.owner, effect: state.effect.kind });
      state.effect = null;
    }
    return;
  }
  if (state.brute) return;
  if (state.box) {
    // In solo the companion leaves the decision and reward to the human player.
    const collector = Object.values(world.players).find(p => p.alive && !(world.mode === "solo" && p.id === "cyan") && distance2(p, state.box!) <= 9 ** 2);
    if (!collector) return;
    const box = state.box;
    state.box = null;
    if (box.outcome === "brute") {
      const candidates = pickupSpawnCandidates(world, 80);
      const spawn = candidates[Math.floor(pickupRandom(state) * candidates.length)];
      if (spawn) {
        state.brute = { ...spawn, id: world.nextEntityId++, facing: "south", health: PICKUP_RULES.bruteHealth, arrivalTicks: PICKUP_RULES.bruteWarningTicks, ticks: PICKUP_RULES.bruteTicks };
        events.push({ type: "box-collected", player: collector.id, x: box.x, y: box.y, effect: "brute" });
        events.push({ type: "brute-arrive", x: spawn.x, y: spawn.y });
        return;
      }
      // Cramped custom mazes get a safe reward instead of an unavoidable spawn.
      box.outcome = "shield";
    }
    const duration = box.outcome === "bomb"
      ? box.kind === "cursed" ? PICKUP_RULES.cursedBombTicks : PICKUP_RULES.bombTicks
      : box.kind === "cursed" ? PICKUP_RULES.cursedEffectTicks : PICKUP_RULES.effectTicks;
    state.effect = { kind: box.outcome, owner: collector.id, ticks: duration, duration };
    events.push({ type: "box-collected", player: collector.id, x: box.x, y: box.y, effect: box.outcome });
    return;
  }
  if (--state.nextSpawnTicks > 0) return;
  const candidates = pickupSpawnCandidates(world);
  if (!candidates.length) { state.nextSpawnTicks = 60; return; }
  const spawn = candidates[Math.floor(pickupRandom(state) * candidates.length)]!;
  const cursed = pickupRandom(state) < PICKUP_RULES.cursedChance;
  state.box = { ...spawn, kind: cursed ? "cursed" : "supply", outcome: rollPickup(state, cursed) };
  state.nextSpawnTicks = 480 + Math.floor(pickupRandom(state) * 241);
  events.push({ type: "box-spawn", x: spawn.x, y: spawn.y });
}

export function updateBrute(world: WorldState, events: GameEvent[]): void {
  const brute = world.pickups.brute;
  if (!brute) return;
  if (brute.arrivalTicks > 0) { brute.arrivalTicks--; return; }
  if (--brute.ticks <= 0) { world.pickups.brute = null; events.push({ type: "brute-expired", x: brute.x, y: brute.y }); return; }
  const target = Object.values(world.players).filter(p => p.alive).sort((a, b) => distance2(a, brute) - distance2(b, brute))[0];
  if (!target) return;
  const route = navigationStep(world.maze, brute, target, ENEMY_RADIUS, PICKUP_RULES.bruteSpeed, false);
  if (route) {
    brute.facing = route.direction;
    tryMove(world.maze, brute, route.direction, route.distance, ENEMY_RADIUS, false);
  }
}
export function damageBrute(world: WorldState, owner: PlayerId, events: GameEvent[]): void {
  const brute = world.pickups.brute;
  if (!brute || brute.arrivalTicks > 0) return;
  brute.health--;
  events.push({ type: "brute-hit", x: brute.x, y: brute.y, player: owner });
  if (brute.health === 0) {
    const points = 1000 * world.multiplier;
    world.players[owner].score += points;
    world.pickups.brute = null;
    events.push({ type: "brute-killed", x: brute.x, y: brute.y, player: owner, value: points });
  }
}

export function bombReaches(world: WorldState, origin: Vector, target: Vector): boolean {
  const distance = Math.sqrt(distance2(origin, target));
  if (distance > PICKUP_RULES.bombRadius) return false;
  const steps = Math.max(1, Math.ceil(distance));
  for (let i = 0; i <= steps; i++) {
    const x = origin.x + (target.x - origin.x) * i / steps;
    const y = origin.y + (target.y - origin.y) * i / steps;
    if (isWall(world.maze, x, y) || !isWalkable(world.maze, x, y, .5)) return false;
  }
  return true;
}
export function pickupStatus(world: WorldState): string {
  const { box, effect, brute } = world.pickups;
  if (effect) return `${effect.owner.toUpperCase()} ${EFFECT_LABELS[effect.kind]} ${Math.ceil(effect.ticks / 60)}s${effect.kind === "bomb" ? ` · ${effect.owner === "gold" ? "E" : "RSHIFT"} / PAD B` : ""}`;
  if (brute) return brute.arrivalTicks > 0 ? "BRUTE INCOMING · KEEP CLEAR" : `BRUTE ${brute.health}/3 HP · ${Math.ceil(brute.ticks / 60)}s · OPTIONAL +${1000 * world.multiplier}`;
  if (box) return "MYSTERY BOX · REWARD OR MONSTER?";
  return "MYSTERY BOXES · REWARDS OR MONSTERS";
}

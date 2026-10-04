import { describe, expect, it } from "vitest";
import { NEUTRAL_COMMAND, type GameMode, type PickupEffectKind, type PlayerId, type WorldState } from "../../src/game/model";
import { createWorld, stepWorld, worldHash } from "../../src/game/simulation";
import { canPlayerFire } from "../../src/game/pickups";
import { pickupFixture, PICKUP_SCENARIOS } from "../../src/debug/pickup-scenarios";
import { MAZES } from "../../src/game/mazes";
import { PLAYER_RADIUS, PLAYER_SPEED, isWalkable, isWall } from "../../src/game/collision";

const neutral = { gold: NEUTRAL_COMMAND, cyan: NEUTRAL_COMMAND };
const fire = { ...neutral, gold: { ...NEUTRAL_COMMAND, fire: true } };
const step = (w: WorldState, input = neutral) => stepWorld(w, input);
const advance = (w: WorldState, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };
function weapon(kind: PickupEffectKind) { const w = pickupFixture(kind); step(w); return w; }

describe("crate weapons", () => {
  it("crossfire shoots in four directions, waits for the entire volley, and respects cover", () => {
    const w = weapon("crossfire");
    const walls = w.maze.walls.map(r => [...r]); walls[7]![15] = true; w.maze = { ...w.maze, walls };
    step(w, fire);
    expect(w.projectiles.map(p => p.direction).sort()).toEqual(["north", "south", "west"]);
    expect(w.projectiles.every(p => p.speed === 3.5 && p.ownerId === "gold")).toBe(true);
    step(w, fire); expect(w.projectiles).toHaveLength(3);
    w.players.gold.fireBufferUntil = 0;
    w.projectiles[0]!.ttlTicks = 1; step(w); expect(canPlayerFire(w, "gold")).toBe(false);
    w.projectiles.forEach(p => p.ttlTicks = 1); step(w); expect(canPlayerFire(w, "gold")).toBe(true);
  });
  it("burst fires exactly three normal-speed shots six ticks apart with locked aim", () => {
    const w = weapon("burst");
    expect(step(w, fire).filter(e => e.type === "shot")).toHaveLength(1);
    const start = w.tick;
    for (let i = 1; i <= 18; i++) {
      const events = step(w, { ...neutral, gold: { ...NEUTRAL_COMMAND, move: "north", aim: true } });
      expect(events.filter(e => e.type === "shot")).toHaveLength(i === 6 || i === 12 ? 1 : 0);
    }
    expect(w.tick).toBe(start + 18);
    expect(w.projectiles).toHaveLength(3);
    expect(w.projectiles.every(p => p.direction === "east" && p.speed === 3.5)).toBe(true);
    expect(w.pickups.effect!.burst).toBeUndefined();
    expect(canPlayerFire(w, "gold")).toBe(false);
  });
  it.each(["expire", "death", "wave"])("cancels pending burst shots on %s", reason => {
    const w = weapon("burst"); step(w, fire);
    if (reason === "expire") w.pickups.effect!.ticks = 1;
    if (reason === "death") {
      w.projectiles.push({ id: w.nextEntityId++, ownerType: "enemy", ownerId: 999, x: w.players.gold.x, y: w.players.gold.y, direction: "east", speed: 0, ttlTicks: 60 });
    }
    if (reason === "wave") w.enemies = [];
    step(w);
    expect(w.pickups.effect).toBeNull();
    const events = Array.from({ length: 20 }, () => step(w)).flat();
    expect(events.some(e => e.type === "shot")).toBe(false);
  });
  it("serializes an in-flight burst without changing timing or randomness", () => {
    const a = weapon("burst"); step(a, fire); advance(a, 3);
    const b = JSON.parse(JSON.stringify(a)) as WorldState;
    for (let i = 0; i < 100; i++) { expect(step(a)).toEqual(step(b)); expect(worldHash(a)).toBe(worldHash(b)); }
  });
  it("ricochet bounces twice without crossing walls, then stops on its third impact", () => {
    const w = PICKUP_SCENARIOS.find(s => s.id === "pickup-ricochet")!.create(); step(w); step(w, fire);
    const shot = w.projectiles[0]!;
    let impacts = 0;
    for (let i = 0; i < 100 && w.projectiles.length; i++) {
      impacts += step(w).filter(e => e.type === "wall-impact").length;
      for (const p of w.projectiles) { expect(isWall(w.maze, p.x, p.y)).toBe(false); expect(p.x).toBeGreaterThanOrEqual(192); expect(p.x).toBeLessThan(256); }
    }
    expect(impacts).toBe(3); expect(shot.bouncesRemaining).toBe(0); expect(w.projectiles).toHaveLength(0);
    expect(w.players.gold.lives).toBe(3);
  });
  it("ricochet respects its two-shot cap, TTL, and expiration without upgrading later bolts", () => {
    const w = weapon("ricochet"); step(w, fire); step(w, fire); step(w, fire);
    expect(w.projectiles).toHaveLength(2);
    w.players.gold.fireBufferUntil = 0; w.pickups.effect!.ticks = 1; step(w);
    expect(w.projectiles.every(p => p.bouncesRemaining === 2)).toBe(true);
    w.projectiles.forEach(p => p.ttlTicks = 1); step(w); step(w, fire);
    expect(w.projectiles).toHaveLength(1); expect(w.projectiles[0]!.bouncesRemaining).toBeUndefined();
  });
  it("a ricochet muzzle inside a wall cannot escape through it", () => {
    const w = weapon("ricochet"); const walls = w.maze.walls.map(r => [...r]); walls[7]![15] = true; w.maze = { ...w.maze, walls };
    step(w, fire); expect(w.projectiles).toHaveLength(0);
  });
});

function allies(mode: GameMode, friendlyFire: boolean) {
  const w = createWorld({ mode, seed: 72, enemyCount: 3, friendlyFire });
  const fixture = pickupFixture("twin"); w.maze = fixture.maze; w.enemies = fixture.enemies; w.nextEntityId = fixture.nextEntityId;
  w.phase = "clear"; w.remainingChains = 0; w.pickups.nextSpawnTicks = 9999;
  Object.assign(w.players.gold, { x: 232, y: 120, facing: "east", invulnerableTicks: 0 });
  Object.assign(w.players.cyan, { x: 264, y: 120, facing: "west", invulnerableTicks: 0 });
  return w;
}

describe("friendly fire option", () => {
  it.each(["solo", "alliance", "classic"] as const)("defaults on and can be disabled in %s", mode => {
    expect(createWorld({ mode }).friendlyFire).toBe(true);
    for (const enabled of [true, false]) for (const owner of ["gold", "cyan"] as const) {
      const target: PlayerId = owner === "gold" ? "cyan" : "gold";
      const w = allies(mode, enabled);
      step(w, { ...neutral, [owner]: { ...NEUTRAL_COMMAND, fire: true } }); advance(w, 10);
      expect(w.players[target].lives).toBe(enabled ? 2 : 3);
      expect(w.players[owner].lives).toBe(3);
      expect(w.players[owner].score).toBe(enabled && mode === "classic" ? 1000 : 0);
    }
  });
  it.each(["twin", "piercing", "crossfire", "burst", "ricochet", "rapid", "speed"] as const)("%s honors the toggle", kind => {
    for (const enabled of [true, false]) {
      const w = allies("alliance", enabled); w.pickups.effect = { owner: "gold", kind, ticks: 480, duration: 480 };
      step(w, fire); advance(w, 10); expect(w.players.cyan.lives).toBe(enabled ? 2 : 3);
    }
  });
  it("bombs hit an exposed ally only when enabled, never the owner, and respect walls", () => {
    for (const enabled of [true, false]) for (const covered of [true, false]) {
      const w = allies("alliance", enabled); w.pickups.effect = { owner: "gold", kind: "bomb", ticks: 600, duration: 600 };
      if (covered) { const walls = w.maze.walls.map(r => [...r]); walls[7]![15] = true; w.maze = { ...w.maze, walls }; }
      step(w, { ...neutral, gold: { ...NEUTRAL_COMMAND, bomb: true } });
      expect(w.players.cyan.lives).toBe(enabled && !covered ? 2 : 3); expect(w.players.gold.lives).toBe(3);
    }
  });
  it("friendly hits preserve shield, spawn protection, and Practice immunity rules", () => {
    for (const protection of ["shield", "spawn", "practice"]) {
      const w = allies(protection === "practice" ? "practice" : "classic", true);
      if (protection === "shield") w.pickups.effect = { owner: "cyan", kind: "shield", ticks: 480, duration: 480 };
      if (protection === "spawn") w.players.cyan.invulnerableTicks = 60;
      step(w, fire); advance(w, 10);
      expect(w.players.cyan.lives).toBe(3); expect(w.players.gold.score).toBe(0);
      if (protection === "shield") expect(w.pickups.effect).toBeNull();
    }
  });
});

describe("speed and rapid-fire pickups", () => {
  it("doubles only the collector's movement, respects aim, and restores speed on expiry", () => {
    const w = weapon("speed");
    Object.assign(w.players.cyan, { alive: true, lives: 3, x: 232, y: 152 });
    const east = { ...NEUTRAL_COMMAND, move: "east" as const };
    step(w, { gold: east, cyan: east });
    expect(w.players.gold.x).toBe(232 + PLAYER_SPEED * 2);
    expect(w.players.cyan.x).toBe(232 + PLAYER_SPEED);
    const x = w.players.gold.x;
    step(w, { ...neutral, gold: { ...east, aim: true, fire: true } });
    expect(w.players.gold.x).toBe(x); expect(w.projectiles[0]!.speed).toBe(3.5);
    w.pickups.effect!.ticks = 1; step(w, { ...neutral, gold: east });
    expect(w.players.gold.x).toBe(x + PLAYER_SPEED);
  });
  it.each(Object.values(MAZES))("double speed never crosses walls or breaks gate clearance in $id", maze => {
    for (const direction of ["north", "east", "south", "west"] as const) {
      const w = createWorld({ mode: "practice" }); w.maze = maze; w.phase = "clear";
      Object.assign(w.players.gold, maze.playerSpawns.gold);
      w.pickups.effect = { owner: "gold", kind: "speed", ticks: 480, duration: 480 };
      for (let i = 0; i < 100; i++) {
        step(w, { ...neutral, gold: { ...NEUTRAL_COMMAND, move: direction } });
        expect(isWalkable(maze, w.players.gold.x, w.players.gold.y, PLAYER_RADIUS)).toBe(true);
      }
      Object.assign(w.players.gold, { x: 1, y: (maze.gateRow + .5) * 16 }); w.gateCooldownTicks = 0;
      for (let i = 0; i < 5; i++) step(w, { ...neutral, gold: { ...NEUTRAL_COMMAND, move: "west" } });
      expect(w.players.gold.x).toBeGreaterThan(maze.width * 16 - 16);
      expect(w.gateCooldownTicks).toBeGreaterThan(0);
      expect(isWalkable(maze, w.players.gold.x, w.players.gold.y, PLAYER_RADIUS)).toBe(true);
    }
  });
  it("rapid fire uses a six-tick cadence, four-shot cap, and unchanged bullet speed", () => {
    const w = weapon("rapid"); const held = { ...neutral, gold: { ...NEUTRAL_COMMAND, fireHeld: true } };
    const shotsAt: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (step(w, held).some(e => e.type === "shot")) shotsAt.push(i);
      expect(w.projectiles.length).toBeLessThanOrEqual(4);
      expect(w.projectiles.every(p => p.speed === 3.5)).toBe(true);
    }
    expect(shotsAt).toEqual([0, 6, 12, 18]);
    for (let i = 0; i < 60; i++) expect(step(w).some(e => e.type === "shot")).toBe(false);
  });
  it("held fire alone does nothing without rapid fire, including after expiration", () => {
    const w = weapon("rapid"); const held = { ...neutral, gold: { ...NEUTRAL_COMMAND, fireHeld: true } };
    step(w, held); w.pickups.effect!.ticks = 1; w.projectiles = [];
    for (let i = 0; i < 20; i++) expect(step(w, held).some(e => e.type === "shot")).toBe(false);
    expect(step(w, fire).some(e => e.type === "shot")).toBe(true);
  });
  it("a serialized rapid-fire cooldown replays identically", () => {
    const a = weapon("rapid"); const held = { ...neutral, gold: { ...NEUTRAL_COMMAND, fireHeld: true } }; step(a, held);
    const b = JSON.parse(JSON.stringify(a)) as WorldState;
    for (let i = 0; i < 60; i++) { expect(step(a, held)).toEqual(step(b, held)); expect(worldHash(a)).toBe(worldHash(b)); }
  });
});

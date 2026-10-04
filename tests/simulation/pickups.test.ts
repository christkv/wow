import { describe, expect, it } from "vitest";
import { NEUTRAL_COMMAND, type PlayerCommand, type ProjectileState, type WorldState } from "../../src/game/model";
import { createWorld, stepWorld, worldHash } from "../../src/game/simulation";
import { activeEffect, bombReaches, canPlayerFire, createPickups, pickupSpawnCandidates, rollPickup, updatePickups } from "../../src/game/pickups";
import { MAZES } from "../../src/game/mazes";
import { overlapsWall } from "../../src/debug/collision-scenarios";
import { PICKUP_SCENARIOS, pickupFixture } from "../../src/debug/pickup-scenarios";

const step = (w: WorldState, gold: PlayerCommand = NEUTRAL_COMMAND, cyan: PlayerCommand = NEUTRAL_COMMAND) => stepWorld(w, { gold, cyan });
const fire = { ...NEUTRAL_COMMAND, fire: true };
const bomb = { ...NEUTRAL_COMMAND, bomb: true };
const advance = (w: WorldState, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };
function bullet(w: WorldState, patch: Partial<ProjectileState> = {}): ProjectileState {
  const p: ProjectileState = { id: w.nextEntityId++, ownerType: "player", ownerId: "gold", x: 280, y: 120, direction: "east", speed: 0, ttlTicks: 180, ...patch };
  w.projectiles.push(p); return p;
}
function collect(kind: "twin" | "piercing" | "bomb" | "shield", cursed = false) {
  const w = pickupFixture(kind, cursed); step(w); return w;
}

describe("random boxes and collection", () => {
  it("is enabled in new games with a six-to-ten-second initial delay", () => {
    const w = createWorld({ mode: "solo", seed: 72 });
    expect(w.pickups.enabled).toBe(true);
    expect(w.pickups.nextSpawnTicks).toBeGreaterThanOrEqual(360);
    expect(w.pickups.nextSpawnTicks).toBeLessThanOrEqual(600);
    const before = w.pickups.nextSpawnTicks; advance(w, 60);
    expect(w.pickups.nextSpawnTicks).toBe(before);
  });
  it("supply boxes only reward; cursed boxes offer both outcomes with the seeded 50% rule", () => {
    const state = createPickups(72, true), supply = new Set<string>(), cursed = new Map<string, number>();
    for (let i = 0; i < 10000; i++) {
      supply.add(rollPickup(state, false));
      const outcome = rollPickup(state, true); cursed.set(outcome, (cursed.get(outcome) ?? 0) + 1);
    }
    expect([...supply].sort()).toEqual(["bomb", "piercing", "shield", "twin"]);
    expect(cursed.size).toBe(5);
    expect(cursed.get("brute")).toBeGreaterThan(4700);
    expect(cursed.get("brute")).toBeLessThan(5300);
  });
  it.each(Object.values(MAZES))("spawns clear of bodies and entries in $id", maze => {
    const w = createWorld({ mode: "practice", seed: 72 }); w.maze = maze; w.phase = "clear";
    Object.assign(w.players.gold, maze.playerSpawns.gold); Object.assign(w.players.cyan, maze.playerSpawns.cyan);
    const candidates = pickupSpawnCandidates(w);
    expect(candidates.length).toBeGreaterThan(0);
    w.pickups.nextSpawnTicks = 1; const rng = w.rngState; updatePickups(w, []);
    expect(w.rngState).toBe(rng);
    expect(candidates).toContainEqual({ x: w.pickups.box!.x, y: w.pickups.box!.y });
    for (const p of candidates) {
      expect(overlapsWall(maze, { ...p, halfSize: 5 })).toBe(false);
      for (const player of Object.values(w.players)) expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(48);
      for (const spawn of Object.values(maze.playerSpawns)) expect(Math.hypot(p.x - spawn.x, p.y - spawn.y)).toBeGreaterThanOrEqual(32);
      for (const e of w.enemies) expect(Math.hypot(p.x - e.x, p.y - e.y)).toBeGreaterThanOrEqual(24);
    }
  });
  it("excludes disconnected floor and retries safely when no location is available", () => {
    const w = pickupFixture("twin"); w.pickups.box = null;
    const walls = w.maze.walls.map(row => [...row]);
    for (const row of walls) row[16] = true;
    w.maze = { ...w.maze, walls };
    expect(pickupSpawnCandidates(w).every(p => p.x < 256)).toBe(true);
    w.players.gold.alive = false; w.pickups.nextSpawnTicks = 1; updatePickups(w, []);
    expect(w.pickups.box).toBeNull(); expect(w.pickups.nextSpawnTicks).toBe(60);
  });
  it("ignores uncollected boxes after ten seconds and has no overlapping event", () => {
    const w = pickupFixture("twin"); w.pickups.box = { ...w.pickups.box!, x: 104 };
    for (let i = 0; i < 599; i++) updatePickups(w, []);
    expect(w.pickups.box).not.toBeNull(); updatePickups(w, []); expect(w.pickups.box).toBeNull();
    const active = collect("shield"); active.pickups.nextSpawnTicks = 1;
    for (let i = 0; i < 100; i++) updatePickups(active, []);
    expect(active.pickups.box).toBeNull(); expect(active.pickups.nextSpawnTicks).toBe(1);
  });
  it("leaves boxes for the human in solo, but lets Cyan collect in local co-op", () => {
    for (const mode of ["solo", "alliance"] as const) {
      const w = createWorld({ mode, seed: 72 }); w.phase = "clear";
      Object.assign(w.players.cyan, { x: 100, y: 120 });
      w.pickups.box = { x: 100, y: 120, kind: "supply", outcome: "twin", ticks: 600 };
      updatePickups(w, []);
      expect(w.pickups.effect?.owner).toBe(mode === "solo" ? undefined : "cyan");
    }
  });
  it("resolves simultaneous collection once and excludes dead players", () => {
    const w = pickupFixture("shield"); Object.assign(w.players.cyan, { ...w.players.gold, id: "cyan" });
    const events = step(w);
    expect(events.filter(e => e.type === "box-collected")).toHaveLength(1);
    expect(w.pickups.effect?.owner).toBe("gold");
    const dead = pickupFixture("shield"); dead.players.gold.alive = false; dead.players.gold.respawnTicks = 100;
    updatePickups(dead, []); expect(dead.pickups.effect).toBeNull();
  });
  it.each(["twin", "piercing", "bomb", "shield"] as const)("expires %s on schedule and gives cursed rewards longer duration", kind => {
    for (const cursed of [false, true]) {
      const w = collect(kind, cursed);
      const duration = kind === "bomb" ? cursed ? 900 : 600 : cursed ? 720 : 480;
      expect(w.pickups.effect?.ticks).toBe(duration);
      for (let i = 0; i < duration - 1; i++) updatePickups(w, []);
      expect(activeEffect(w, "gold", kind)).toBe(true);
      const events: ReturnType<typeof step> = []; updatePickups(w, events);
      expect(w.pickups.effect).toBeNull(); expect(events[0]?.type).toBe("effect-expired");
    }
  });
  it.each(["entry", "riftwing", "gaoler", "transition", "game-over"] as const)("does not spawn boxes in %s", phase => {
    const w = pickupFixture("twin"); w.pickups.box = null; w.pickups.nextSpawnTicks = 1; w.phase = phase;
    for (let i = 0; i < 700; i++) updatePickups(w, []);
    expect(w.pickups.box).toBeNull(); expect(w.pickups.nextSpawnTicks).toBe(1);
  });
  it("a cramped maze gives a shield instead of an unsafe brute spawn", () => {
    const w = pickupFixture("brute");
    const walls = w.maze.walls.map((row, y) => row.map((_cell, x) => !(y === 7 && x >= 13 && x <= 15)));
    w.maze = { ...w.maze, walls }; w.enemies = [];
    const events: ReturnType<typeof step> = []; updatePickups(w, events);
    expect(w.pickups.brute).toBeNull(); expect(w.pickups.effect?.kind).toBe("shield");
    expect(events).toContainEqual(expect.objectContaining({ type: "box-collected", effect: "shield" }));
  });
  it("disabled pickups never spawn", () => {
    const w = createWorld({ mode: "practice", pickups: false }); w.phase = "clear"; w.pickups.nextSpawnTicks = 1;
    advance(w, 700); expect(w.pickups.box).toBeNull();
  });
});

describe("temporary weapons and defenses", () => {
  it("permits two equal-speed shots, buffers the third, and retains ownership when one expires", () => {
    const w = collect("twin"); step(w, fire); step(w, fire);
    expect(w.projectiles).toHaveLength(2);
    expect(w.projectiles.every(p => p.speed === 3.5)).toBe(true);
    step(w, fire); expect(w.projectiles).toHaveLength(2);
    w.projectiles[0]!.ttlTicks = 1;
    const events = step(w);
    expect(events.filter(e => e.type === "shot")).toHaveLength(1);
    expect(w.projectiles).toHaveLength(2);
    expect(w.players.gold.shotId).not.toBeNull(); expect(canPlayerFire(w, "gold")).toBe(false);
    w.pickups.effect!.ticks = 1; step(w); expect(w.pickups.effect).toBeNull();
    w.projectiles[0]!.ttlTicks = 1; step(w); expect(canPlayerFire(w, "gold")).toBe(false);
    w.projectiles[0]!.ttlTicks = 1; step(w); expect(canPlayerFire(w, "gold")).toBe(true);
  });
  it("a piercing bolt strikes several enemies once each and stops at a wall", () => {
    const w = collect("piercing");
    Object.assign(w.enemies[0]!, { x: 264, y: 120 }); Object.assign(w.enemies[1]!, { x: 296, y: 120 });
    const targets = w.enemies.slice(0, 2).map(e => e.id);
    const walls = w.maze.walls.map(row => [...row]); walls[7]![20] = true; w.maze = { ...w.maze, walls };
    step(w, fire); advance(w, 32);
    expect(w.enemies.some(e => targets.includes(e.id))).toBe(false);
    expect(w.players.gold.score).toBe(200); expect(w.projectiles).toHaveLength(0);
  });
  it("piercing cannot repeatedly damage one transforming enemy or one brute", () => {
    const w = collect("piercing"); w.remainingChains = 1; w.enemies = [w.enemies[0]!];
    const e = w.enemies[0]!; const p = bullet(w, { x: e.x, y: e.y, piercing: true, hitEnemyIds: [] });
    step(w); expect(e.tier).toBe(1);
    for (let i = 0; i < 30; i++) { p.x = e.x; p.y = e.y; step(w); }
    expect(e.tier).toBe(1); expect(w.players.gold.score).toBe(100);
    w.pickups.brute = { id: w.nextEntityId++, x: 264, y: 120, facing: "west", health: 3, arrivalTicks: 0, ticks: 720 };
    p.x = 264; p.y = 120;
    step(w); expect(w.pickups.brute.health).toBe(2);
    for (let i = 0; i < 5; i++) { p.x = w.pickups.brute!.x; p.y = w.pickups.brute!.y; step(w); }
    expect(w.pickups.brute!.health).toBe(2);
  });
  it("bombs respect cover, clear hostile shots, spare players and consume the charge once", () => {
    const w = PICKUP_SCENARIOS.find(s => s.id === "pickup-bomb")!.create(); step(w);
    const exposed = w.enemies[0]!.id, covered = w.enemies[1]!.id;
    bullet(w, { ownerType: "enemy", ownerId: 1, x: 232, y: 104 });
    const protectedShot = bullet(w, { ownerType: "enemy", ownerId: 2, x: 280, y: 120 });
    const friendly = bullet(w, { x: 232, y: 136 });
    Object.assign(w.players.cyan, { alive: true, lives: 3, x: 232, y: 152, invulnerableTicks: 0 });
    const events = step(w, bomb);
    expect(events.filter(e => e.type === "bomb")).toHaveLength(1);
    expect(w.enemies.some(e => e.id === exposed)).toBe(false);
    expect(w.enemies.some(e => e.id === covered)).toBe(true);
    expect(w.projectiles.map(p => p.id)).toEqual([protectedShot.id, friendly.id]);
    expect(w.players.gold.lives).toBe(3); expect(w.players.cyan.lives).toBe(3);
    expect(w.pickups.effect).toBeNull(); expect(w.pickups.blast).not.toBeNull();
    expect(step(w, bomb).some(e => e.type === "bomb")).toBe(false);
  });
  it("the other player cannot detonate the collector's bomb, and unused bombs expire", () => {
    const w = collect("bomb"); step(w, NEUTRAL_COMMAND, bomb);
    expect(w.pickups.effect?.kind).toBe("bomb"); w.pickups.effect!.ticks = 1;
    expect(step(w, bomb).some(e => e.type === "bomb")).toBe(false);
    expect(w.pickups.effect).toBeNull();
  });
  it("blast rays cannot cut diagonally through a wall corner", () => {
    const w = collect("bomb"); const walls = w.maze.walls.map(r => [...r]); walls[7]![15] = true;
    w.maze = { ...w.maze, walls };
    expect(bombReaches(w, { x: 232, y: 120 }, { x: 248, y: 136 })).toBe(false);
  });
  it("shield absorbs one hit, gives escape grace, then normal damage resumes", () => {
    const w = collect("shield");
    const hit = () => { bullet(w, { ownerType: "enemy", ownerId: 1, x: 232, y: 120 }); return step(w); };
    expect(hit().some(e => e.type === "shield-hit")).toBe(true);
    expect(w.players.gold.lives).toBe(3); expect(w.pickups.effect).toBeNull();
    hit(); expect(w.players.gold.lives).toBe(3);
    advance(w, 30); hit(); expect(w.players.gold.lives).toBe(2);
  });
  it("death clears the effect and every live twin shot", () => {
    const w = collect("twin"); step(w, fire); step(w, fire);
    bullet(w, { ownerType: "enemy", ownerId: 1, x: 232, y: 120 }); step(w);
    expect(w.players.gold.alive).toBe(false); expect(w.pickups.effect).toBeNull();
    step(w); expect(w.projectiles.filter(p => p.ownerType === "player")).toHaveLength(0);
  });
});

describe("optional brute encounter and replay", () => {
  it("spawns at a safe distance, warns for a second, and expires after twelve active seconds", () => {
    const w = pickupFixture("brute"); step(w); const brute = w.pickups.brute!;
    expect(brute).not.toBeNull(); expect(brute.arrivalTicks).toBe(60);
    expect(Math.hypot(brute.x - w.players.gold.x, brute.y - w.players.gold.y)).toBeGreaterThanOrEqual(80);
    const spawn = { x: brute.x, y: brute.y };
    bullet(w, { ...spawn }); advance(w, 59);
    expect({ x: brute.x, y: brute.y }).toEqual(spawn); expect(brute.health).toBe(3);
    expect(brute.arrivalTicks).toBe(1);
    w.projectiles = []; step(w); expect(brute.arrivalTicks).toBe(0); expect(brute.ticks).toBe(720);
    // Keep the encounter alive without death/respawn affecting its lifetime.
    w.players.gold.invulnerableTicks = 1000;
    for (let i = 0; i < 719; i++) { step(w); expect(overlapsWall(w.maze, { ...brute, halfSize: 5 })).toBe(false); }
    expect(w.pickups.brute).not.toBeNull(); step(w); expect(w.pickups.brute).toBeNull();
  });
  it("the arrival marker is harmless on contact, then the brute becomes dangerous", () => {
    const w = pickupFixture("brute"); step(w); const brute = w.pickups.brute!;
    Object.assign(w.players.gold, { x: brute.x, y: brute.y });
    advance(w, 59); expect(w.players.gold.lives).toBe(3);
    step(w); expect(w.players.gold.lives).toBe(2);
  });
  it("game over clears the active encounter and prevents later spawns", () => {
    const w = pickupFixture("brute"); step(w);
    w.players.gold.alive = false; w.players.gold.lives = 0;
    step(w); expect(w.phase).toBe("game-over"); expect(w.pickups.brute).toBeNull();
    const hash = worldHash(w); advance(w, 1000); expect(worldHash(w)).toBe(hash);
  });
  it("takes three distinct hits, awards a kill bonus, and never joins the wave count", () => {
    const w = pickupFixture("brute"); step(w); w.pickups.brute!.arrivalTicks = 0;
    for (let i = 0; i < 3; i++) { bullet(w, { x: w.pickups.brute!.x, y: w.pickups.brute!.y }); step(w); }
    expect(w.pickups.brute).toBeNull(); expect(w.players.gold.score).toBe(1000);
    const active = pickupFixture("brute"); step(active); active.enemies = []; step(active);
    expect(active.phase).toBe("riftwing"); expect(active.pickups.brute).toBeNull();
  });
  it.each(Object.values(MAZES))("brute pursuit stays out of walls in $id", maze => {
    const w = createWorld({ mode: "practice", seed: 72 }); w.maze = maze; w.phase = "clear";
    Object.assign(w.players.gold, maze.playerSpawns.gold); Object.assign(w.players.cyan, maze.playerSpawns.cyan);
    const p = pickupSpawnCandidates(w, 80)[0]!;
    w.pickups.brute = { ...p, id: w.nextEntityId++, health: 3, facing: "south", arrivalTicks: 0, ticks: 720 };
    for (let i = 0; i < 600; i++) {
      step(w); expect(overlapsWall(maze, { ...w.pickups.brute!, halfSize: 5 })).toBe(false);
    }
  });
  it("clears rewards and boxes at wave end and resets on the next dungeon", () => {
    for (const kind of ["twin", "piercing", "bomb", "shield"] as const) {
      const w = collect(kind); w.enemies = []; step(w);
      expect(w.pickups.effect).toBeNull(); expect(w.pickups.box).toBeNull();
      w.phase = "transition"; w.phaseTicks = 1; step(w);
      expect(w.dungeon).toBe(2); expect(w.pickups.nextSpawnTicks).toBeGreaterThanOrEqual(360);
    }
  });
  it("replays every pickup experiment with identical outcomes and timers", () => {
    for (const scenario of PICKUP_SCENARIOS) {
      const a = scenario.create(), b = scenario.create();
      for (let i = 0; i < 900; i++) {
        const input = scenario.commands(a); stepWorld(a, input); stepWorld(b, input);
      }
      expect(worldHash(a), scenario.id).toBe(worldHash(b));
    }
  });
});

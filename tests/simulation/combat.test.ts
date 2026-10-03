import { describe, expect, it } from "vitest";
import { MAZES } from "../../src/game/mazes";
import { COMBAT_PROFILES, enemyShotLimit } from "../../src/game/combat";
import { NEUTRAL_COMMAND, type CombatProfile, type PlayerCommand, type ProjectileState, type WorldState } from "../../src/game/model";
import { createWorld, stepWorld, worldHash } from "../../src/game/simulation";
import { COMBAT_SCENARIOS } from "../../src/debug/combat-scenarios";

const neutral = { gold: NEUTRAL_COMMAND, cyan: NEUTRAL_COMMAND };
const fire = { ...NEUTRAL_COMMAND, fire: true };
function step(w: WorldState, gold: PlayerCommand = NEUTRAL_COMMAND) { return stepWorld(w, { ...neutral, gold }); }
function advance(w: WorldState, ticks: number) { for (let i = 0; i < ticks; i++) step(w); }

function arena(profile: CombatProfile = "balanced", count = 1, practice = false): WorldState {
  const w = createWorld({ mode: practice ? "practice" : "alliance", seed: 72, enemyCount: count, combatProfile: profile });
  w.maze = { ...MAZES.pit, walls: MAZES.pit.walls.map(row => [...row]) };
  w.phase = "clear";
  w.remainingChains = 0;
  Object.assign(w.players.gold, { x: 264, y: 120, invulnerableTicks: 0, facing: "west" });
  Object.assign(w.players.cyan, { alive: false, lives: 0 });
  w.enemies.forEach((e, i) => Object.assign(e, { x: 200 - i * 16, y: 120, facing: "east", fireCooldownTicks: 0, decisionTicks: 999 }));
  return w;
}
function bullet(w: WorldState, patch: Partial<ProjectileState> = {}): ProjectileState {
  const shot: ProjectileState = { id: w.nextEntityId++, ownerType: "player", ownerId: "gold", x: 194, y: 120, direction: "east", ttlTicks: 180, speed: 3.5, ...patch };
  w.projectiles.push(shot);
  if (shot.ownerType === "player") w.players.gold.shotId = shot.id;
  return shot;
}

describe("readable combat timing", () => {
  for (const tier of [0, 1, 2] as const) {
    it(`tier ${tier} reveals, stops, warns, and fires along its committed direction`, () => {
      const w = arena(); const e = w.enemies[0]!; e.tier = tier; e.cloaked = true;
      const events = step(w);
      expect(events.map(e => e.type)).toContain("enemy-windup");
      expect(e.cloaked).toBe(false);
      expect(w.projectiles).toHaveLength(0);
      const duration = COMBAT_PROFILES.balanced.warnings[tier];
      for (let i = 1; i < duration; i++) {
        step(w, { ...NEUTRAL_COMMAND, move: "north" });
        expect(w.projectiles).toHaveLength(0);
        expect([e.x, e.y]).toEqual([200, 120]);
      }
      expect(step(w).map(e => e.type)).toContain("enemy-shot");
      expect(w.projectiles[0]).toMatchObject({ direction: "east", speed: [2.5, 2.75, 3][tier] });
      expect([e.x, e.y]).toEqual([200, 120]);
      advance(w, 30);
      expect(w.players.gold.alive).toBe(true);
    });
  }

  it("a 200 ms response to the firing cue survives the tuned duel, but not the old timing", () => {
    for (const profile of ["legacy", "balanced"] as const) {
      const w = arena(profile);
      for (let tick = 0; tick < 60; tick++) step(w, { ...NEUTRAL_COMMAND, move: tick >= 12 ? "north" : null });
      expect(w.players.gold.alive, profile).toBe(profile === "balanced");
    }
  });

  it("cover still blocks a committed shot after the target moves out of sight", () => {
    const w = arena(); step(w);
    const walls = w.maze.walls.map(row => [...row]); walls[7]![14] = true;
    w.maze = { ...w.maze, walls };
    const events = [];
    for (let i = 0; i < 40; i++) events.push(...step(w));
    expect(events.some(e => e.type === "enemy-shot")).toBe(true);
    expect(events.some(e => e.type === "wall-impact")).toBe(true);
    expect(w.players.gold.alive).toBe(true);
  });

  it("killing a charging enemy cancels its reserved shot", () => {
    const w = arena(); step(w); bullet(w); step(w);
    expect(w.enemies).toHaveLength(0);
    for (let i = 0; i < 30; i++) expect(step(w).some(e => e.type === "enemy-shot")).toBe(false);
  });

  it.each([1, 3, 8])("reserves warning slots and limits shots per enemy in dungeon %s", dungeon => {
    const w = arena("balanced", 6, true); w.dungeon = dungeon;
    step(w);
    expect(w.enemies.filter(e => e.fireDirection !== null)).toHaveLength(enemyShotLimit(dungeon));
    for (let i = 0; i < 600; i++) {
      step(w);
      const shots = w.projectiles.filter(p => p.ownerType === "enemy");
      expect(new Set(shots.map(p => p.ownerId)).size).toBe(shots.length);
      expect(shots.length + w.enemies.filter(e => e.fireDirection !== null).length).toBeLessThanOrEqual(enemyShotLimit(dungeon));
    }
  });

  it("player bullets move at 210 px/s and leaving the gate releases the weapon", () => {
    const w = arena(); w.phase = "gaoler";
    step(w, fire);
    expect(w.projectiles[0]!.speed).toBe(3.5);
    const x = w.projectiles[0]!.x; step(w);
    expect(w.projectiles[0]!.x).toBeCloseTo(x - 3.5);
    Object.assign(w.projectiles[0]!, { x: 1, y: 120, direction: "west" });
    step(w);
    expect(w.players.gold.shotId).toBeNull();
    expect(w.projectiles).toHaveLength(0);
  });

  it("the Gaoler telegraphs and commits its slower bolt", () => {
    const w = arena(); w.phase = "gaoler";
    w.gaoler = { x: 200, y: 120, visible: true, cycleTicks: 103, hasFired: false, fireDirection: null };
    expect(step(w).some(e => e.type === "gaoler-windup")).toBe(true);
    w.players.gold.y = 200;
    advance(w, 23); expect(w.projectiles).toHaveLength(0);
    step(w);
    expect(w.projectiles[0]).toMatchObject({ ownerType: "gaoler", direction: "east", speed: 3 });
  });
});

describe("one-shot fire buffering", () => {
  function busy(ttl: number): WorldState {
    const w = arena(); w.phase = "gaoler";
    bullet(w, { x: 400, y: 104, ttlTicks: ttl });
    return w;
  }
  it("honors one press when the previous shot expires in the same tick", () => {
    const w = busy(1); const id = w.players.gold.shotId;
    const events = step(w, fire);
    expect(events.filter(e => e.type === "shot")).toHaveLength(1);
    expect(w.projectiles).toHaveLength(1);
    expect(w.players.gold.shotId).not.toBe(id);
    expect(w.players.gold.fireBufferUntil).toBe(0);
    advance(w, 5); expect(w.projectiles).toHaveLength(1);
  });
  it.each([8, 9])("honors a press released within its eight-tick window (TTL %s)", ttl => {
    const w = busy(ttl); step(w, fire);
    const events = [];
    for (let i = 0; i < ttl; i++) events.push(...step(w));
    expect(events.filter(e => e.type === "shot")).toHaveLength(1);
  });
  it("expires stale presses rather than unexpectedly firing later", () => {
    const w = busy(10); step(w, fire); advance(w, 12);
    expect(w.projectiles).toHaveLength(0);
    expect(w.players.gold.fireBufferUntil).toBe(0);
  });
  it("uses current facing when a queued shot is released", () => {
    const w = busy(2); step(w, fire); step(w, { ...NEUTRAL_COMMAND, move: "south", aim: true });
    expect(w.projectiles[0]!.direction).toBe("south");
  });
  it("clears a pending press on death and does not shoot on re-entry", () => {
    const w = busy(20); step(w, fire);
    bullet(w, { ownerType: "enemy", ownerId: 1, x: 258, y: 120, speed: 2.5 });
    step(w);
    expect(w.players.gold.alive).toBe(false);
    expect(w.players.gold.fireBufferUntil).toBe(0);
    step(w, fire);
    expect(w.players.gold.alive).toBe(true);
    expect(w.projectiles.filter(p => p.ownerType === "player")).toHaveLength(0);
  });
  it("clears queued input when the dungeon changes phase", () => {
    const w = busy(20); step(w, fire); w.phase = "clear"; w.enemies = [];
    step(w); expect(w.phase).toBe("riftwing"); expect(w.players.gold.fireBufferUntil).toBe(0);
    advance(w, 22); expect(w.players.gold.shotId).toBeNull();
  });
});

describe("staged enemy succession", () => {
  it("initializes the production chain budget on creation and each dungeon transition", () => {
    const w = createWorld({ mode: "practice", seed: 72 });
    expect(w.combatProfile).toBe("balanced");
    expect(w.remainingChains).toBe(1);
    for (let dungeon = 2; dungeon <= 12; dungeon++) {
      w.phase = "transition"; w.phaseTicks = 1;
      step(w);
      expect(w.dungeon).toBe(dungeon);
      expect(w.remainingChains + w.enemies.filter(e => e.tier > 0).length).toBe(Math.min(6, dungeon));
      expect(w.players.gold.fireBufferUntil).toBe(0);
    }
  });

  it("keeps all six original chains in the comparison profile", () => {
    const w = createWorld({ mode: "practice", seed: 72, combatProfile: "legacy" });
    expect(w.remainingChains).toBe(6);
    w.phase = "clear";
    const e = w.enemies[0]!;
    bullet(w, { x: e.x, y: e.y, speed: 0 });
    step(w);
    expect(w.enemies).toHaveLength(6);
    expect(e.tier).toBe(1);
    expect(e.arrivalTicks).toBe(0);
  });

  it.each([[1, 8], [2, 10], [3, 12], [4, 14], [5, 16], [6, 18]])("dungeon %s clears in %s hits with late chains", (dungeon, hits) => {
    const w = arena("balanced", 6, true); w.dungeon = dungeon; w.remainingChains = Math.min(6, dungeon);
    let count = 0;
    while (w.enemies.length && count < 30) {
      const e = w.enemies[0]!;
      // Freeze AI while awaiting the actual arrival countdown.
      w.enemies.forEach(e => { e.fireCooldownTicks = 999; e.decisionTicks = 999; });
      while (e.arrivalTicks > 0) step(w);
      bullet(w, { x: e.x, y: e.y, speed: 0 });
      step(w); count++;
      if (dungeon === 1 && count < 6) expect(w.enemies.every(e => e.tier === 0)).toBe(true);
    }
    expect(count).toBe(hits);
    expect(w.enemies).toHaveLength(0);
    expect(w.phase).toBe("riftwing");
  });
  it("a replacement visibly arrives before it can move, fire, hit, or be hit", () => {
    const w = arena(); w.remainingChains = 1;
    bullet(w); step(w);
    const e = w.enemies[0]!; expect(e.arrivalTicks).toBe(18);
    const pos = { x: e.x, y: e.y };
    Object.assign(w.players.gold, pos);
    bullet(w, { x: e.x, y: e.y, speed: 0 });
    for (let i = 0; i < 17; i++) {
      const events = step(w);
      expect([e.x, e.y]).toEqual([pos.x, pos.y]);
      expect(events.some(e => e.type === "enemy-shot" || e.type === "player-hit" || e.type === "enemy-hit")).toBe(false);
    }
  });
  it("all comparison profiles replay deterministically", () => {
    for (const profile of Object.keys(COMBAT_PROFILES) as CombatProfile[]) {
      const a = arena(profile, 6, true), b = arena(profile, 6, true);
      advance(a, 400); advance(b, 400);
      expect(worldHash(a)).toBe(worldHash(b));
    }
    for (const scenario of COMBAT_SCENARIOS) for (const profile of Object.keys(COMBAT_PROFILES) as CombatProfile[]) {
      const a = scenario.create(profile), b = scenario.create(profile);
      for (let tick = 0; tick < 180; tick++) {
        stepWorld(a, scenario.commands(a)); stepWorld(b, scenario.commands(b));
      }
      expect(worldHash(a), `${scenario.id}/${profile}`).toBe(worldHash(b));
    }
  });
});

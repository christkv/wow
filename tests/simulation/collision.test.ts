import { describe, expect, it } from "vitest";
import { COLLISION_SCENARIOS, DIRECTIONS, collisionBodies, commands, fixtureWorld, overlapsWall, riftwingWorld, wallWorld } from "../../src/debug/collision-scenarios";
import { MAZES } from "../../src/game/mazes";
import { DIRECTION_VECTOR, type Direction, type WorldState } from "../../src/game/model";
import { stepWorld, worldHash } from "../../src/game/simulation";
import { tryMove } from "../../src/game/collision";

function advance(world: WorldState, ticks: number, direction: Direction | null = null): void {
  for (let i = 0; i < ticks; i++) stepWorld(world, commands(direction));
}

function runScenario(id: string, ticks: number): WorldState {
  const scenario = COLLISION_SCENARIOS.find(s => s.id === id)!;
  const world = scenario.create();
  for (let i = 0; i < ticks; i++) stepWorld(world, scenario.commands(world));
  return world;
}

describe("actor/wall collision invariants", () => {
  it("rejects a long move across a wall even when its destination is clear", () => {
    const world = wallWorld("east");
    expect(tryMove(world.maze, world.players.gold, "east", 64, 5, true)).toBe(false);
    expect(world.players.gold.x).toBe(56);
  });

  for (const side of ["left", "right"] as const) {
    it(`${side} gate permits inward recovery but blocks further outward movement during cooldown`, () => {
      const world = fixtureWorld();
      const p = world.players.gold;
      const width = world.maze.width * 16;
      Object.assign(p, { x: side === "left" ? -1 : width + 1, y: 120 });
      world.gateCooldownTicks = 180;
      const outward = side === "left" ? "west" : "east";
      const inward = side === "left" ? "east" : "west";
      const x = p.x;
      stepWorld(world, commands(outward));
      expect(p.x).toBe(x);
      advance(world, 12, inward);
      expect(p.x).toBeGreaterThanOrEqual(5);
      expect(p.x).toBeLessThanOrEqual(width - 5);
      expect(world.gateCooldownTicks).toBeGreaterThan(0);
    });

    it(`${side} gate wraps when open and rejects a body outside the gate lane`, () => {
      const world = fixtureWorld();
      const p = world.players.gold;
      const width = world.maze.width * 16;
      const outward = side === "left" ? "west" : "east";
      Object.assign(p, { x: side === "left" ? -4 : width + 4, y: 120 });
      const events = stepWorld(world, commands(outward));
      expect(p.x).toBe(side === "left" ? width - 5 : 5);
      expect(events.some(e => e.type === "gate")).toBe(true);
      Object.assign(p, { x: side === "left" ? 22 : width - 22, y: 115 });
      world.gateCooldownTicks = 0;
      const start = p.x;
      advance(world, 20, outward);
      expect(Math.abs(p.x - start)).toBeLessThan(2);
      expect(overlapsWall(world.maze, { ...p, halfSize: 5 })).toBe(false);
    });
  }

  for (const direction of DIRECTIONS) {
    it(`stops the player at a wall when moving ${direction} and allows immediate reversal`, () => {
      const world = wallWorld(direction);
      for (let i = 0; i < 60; i++) {
        stepWorld(world, commands(direction));
        expect(overlapsWall(world.maze, { ...world.players.gold, halfSize: 5 })).toBe(false);
      }
      const before = { ...world.players.gold };
      stepWorld(world, commands(direction));
      expect(world.players.gold.x).toBe(before.x);
      expect(world.players.gold.y).toBe(before.y);
      const opposite = DIRECTIONS[(DIRECTIONS.indexOf(direction) + 2) % 4]!;
      stepWorld(world, commands(opposite));
      const v = DIRECTION_VECTOR[opposite];
      expect(world.players.gold.x).toBeCloseTo(before.x + v.x * 1.25);
      expect(world.players.gold.y).toBeCloseTo(before.y + v.y * 1.25);
    });

    for (const tier of [0, 1, 2] as const) {
      it(`keeps tier ${tier} enemy outside the ${direction} wall at maximum dungeon speed`, () => {
        const world = wallWorld(direction, true);
        world.dungeon = 30;
        world.enemies[0]!.tier = tier;
        let blocked = false;
        for (let i = 0; i < 90; i++) {
          const enemy = world.enemies[0]!;
          // Isolate collision: prevent a blocked enemy's next AI choice moving it away.
          enemy.facing = direction;
          enemy.decisionTicks = 999;
          const before = { ...enemy };
          stepWorld(world, commands());
          blocked ||= before.x === enemy.x && before.y === enemy.y;
          expect(overlapsWall(world.maze, { ...enemy, halfSize: 5 })).toBe(false);
        }
        expect(blocked).toBe(true);
      });
    }
  }

  it.each([115, 116.75, 123.25])("rejects an off-center opening approach at y=%s", y => {
    const world = fixtureWorld(MAZES.rings01);
    Object.assign(world.players.gold, { x: 74, y });
    advance(world, 10, "east");
    expect(world.players.gold.x).toBe(74);
  });

  it.each([117.25, 120, 122.75])("passes through a narrow opening at y=%s", y => {
    const world = fixtureWorld(MAZES.rings01);
    Object.assign(world.players.gold, { x: 74, y });
    for (let i = 0; i < 24; i++) {
      stepWorld(world, commands("east"));
      expect(overlapsWall(world.maze, { ...world.players.gold, halfSize: 5 })).toBe(false);
    }
    expect(world.players.gold.x).toBe(104);
  });

  for (const maze of Object.values(MAZES)) {
    it(`${maze.id}: authored spawns and every tick of a seeded movement soak stay clear`, () => {
      const world = fixtureWorld(maze, 6);
      world.enemies.forEach((enemy, i) => Object.assign(enemy, maze.enemySpawns[i]));
      world.phase = "clear";
      let rng = 1234567;
      const next = (): number => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return rng >>> 0; };
      let input = commands();
      for (let i = 0; i <= 1200; i++) {
        for (const body of collisionBodies(world)) expect(overlapsWall(maze, body), `${body.id} at tick ${i}`).toBe(false);
        if (i % 15 === 0) input = commands(DIRECTIONS[next() % 4]!, DIRECTIONS[next() % 4]!);
        if (i < 1200) stepWorld(world, input);
      }
    });
  }

  it("replays every lab scenario deterministically", () => {
    for (const scenario of COLLISION_SCENARIOS) {
      expect(worldHash(runScenario(scenario.id, 240)), scenario.id).toBe(worldHash(runScenario(scenario.id, 240)));
    }
  });
});

describe("collision/navigation regressions", () => {
  for (const maze of [MAZES.rings02, MAZES.crossroads02, MAZES.splitKeep01, MAZES.coils01, MAZES.gauntlet01]) {
    it(`${maze.id}: Riftwing spawns without wall overlap`, () => {
      const world = riftwingWorld(maze);
      expect(world.riftwing).not.toBeNull();
      expect(overlapsWall(maze, { ...world.riftwing!, halfSize: 4 })).toBe(false);
    });
  }

  it("an actor already crossing can return inside after another actor closes the gate", () => {
    const world = runScenario("gate-stranding", 30);
    expect(world.gateCooldownTicks).toBeGreaterThan(0);
    expect(world.players.cyan.x).toBeLessThanOrEqual(539);
  });

  it("the companion gets around a corner rather than repeating a blocked command", () => {
    const world = runScenario("companion-corner", 120);
    expect(Math.hypot(world.players.cyan.x - 74, world.players.cyan.y - 115)).toBeGreaterThan(0);
    // It may stop as soon as it has a clear shot: success means defeating the
    // stationary target, not walking an arbitrary distance beyond the corner.
    expect(world.enemies).toHaveLength(0);
    expect(world.players.cyan.score).toBe(100);
  });

  it("Riftwing reaches the open gate in the empty Pit within 10 seconds", () => {
    const world = runScenario("riftwing-pit-01", 600);
    expect(world.riftwing).toBeNull();
  });

  it("Riftwing respects the same closed gate as other actors", () => {
    const world = runScenario("closed-gate", 1);
    expect(world.gateCooldownTicks).toBeGreaterThan(0);
    expect(world.riftwing).not.toBeNull();
  });

  it("Riftwing AI accepts a passage that fits its actual collision body", () => {
    const world = runScenario("riftwing-clearance", 1);
    expect(world.riftwing!.x).toBeLessThan(88);
    expect(world.riftwing!.y).toBe(116.5);
  });

  it("exact tangency permits passage at both sides of a one-tile opening", () => {
    const left = fixtureWorld(MAZES.rings01), right = fixtureWorld(MAZES.rings01);
    Object.assign(left.players.gold, { x: 74, y: 117 });
    Object.assign(right.players.gold, { x: 74, y: 123 });
    advance(left, 1, "east"); advance(right, 1, "east");
    expect(left.players.gold.x).toBeGreaterThan(74);
    expect(right.players.gold.x).toBeGreaterThan(74);
  });

  for (const maze of Object.values(MAZES)) for (const side of ["left", "right"] as const) {
    it(`${maze.id}: Riftwing safely reaches the ${side} gate, including a mid-chase closure`, () => {
      const world = riftwingWorld(maze);
      world.riftwing!.targetGate = side;
      let escaped = false;
      for (let tick = 0; tick < 3600 && world.riftwing; tick++) {
        expect(overlapsWall(maze, { ...world.riftwing, halfSize: 4 })).toBe(false);
        if (tick === 100) world.gateCooldownTicks = 180;
        const cooldown = world.gateCooldownTicks;
        const events = stepWorld(world, commands());
        if (events.some(event => event.type === "riftwing-escaped")) {
          expect(cooldown).toBeLessThanOrEqual(1);
          escaped = true;
        }
      }
      expect(escaped).toBe(true);
    });
  }
});

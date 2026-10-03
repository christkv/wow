import { describe, expect, it } from "vitest";
import { NEUTRAL_COMMAND, TILE_SIZE, type PlayerCommand, type PlayerId, type WorldState } from "../../src/game/model";
import { createWorld, stepWorld, worldHash } from "../../src/game/simulation";
import { MAZES } from "../../src/game/mazes";

const neutral = (): Record<PlayerId, PlayerCommand> => ({
  gold: { ...NEUTRAL_COMMAND },
  cyan: { ...NEUTRAL_COMMAND }
});

function advance(world: WorldState, ticks: number): void {
  for (let tick = 0; tick < ticks; tick += 1) stepWorld(world, neutral());
}

describe("deterministic simulation", () => {
  it("produces identical hashes from a seed and command stream", () => {
    const first = createWorld({ mode: "alliance", seed: 12345, enemyCount: 3 });
    const second = createWorld({ mode: "alliance", seed: 12345, enemyCount: 3 });
    for (let tick = 0; tick < 900; tick += 1) {
      const command: Record<PlayerId, PlayerCommand> = {
        gold: {
          move: tick % 240 < 60 ? "north" : tick % 240 < 120 ? "east" : tick % 240 < 180 ? "south" : "west",
          fire: tick % 41 === 0,
          aim: tick % 17 === 0,
          pause: false
        },
        cyan: {
          move: tick % 180 < 90 ? "west" : "north",
          fire: tick % 53 === 0,
          aim: false,
          pause: false
        }
      };
      stepWorld(first, command);
      stepWorld(second, command);
    }
    expect(worldHash(first)).toBe(worldHash(second));
    expect(first).toEqual(second);
  });

  it("protects entry and then opens the clear phase", () => {
    const world = createWorld({ mode: "solo", seed: 9, enemyCount: 1 });
    const fire = neutral();
    fire.gold = { ...NEUTRAL_COMMAND, fire: true };
    stepWorld(world, fire);
    expect(world.projectiles).toHaveLength(0);
    advance(world, 59);
    expect(world.phase).toBe("clear");
  });

  it("enforces one live projectile for each player", () => {
    const world = createWorld({ mode: "alliance", seed: 4, enemyCount: 1 });
    advance(world, 60);
    const fire = neutral();
    fire.gold = { ...NEUTRAL_COMMAND, fire: true };
    stepWorld(world, fire);
    const shotId = world.players.gold.shotId;
    expect(shotId).not.toBeNull();
    stepWorld(world, fire);
    expect(world.projectiles.filter((projectile) => projectile.ownerId === "gold")).toHaveLength(1);
    expect(world.players.gold.shotId).toBe(shotId);
  });

  it("applies friendly fire in Classic but not Alliance", () => {
    const classic = createWorld({ mode: "classic", seed: 11, enemyCount: 1 });
    const alliance = createWorld({ mode: "alliance", seed: 11, enemyCount: 1 });
    for (const world of [classic, alliance]) {
      world.phase = "clear";
      world.phaseTicks = 0;
      world.players.gold.x = 120;
      world.players.gold.y = 104;
      world.players.gold.facing = "east";
      world.players.gold.invulnerableTicks = 0;
      world.players.cyan.x = 168;
      world.players.cyan.y = 104;
      world.players.cyan.invulnerableTicks = 0;
      world.enemies[0]!.x = 400;
      world.enemies[0]!.y = 200;
    }
    const fire = neutral();
    fire.gold = { ...NEUTRAL_COMMAND, fire: true };
    for (let tick = 0; tick < 12; tick += 1) {
      stepWorld(classic, tick === 0 ? fire : neutral());
      stepWorld(alliance, tick === 0 ? fire : neutral());
    }
    expect(classic.players.cyan.lives).toBe(2);
    expect(classic.players.gold.score).toBe(1_000);
    expect(alliance.players.cyan.lives).toBe(3);
  });

  it("does not consume lives in Practice", () => {
    const world = createWorld({ mode: "practice", seed: 8, enemyCount: 1 });
    world.phase = "clear";
    world.players.gold.invulnerableTicks = 0;
    world.enemies[0]!.x = world.players.gold.x;
    world.enemies[0]!.y = world.players.gold.y;
    stepWorld(world, neutral());
    expect(world.players.gold.alive).toBe(true);
    expect(world.players.gold.lives).toBe(3);
  });

  it("turns a Riftwing capture into next-dungeon double score", () => {
    const world = createWorld({ mode: "practice", seed: 71, enemyCount: 0 });
    advance(world, 60);
    expect(world.phase).toBe("riftwing");
    world.maze = MAZES.pit;
    world.players.gold.x = 96;
    world.players.gold.y = 120;
    world.players.gold.facing = "east";
    world.riftwing!.x = 130;
    world.riftwing!.y = 120;
    world.riftwing!.targetGate = "right";
    world.riftwing!.facing = "east";
    const fire = neutral();
    fire.gold = { ...NEUTRAL_COMMAND, fire: true };
    stepWorld(world, fire);
    for (let tick = 0; tick < 30 && world.phase === "riftwing"; tick++) advance(world, 1);
    expect(world.nextDouble).toBe(true);
    expect(world.phase).toBe("transition");
    advance(world, 120);
    expect(world.dungeon).toBe(2);
    expect(world.multiplier).toBe(2);
  });

  it("wraps through an open side gate and closes it for three seconds", () => {
    const world = createWorld({ mode: "practice", seed: 72, enemyCount: 0 });
    advance(world, 60);
    const gateY = (world.maze.gateRow + 0.5) * TILE_SIZE;
    world.players.gold.x = -4;
    world.players.gold.y = gateY;
    const move = neutral();
    move.gold = { ...NEUTRAL_COMMAND, move: "west" };

    const events = stepWorld(world, move);

    expect(world.players.gold.x).toBe(world.maze.width * TILE_SIZE - 5);
    expect(world.gateCooldownTicks).toBe(180);
    expect(events).toContainEqual(expect.objectContaining({ type: "gate", player: "gold" }));

    stepWorld(world, { ...neutral(), gold: { ...NEUTRAL_COMMAND, move: "east" } });
    expect(world.players.gold.x).toBe(world.maze.width * TILE_SIZE - 5);
    expect(world.gateCooldownTicks).toBe(179);
  });

  it("lets a reserve delver re-enter early with Fire", () => {
    const world = createWorld({ mode: "alliance", seed: 73, enemyCount: 1 });
    advance(world, 60);
    world.players.gold.alive = false;
    world.players.gold.lives = 2;
    world.players.gold.respawnTicks = 180;
    const enter = neutral();
    enter.gold = { ...NEUTRAL_COMMAND, fire: true };

    stepWorld(world, enter);

    expect(world.players.gold.alive).toBe(true);
    expect(world.players.gold.invulnerableTicks).toBe(60);
    expect(world.players.gold).toMatchObject(world.maze.playerSpawns.gold);
  });

  it("ends the Riftwing chase when it reaches its chosen side gate", () => {
    const world = createWorld({ mode: "practice", seed: 74, enemyCount: 0 });
    advance(world, 60);
    world.riftwing!.x = -3;
    world.riftwing!.y = (world.maze.gateRow + 0.5) * TILE_SIZE;
    world.riftwing!.facing = "west";
    world.riftwing!.targetGate = "left";

    const events = stepWorld(world, neutral());

    expect(world.riftwing).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: "riftwing-escaped" }));
    expect(["transition", "gaoler"]).toContain(world.phase);
  });

  it("ends a Gaoler invasion when a delver is struck", () => {
    const world = createWorld({ mode: "alliance", seed: 75, enemyCount: 1 });
    advance(world, 60);
    world.phase = "gaoler";
    world.objective = "STRIKE THE GAOLER";
    world.gaoler = { x: 400, y: 200, visible: true, cycleTicks: 100, hasFired: true, fireDirection: null };
    world.players.gold.x = 120;
    world.players.gold.y = 120;
    world.players.gold.invulnerableTicks = 0;
    world.projectiles.push({
      id: world.nextEntityId++, ownerType: "gaoler", ownerId: "gaoler",
      x: 115.5, y: 120, direction: "east", ttlTicks: 30, speed: 3
    });

    const events = stepWorld(world, neutral());

    expect(world.players.gold.alive).toBe(false);
    expect(world.gaoler).toBeNull();
    expect(world.phase).toBe("transition");
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["player-hit", "dungeon-clear"]));
  });

  it("survives a long deterministic Practice soak without invalid positions", () => {
    const world = createWorld({ mode: "practice", seed: 0xabc123, enemyCount: 6 });
    for (let tick = 0; tick < 12_000; tick += 1) {
      const command = neutral();
      command.gold = {
        move: (["north", "east", "south", "west"] as const)[Math.floor(tick / 90) % 4]!,
        fire: tick % 37 === 0,
        aim: tick % 19 === 0,
        pause: false
      };
      stepWorld(world, command);
    }
    for (const state of [...Object.values(world.players), ...world.enemies, ...world.projectiles]) {
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.y)).toBe(true);
    }
    expect(world.tick).toBe(12_000);
    expect(worldHash(world)).toMatch(/^[0-9a-f]{8}$/);
  });
});

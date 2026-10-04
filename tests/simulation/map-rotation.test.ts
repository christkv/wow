import { describe, expect, it } from "vitest";
import { createWorld, stepWorld, worldHash } from "../../src/game/simulation";
import { MAZES, mazeForDungeon } from "../../src/game/mazes";
import { NEUTRAL_COMMAND, type WorldState } from "../../src/game/model";
import { createDemoWorld } from "../../src/game/demo";
import { overlapsWall } from "../../src/debug/collision-scenarios";

function nextDungeon(world: WorldState): void {
  world.phase = "transition"; world.phaseTicks = 1;
  stepWorld(world, { gold: NEUTRAL_COMMAND, cyan: NEUTRAL_COMMAND });
}

describe("map selection", () => {
  it("defaults to the original order, including Arena and Pit milestones", () => {
    const world = createWorld({ mode: "practice", seed: 72 });
    expect(world.mapRotation.enabled).toBe(false);
    for (let dungeon = 1; dungeon <= 40; dungeon++) {
      expect(world.maze.id).toBe(mazeForDungeon(dungeon).id); nextDungeon(world);
    }
  });
  it.each([1, 72, 2026, 999999])("seed %s visits all twelve layouts before repeating, with no adjacent repeats", seed => {
    const world = createWorld({ mode: "practice", seed, randomMaps: true });
    const ids: string[] = [];
    for (let dungeon = 1; dungeon <= 36; dungeon++) {
      expect(world.dungeon).toBe(dungeon);
      ids.push(world.maze.id);
      for (const actor of [...Object.values(world.players), ...world.enemies]) {
        expect(overlapsWall(world.maze, { ...actor, halfSize: 5 })).toBe(false);
      }
      nextDungeon(world);
    }
    for (let i = 0; i < 36; i += 12) expect([...ids.slice(i, i + 12)].sort()).toEqual(Object.values(MAZES).map(m => m.id).sort());
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });
  it("randomizes the first map and isolates its randomness from enemy and item rolls", () => {
    const firstMaps = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const normal = createWorld({ mode: "solo", seed }), random = createWorld({ mode: "solo", seed, randomMaps: true });
      firstMaps.add(random.maze.id);
      expect(random.rngState).toBe(normal.rngState);
      expect(random.pickups.rngState).toBe(normal.pickups.rngState);
    }
    expect(firstMaps.size).toBeGreaterThan(1);
  });
  it("saved simulation state and the same seed preserve future random maps", () => {
    const a = createWorld({ mode: "practice", seed: 72, randomMaps: true });
    for (let i = 0; i < 9; i++) nextDungeon(a);
    const b = JSON.parse(JSON.stringify(a)) as WorldState;
    for (let i = 0; i < 30; i++) { nextDungeon(a); nextDungeon(b); expect(worldHash(a)).toBe(worldHash(b)); }
  });
  it("attract demos use the selected map mode without changing their default", () => {
    expect(createDemoWorld().maze.id).toBe(mazeForDungeon(1).id);
    expect(createDemoWorld(0, true)).toEqual(createWorld({ mode: "alliance", seed: 72, randomMaps: true }));
  });
});

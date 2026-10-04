import { describe, expect, it } from "vitest";
import { createDemoWorld, demoCommands } from "../../src/game/demo";
import { stepWorld, worldHash } from "../../src/game/simulation";
import { gamepadActive } from "../../src/input/user-activity";
import { overlapsWall } from "../../src/debug/collision-scenarios";

describe("arcade demo", () => {
  it.each([0, 1, 2])("cycle %s moves, shoots, defeats enemies and replays the real simulation", cycle => {
    const a = createDemoWorld(cycle), b = createDemoWorld(cycle);
    const start = { ...a.players.gold };
    let shots = 0, kills = 0, moved = false;
    for (let i = 0; i < 1800; i++) {
      const input = demoCommands(a), events = stepWorld(a, input);
      stepWorld(b, demoCommands(b));
      shots += events.filter(e => e.type === "shot").length;
      kills += events.filter(e => e.type === "enemy-killed").length;
      moved ||= Math.hypot(a.players.gold.x - start.x, a.players.gold.y - start.y) > 16;
      for (const player of Object.values(a.players)) {
        if (player.alive) expect(overlapsWall(a.maze, { ...player, halfSize: 5 })).toBe(false);
      }
    }
    expect(moved).toBe(true); expect(shots).toBeGreaterThan(10); expect(kills).toBeGreaterThan(0);
    expect(worldHash(a)).toBe(worldHash(b));
    expect(a.mode).toBe("alliance");
  });
  it("starts a fresh world for every demo, with no carry-over of scores or lives", () => {
    const a = createDemoWorld(); a.players.gold.score = 5000; a.players.gold.lives = 0;
    const b = createDemoWorld(); expect(b.players.gold.score).toBe(0); expect(b.players.gold.lives).toBe(3);
    expect(createDemoWorld(3)).toEqual(b);
  });
  it("recognizes any controller's buttons and stick motion, but ignores drift and disconnected pads", () => {
    const pad = (pressed: boolean, axis: number, connected = true) => ({ connected, buttons: [{ pressed }], axes: [axis, 0] }) as unknown as Gamepad;
    expect(gamepadActive([null, pad(false, .15)])).toBe(false);
    expect(gamepadActive([pad(false, -.6)])).toBe(true);
    expect(gamepadActive([null, pad(true, 0)])).toBe(true);
    expect(gamepadActive([pad(true, .9, false)])).toBe(false);
  });
});

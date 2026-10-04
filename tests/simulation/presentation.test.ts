import { describe, expect, it } from "vitest";
import { PixelEffects, MAX_PARTICLES } from "../../src/presentation/pixel-effects";
import { pickupFixture, PICKUP_SCENARIOS } from "../../src/debug/pickup-scenarios";
import { stepWorld, worldHash } from "../../src/game/simulation";
import { pickupStatus } from "../../src/game/pickups";
import { NEUTRAL_COMMAND, type GameEvent } from "../../src/game/model";

const kill: GameEvent = { type: "enemy-killed", x: 264, y: 120, player: "gold" };
const hit: GameEvent = { type: "enemy-hit", x: 264, y: 120, player: "gold" };

describe("pixel impact effects", () => {
  it("bursts on a real enemy kill and on a real player hit", () => {
    for (const [id, type] of [["fx-enemy-kill", "enemy-killed"], ["fx-player-hit", "player-hit"]] as const) {
      const scenario = PICKUP_SCENARIOS.find(s => s.id === id)!;
      const w = scenario.create(), fx = new PixelEffects(), events: GameEvent[] = [];
      for (let i = 0; i < 10; i++) {
        fx.advance(); const e = stepWorld(w, scenario.commands(w)); events.push(...e); fx.emit(e);
      }
      expect(events.some(e => e.type === type)).toBe(true);
      expect(fx.pixels().length).toBeGreaterThan(20);
      expect(new Set(fx.pixels().map(p => `${p.x},${p.y}`)).size).toBeGreaterThan(10);
    }
  });
  it("distinguishes transformations from kills, with no duplicate hit burst", () => {
    const w = pickupFixture("twin"); w.pickups.box = null; w.enemies = [w.enemies[0]!]; w.remainingChains = 1;
    w.projectiles.push({ id: 100, ownerType: "player", ownerId: "gold", x: w.enemies[0]!.x, y: 120, direction: "east", speed: 0, ttlTicks: 1_000 });
    const events = stepWorld(w, { gold: NEUTRAL_COMMAND, cyan: NEUTRAL_COMMAND });
    expect(events.some(e => e.type === "transform")).toBe(true);
    expect(events.some(e => e.type === "enemy-killed")).toBe(false);
    const single = new PixelEffects(), together = new PixelEffects(); single.emit([kill]); together.emit([hit, kill]);
    expect(together.pixels()).toEqual(single.pixels());
  });
  it("reduced effects use fewer, smaller, dimmer particles and expire sooner", () => {
    const normal = new PixelEffects(), reduced = new PixelEffects(); normal.emit([kill]); reduced.emit([kill], true);
    expect(reduced.pixels().length).toBeLessThan(normal.pixels().length);
    expect(reduced.pixels().every(p => p.size === 1 && p.alpha <= .45)).toBe(true);
    for (let i = 0; i < 20; i++) { normal.advance(); reduced.advance(); }
    expect(reduced.pixels()).toHaveLength(0); expect(normal.pixels().length).toBeGreaterThan(0);
  });
  it("draws integer pixels, freezes without ticks, expires, and clears on reset", () => {
    const fx = new PixelEffects(); fx.emit([kill]); for (let i = 0; i < 5; i++) fx.advance();
    const paused = fx.pixels(); expect(paused.every(p => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
    expect(fx.pixels()).toEqual(paused); expect(fx.pixels()).toEqual(paused);
    for (let i = 0; i < 60; i++) fx.advance(); expect(fx.pixels()).toHaveLength(0);
    fx.emit([kill]); fx.clear(); expect(fx.pixels()).toHaveLength(0);
  });
  it("bounds multi-kill debris and replays without modifying gameplay", () => {
    const a = new PixelEffects(), b = new PixelEffects(), w = pickupFixture("bomb"), before = worldHash(w);
    const events = Array.from({ length: 40 }, (_, i) => ({ ...kill, x: i * 8 }));
    a.emit(events); b.emit(events);
    expect(a.pixels()).toHaveLength(MAX_PARTICLES);
    for (let i = 0; i < 12; i++) { a.advance(); b.advance(); }
    expect(a.pixels()).toEqual(b.pixels()); expect(worldHash(w)).toBe(before);
  });
  it("all unopened box outcomes have identical player-facing status", () => {
    const statuses = [pickupFixture("twin"), pickupFixture("bomb"), pickupFixture("brute"), pickupFixture("piercing", true)].map(pickupStatus);
    expect(new Set(statuses).size).toBe(1);
    expect(statuses[0]).toBe("MYSTERY BOX · 10s · REWARD OR MONSTER?");
  });
});

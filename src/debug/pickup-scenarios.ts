import { MAZES } from "../game/mazes";
import { NEUTRAL_COMMAND, type PickupOutcome } from "../game/model";
import { createWorld } from "../game/simulation";
import { AUDIT_SEED, commands, type CollisionScenario } from "./collision-scenarios";

export function pickupFixture(outcome: PickupOutcome, cursed = outcome === "brute") {
  const w = createWorld({ mode: "alliance", seed: AUDIT_SEED, enemyCount: 3 });
  w.phase = "clear"; w.remainingChains = 0; w.maze = MAZES.pit;
  Object.assign(w.players.gold, { x: 232, y: 120, facing: "east", invulnerableTicks: 0 });
  Object.assign(w.players.cyan, { alive: false, lives: 0 });
  w.enemies.forEach((e, i) => Object.assign(e, { x: 328 + i * 48, y: 120, facing: "east", decisionTicks: 9999, fireCooldownTicks: 9999 }));
  w.pickups.box = { x: 232, y: 120, kind: cursed ? "cursed" : "supply", outcome, ticks: 600 };
  w.pickups.nextSpawnTicks = 9999;
  return w;
}

export const PICKUP_SCENARIOS: readonly CollisionScenario[] = [
  {
    id: "fx-enemy-kill", title: "Effects / enemy explosion", pickup: true,
    description: "Gold shoots a Prowler at close range. Advance ten ticks to inspect its pixel debris, or Run to watch it scatter and fade. Reduced particles resets the fixture.",
    expected: "A kill emits a larger burst than a hit. Debris is cosmetic, pauses with the lab, and rewinds with recorded input.",
    create: () => {
      const w = pickupFixture("twin"); w.pickups.box = null;
      w.enemies = [w.enemies[0]!]; Object.assign(w.enemies[0]!, { x: 264, facing: "west" });
      return w;
    }, commands: w => ({ ...commands(), gold: { ...NEUTRAL_COMMAND, fire: w.tick === 0 } })
  },
  {
    id: "fx-player-hit", title: "Effects / player hit", pickup: true,
    description: "A hostile bolt hits Gold. Advance ten ticks for the gold armor burst; it keeps fading during respawn. Reduced particles makes a smaller, dimmer burst.",
    expected: "Gold loses one life. The explosion is visual only and does not damage nearby enemies or alter shot timing.",
    create: () => {
      const w = pickupFixture("twin"); w.pickups.box = null;
      w.projectiles.push({ id: w.nextEntityId++, ownerType: "enemy", ownerId: w.enemies[0]!.id, x: 212, y: 120, speed: 2.5, direction: "east", ttlTicks: 180 });
      return w;
    }, commands: () => commands()
  },
  {
    id: "pickup-twin", title: "Pickups / twin shot", pickup: true,
    description: "Gold collects a forced supply box. Fire twice to use both slots; a third press waits for a free slot. Bullet speed is unchanged.",
    expected: "Two live shots for eight seconds. After expiration, firing waits until existing shots clear.",
    create: () => pickupFixture("twin"), commands: () => commands()
  },
  {
    id: "pickup-piercing", title: "Pickups / piercing lane", pickup: true,
    description: "Collect, then Fire once down the row. One bolt can strike several enemies, but each enemy only once. Walls still stop it.",
    expected: "Each target receives a single hit from this bolt, even if it transforms or remains overlapped.",
    create: () => pickupFixture("piercing"), commands: () => commands()
  },
  {
    id: "pickup-bomb", title: "Pickups / bomb and cover", pickup: true,
    description: "Gold collects a bomb. Use Detonate bomb: the nearby enemy above Gold is exposed; the enemy to the right is behind a wall. The blast spares players.",
    expected: "A 48-pixel blast damages exposed enemies and clears exposed hostile bullets. The wall protects the right-hand enemy.",
    create: () => {
      const w = pickupFixture("bomb");
      const walls = w.maze.walls.map(r => [...r]); walls[7]![16] = true; w.maze = { ...w.maze, walls };
      Object.assign(w.enemies[0]!, { x: 232, y: 88 }); Object.assign(w.enemies[1]!, { x: 280, y: 120 });
      return w;
    }, commands: () => commands()
  },
  {
    id: "pickup-shield", title: "Pickups / shield impact", pickup: true,
    description: "Gold collects a shield before a hostile bolt arrives. Advance 60 ticks to see the shield absorb it.",
    expected: "Shield disappears on impact; Gold keeps all three lives and gets half a second to move clear.",
    create: () => {
      const w = pickupFixture("shield");
      w.projectiles.push({ id: w.nextEntityId++, ownerType: "enemy", ownerId: w.enemies[0]!.id, x: 184, y: 120, speed: 2.5, direction: "east", ttlTicks: 180 });
      return w;
    }, commands: () => commands()
  },
  {
    id: "pickup-brute", title: "Pickups / cursed brute", pickup: true,
    description: "This mystery box is forced to summon a brute. Gold retreats west after collection. Override movement and Fire once to fight it.",
    expected: "One second of harmless arrival, then twelve seconds of slow pursuit. Three hits earn 1000 points. Survival is enough; it never blocks wave completion.",
    create: () => pickupFixture("brute"), commands: w => commands(w.tick > 0 && w.tick < 100 ? "west" : null)
  },
  {
    id: "pickup-cursed-reward", title: "Pickups / cursed reward", pickup: true,
    description: "This fixture forces a longer piercing reward. All boxes share the same chest sprite; the outcome is hidden until collection.",
    expected: "Twelve seconds of piercing instead of the supply box's eight. No simultaneous box or second effect.",
    create: () => pickupFixture("piercing", true), commands: () => commands()
  },
  {
    id: "pickup-random", title: "Pickups / seeded random spawn", pickup: true,
    description: "The real first maze, with the initial spawn countdown shortened to one tick. Seeded location and outcome replay identically. Move Gold to collect.",
    expected: "One box on reachable, empty floor, away from players and entry points. It vanishes after ten seconds if ignored.",
    create: () => { const w = createWorld({ mode: "practice", seed: AUDIT_SEED }); w.phase = "clear"; w.pickups.nextSpawnTicks = 1; return w; },
    commands: () => ({ gold: NEUTRAL_COMMAND, cyan: NEUTRAL_COMMAND })
  }
];

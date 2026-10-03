import { companionCommand } from "../game/ai";
import { MAZES } from "../game/mazes";
import { NEUTRAL_COMMAND, type CombatProfile } from "../game/model";
import { createWorld } from "../game/simulation";
import { AUDIT_SEED, commands, type CollisionScenario } from "./collision-scenarios";

function duel(profile: CombatProfile = "balanced", distance = 64, count = 1) {
  const w = createWorld({ mode: "alliance", seed: AUDIT_SEED, combatProfile: profile, enemyCount: count });
  w.maze = MAZES.pit; w.phase = "clear"; w.remainingChains = 0;
  Object.assign(w.players.gold, { x: 200 + distance, y: 120, invulnerableTicks: 0, facing: "west" });
  Object.assign(w.players.cyan, { alive: false, lives: 0 });
  w.enemies.forEach(e => Object.assign(e, { x: 200, y: 120, facing: "east", decisionTicks: 999, fireCooldownTicks: 0 }));
  return w;
}

export const COMBAT_SCENARIOS: readonly CollisionScenario[] = [
  {
    id: "combat-corner", title: "Combat / two-tile corner", combat: true,
    description: "A Prowler acquires Gold at two tiles. The scripted northward dodge begins after the selected response delay. Alliance mode: hits consume lives.",
    expected: "Compare previous timing with a visible 300 ms warning and slower bullet. Watch the committed arrow, then the bolt's path.",
    create: profile => { const w = duel(profile, 32); const walls = w.maze.walls.map(r => [...r]); walls[6]![12] = true; w.maze = { ...w.maze, walls }; return w; },
    commands: (w, delay = 12) => commands(w.tick >= delay && w.tick < delay + 24 ? "north" : null)
  },
  {
    id: "combat-duel", title: "Combat / four-tile duel", combat: true,
    description: "Same seed and starting positions for every profile. Gold attempts a northward dodge after 200 ms by default. Set Gold movement to Idle to measure impact time.",
    expected: "Previous timing hits before the default dodge. Balanced timing gives Gold time to read the cue and leave the firing lane.",
    create: profile => duel(profile),
    commands: (w, delay = 12) => commands(w.tick >= delay && w.tick < delay + 24 ? "north" : null)
  },
  {
    id: "combat-crossfire", title: "Combat / crossfire", combat: true,
    description: "Two Prowlers approach from perpendicular lanes. Gold first moves south, then east. Change the delay or override movement to explore escape routes.",
    expected: "Both charges remain visible and commit to their original aim. A late or poorly chosen dodge can still be fatal.",
    create: profile => { const w = duel(profile, 64, 2); Object.assign(w.enemies[1]!, { x: 264, y: 56, facing: "south" }); return w; },
    commands: (w, delay = 12) => commands(w.tick < delay ? null : w.tick < delay + 12 ? "south" : w.tick < delay + 36 ? "east" : null)
  },
  {
    id: "combat-long-shot", title: "Combat / missed long shot", combat: true,
    description: "Gold shoots down an empty corridor at tick 0 and presses Fire again at tick 128. Use +600 or replay to compare weapon recovery and buffering.",
    expected: "Slower shots stay live longer. The readable/balanced profiles retain the second press until the first shot hits the wall, without allowing two live shots.",
    create: profile => { const w = duel(profile, 64, 0); w.phase = "gaoler"; Object.assign(w.players.gold, { x: 56, y: 104, facing: "east" }); return w; },
    commands: w => ({ ...commands(), gold: { ...NEUTRAL_COMMAND, fire: w.tick === 0 || w.tick === 128 } })
  },
  {
    id: "combat-succession", title: "Combat / first dungeon", combat: true,
    description: "Practice run with the real first maze and companion AI. Use Gold movement and Fire once to play. Compare Readable with Balanced to isolate staged succession.",
    expected: "Balanced removes the first five Prowlers. The final Prowler introduces one Veilmaw/Ravager chain, with a brief harmless arrival between forms.",
    create: profile => { const w = createWorld({ mode: "practice", seed: AUDIT_SEED, combatProfile: profile }); w.phase = "clear"; return w; },
    commands: w => ({ gold: NEUTRAL_COMMAND, cyan: companionCommand(w) })
  }
];

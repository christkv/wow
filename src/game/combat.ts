import type { CombatProfile, WorldState } from "./model";

export interface CombatTuning {
  readonly playerSpeed: number;
  readonly enemySpeeds: readonly [number, number, number];
  readonly gaolerSpeed: number;
  readonly warnings: readonly [number, number, number];
  readonly gaolerWarningTicks: number;
  readonly bufferTicks: number;
  readonly limitEnemyShots: boolean;
  readonly stagedSuccession: boolean;
  readonly arrivalTicks: number;
}

const legacy: CombatTuning = {
  playerSpeed: 4.5, enemySpeeds: [4.5, 4.5, 4.5], gaolerSpeed: 4.5,
  warnings: [0, 0, 0], gaolerWarningTicks: 0, bufferTicks: 0, limitEnemyShots: false,
  stagedSuccession: false, arrivalTicks: 0
};
const slower: CombatTuning = { ...legacy, playerSpeed: 3.5, enemySpeeds: [2.5, 2.75, 3], gaolerSpeed: 3 };
const readable: CombatTuning = { ...slower, warnings: [18, 15, 12], gaolerWarningTicks: 24, bufferTicks: 8, limitEnemyShots: true, arrivalTicks: 18 };

// Speeds are logical pixels per 60 Hz tick. Profiles are serialized with replays.
export const COMBAT_PROFILES: Readonly<Record<CombatProfile, CombatTuning>> = {
  legacy, slower, readable, balanced: { ...readable, stagedSuccession: true }
};
export const combatTuning = (world: WorldState): CombatTuning => COMBAT_PROFILES[world.combatProfile];
export const enemyShotLimit = (dungeon: number): number => dungeon === 1 ? 2 : dungeon < 5 ? 3 : 4;
export const successionChains = (dungeon: number): number => Math.min(6, Math.max(1, dungeon));

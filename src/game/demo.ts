import { companionCommand } from "./ai";
import { createWorld } from "./simulation";
import type { PlayerCommand, PlayerId, WorldState } from "./model";

const SEEDS = [72, 0x574f52, 2026] as const;
export function createDemoWorld(cycle = 0): WorldState {
  return createWorld({ mode: "alliance", seed: SEEDS[cycle % SEEDS.length] });
}
export function demoCommands(world: WorldState): Record<PlayerId, PlayerCommand> {
  return { gold: companionCommand(world, "gold"), cyan: companionCommand(world, "cyan") };
}

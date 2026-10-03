import { DIRECTION_VECTOR, NEUTRAL_COMMAND, TILE_SIZE, type Direction, type PlayerCommand, type WorldState } from "./model";
import { PLAYER_RADIUS, PLAYER_SPEED, isWall } from "./collision";
import { navigationStep } from "./navigation";

function cardinalToward(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
}

export function companionCommand(world: WorldState): PlayerCommand {
  const companion = world.players.cyan;
  if (!companion.alive || world.phase === "entry" || world.phase === "transition") return NEUTRAL_COMMAND;

  const target = world.gaoler?.visible
    ? world.gaoler
    : world.riftwing
      ? world.riftwing
      : world.enemies.reduce<(typeof world.enemies)[number] | null>((nearest, enemy) => {
          if (!nearest) return enemy;
          const currentDistance = (enemy.x - companion.x) ** 2 + (enemy.y - companion.y) ** 2;
          const nearestDistance = (nearest.x - companion.x) ** 2 + (nearest.y - companion.y) ** 2;
          return currentDistance < nearestDistance ? enemy : nearest;
        }, null);

  if (!target) return NEUTRAL_COMMAND;
  const dx = target.x - companion.x;
  const dy = target.y - companion.y;
  const aim = cardinalToward(dx, dy);
  const vector = DIRECTION_VECTOR[aim];
  const aligned = Math.abs(dx) < TILE_SIZE * 0.42 || Math.abs(dy) < TILE_SIZE * 0.42;
  let clear = aligned;
  for (let step = 0; step < Math.max(Math.abs(dx), Math.abs(dy)); step += TILE_SIZE / 2) {
    if (isWall(world.maze, companion.x + vector.x * step, companion.y + vector.y * step)) clear = false;
  }
  const route = clear ? null : navigationStep(world.maze, companion, target, PLAYER_RADIUS, PLAYER_SPEED, world.gateCooldownTicks === 0);
  return {
    move: clear ? aim : route?.direction ?? null,
    fire: clear && companion.shotId === null && world.tick % 18 === 0,
    aim: clear,
    pause: false
  };
}

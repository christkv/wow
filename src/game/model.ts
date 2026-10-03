export const LOGICAL_WIDTH = 640;
export const LOGICAL_HEIGHT = 360;
export const TILE_SIZE = 16;
// Moving actors fit one corridor tile; glow and weapons remain decorative.
export const ACTOR_DISPLAY_SIZE = TILE_SIZE;
export const TICKS_PER_SECOND = 60;

export type Direction = "north" | "east" | "south" | "west";
export type PlayerId = "gold" | "cyan";
export type GameMode = "solo" | "classic" | "alliance" | "practice";
export type EnemyKind = "prowler" | "veilmaw" | "ravager";
export type Phase = "entry" | "clear" | "riftwing" | "gaoler" | "transition" | "game-over";
export type CombatProfile = "legacy" | "slower" | "readable" | "balanced";

export interface Vector {
  readonly x: number;
  readonly y: number;
}

export const DIRECTION_VECTOR: Readonly<Record<Direction, Vector>> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

export interface PlayerCommand {
  readonly move: Direction | null;
  readonly fire: boolean;
  readonly aim: boolean;
  readonly pause: boolean;
}

export const NEUTRAL_COMMAND: PlayerCommand = {
  move: null,
  fire: false,
  aim: false,
  pause: false
};

export interface MazeDefinition {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly walls: readonly (readonly boolean[])[];
  readonly playerSpawns: Readonly<Record<PlayerId, Vector>>;
  readonly enemySpawns: readonly Vector[];
  readonly gateRow: number;
}

export interface PlayerState {
  readonly id: PlayerId;
  x: number;
  y: number;
  facing: Direction;
  lives: number;
  score: number;
  alive: boolean;
  respawnTicks: number;
  shotId: number | null;
  fireBufferUntil: number;
  invulnerableTicks: number;
}

export interface EnemyState {
  readonly id: number;
  kind: EnemyKind;
  tier: 0 | 1 | 2;
  x: number;
  y: number;
  facing: Direction;
  decisionTicks: number;
  fireCooldownTicks: number;
  windupTicks: number;
  fireDirection: Direction | null;
  arrivalTicks: number;
  cloaked: boolean;
}

export interface ProjectileState {
  readonly id: number;
  readonly ownerType: "player" | "enemy" | "gaoler";
  readonly ownerId: PlayerId | number | "gaoler";
  x: number;
  y: number;
  direction: Direction;
  ttlTicks: number;
  readonly speed: number;
}

export interface RiftwingState {
  x: number;
  y: number;
  facing: Direction;
  targetGate: "left" | "right";
}

export interface GaolerState {
  x: number;
  y: number;
  visible: boolean;
  cycleTicks: number;
  hasFired: boolean;
  fireDirection: Direction | null;
}

export interface WorldState {
  readonly mode: GameMode;
  readonly seed: number;
  readonly combatProfile: CombatProfile;
  remainingChains: number;
  tick: number;
  rngState: number;
  dungeon: number;
  maze: MazeDefinition;
  phase: Phase;
  phaseTicks: number;
  objective: string;
  multiplier: 1 | 2;
  nextDouble: boolean;
  gateCooldownTicks: number;
  players: Record<PlayerId, PlayerState>;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  riftwing: RiftwingState | null;
  gaoler: GaolerState | null;
  nextEntityId: number;
}

export type GameEventType =
  | "shot"
  | "enemy-shot"
  | "enemy-windup"
  | "gaoler-windup"
  | "wall-impact"
  | "enemy-hit"
  | "player-hit"
  | "friendly-fire"
  | "cloak"
  | "reveal"
  | "transform"
  | "gate"
  | "riftwing-spawn"
  | "riftwing-caught"
  | "riftwing-escaped"
  | "gaoler-arrive"
  | "gaoler-fire"
  | "gaoler-hit"
  | "dungeon-start"
  | "dungeon-clear"
  | "game-over";

export interface GameEvent {
  readonly type: GameEventType;
  readonly x?: number;
  readonly y?: number;
  readonly player?: PlayerId;
  readonly value?: number;
}

export interface WorldOptions {
  readonly mode: GameMode;
  readonly seed?: number;
  readonly enemyCount?: number;
  readonly combatProfile?: CombatProfile;
}

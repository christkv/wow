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
  readonly fireHeld?: boolean;
  readonly aim: boolean;
  readonly pause: boolean;
  readonly bomb?: boolean;
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
  readonly piercing?: boolean;
  readonly weapon?: PickupEffectKind;
  bouncesRemaining?: number;
  hitEnemyIds?: number[];
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

export type PickupEffectKind = "twin" | "piercing" | "bomb" | "shield" | "crossfire" | "burst" | "ricochet" | "speed" | "rapid";
export type PickupOutcome = PickupEffectKind | "brute";
export interface PickupBox extends Vector {
  kind: "supply" | "cursed";
  outcome: PickupOutcome;
}
export interface PickupEffect {
  kind: PickupEffectKind;
  owner: PlayerId;
  ticks: number;
  duration: number;
  rapidNextTick?: number;
  burst?: { remaining: number; nextTick: number; direction: Direction };
}
export interface BruteState {
  id: number;
  x: number;
  y: number;
  facing: Direction;
  health: number;
  arrivalTicks: number;
  ticks: number;
}
export interface PickupState {
  readonly enabled: boolean;
  rngState: number;
  nextSpawnTicks: number;
  box: PickupBox | null;
  effect: PickupEffect | null;
  brute: BruteState | null;
  blast: { cells: Vector[]; ticks: number } | null;
}

export interface MapRotation {
  readonly enabled: boolean;
  rngState: number;
  remaining: number[];
  previous: number | null;
}

export interface WorldState {
  readonly mode: GameMode;
  readonly seed: number;
  readonly combatProfile: CombatProfile;
  readonly mapRotation: MapRotation;
  readonly friendlyFire: boolean;
  remainingChains: number;
  pickups: PickupState;
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
  | "box-spawn"
  | "box-collected"
  | "effect-expired"
  | "shield-hit"
  | "bomb"
  | "brute-arrive"
  | "brute-hit"
  | "brute-killed"
  | "brute-expired"
  | "shot"
  | "enemy-shot"
  | "enemy-windup"
  | "gaoler-windup"
  | "wall-impact"
  | "enemy-hit"
  | "enemy-killed"
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
  readonly effect?: PickupOutcome;
}

export interface WorldOptions {
  readonly mode: GameMode;
  readonly seed?: number;
  readonly enemyCount?: number;
  readonly pickups?: boolean;
  readonly randomMaps?: boolean;
  readonly friendlyFire?: boolean;
  readonly combatProfile?: CombatProfile;
}

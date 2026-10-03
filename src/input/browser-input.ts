import { NEUTRAL_COMMAND, type Direction, type GameMode, type PlayerCommand, type PlayerId } from "../game/model";

interface KeyProfile {
  readonly north: readonly string[];
  readonly east: readonly string[];
  readonly south: readonly string[];
  readonly west: readonly string[];
  readonly fire: readonly string[];
  readonly aim: readonly string[];
}

interface HapticActuator {
  playEffect(
    type: "dual-rumble",
    parameters: { duration: number; strongMagnitude: number; weakMagnitude: number }
  ): Promise<unknown>;
}

const GOLD_KEYS: KeyProfile = {
  north: ["KeyW"],
  east: ["KeyD"],
  south: ["KeyS"],
  west: ["KeyA"],
  fire: ["KeyF", "Space"],
  aim: ["KeyG"]
};

const CYAN_KEYS: KeyProfile = {
  north: ["ArrowUp"],
  east: ["ArrowRight"],
  south: ["ArrowDown"],
  west: ["ArrowLeft"],
  fire: ["Slash", "Enter"],
  aim: ["Period"]
};

const CONTROL_KEYS = new Set([
  ...Object.values(GOLD_KEYS).flat(),
  ...Object.values(CYAN_KEYS).flat(),
  "Escape",
  "KeyP"
]);

function firstDirection(profile: KeyProfile, held: ReadonlySet<string>): Direction | null {
  if (profile.north.some((key) => held.has(key))) return "north";
  if (profile.south.some((key) => held.has(key))) return "south";
  if (profile.west.some((key) => held.has(key))) return "west";
  if (profile.east.some((key) => held.has(key))) return "east";
  return null;
}

function pressedAny(keys: readonly string[], pressed: ReadonlySet<string>): boolean {
  return keys.some((key) => pressed.has(key));
}

function padDirection(pad: Gamepad): Direction | null {
  if (pad.buttons[12]?.pressed) return "north";
  if (pad.buttons[13]?.pressed) return "south";
  if (pad.buttons[14]?.pressed) return "west";
  if (pad.buttons[15]?.pressed) return "east";
  const x = pad.axes[0] ?? 0;
  const y = pad.axes[1] ?? 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.25) return null;
  if (Math.abs(x) > Math.abs(y) * 1.12) return x > 0 ? "east" : "west";
  return y > 0 ? "south" : "north";
}

function mergeDirection(primary: Direction | null, secondary: Direction | null): Direction | null {
  return secondary ?? primary;
}

export class BrowserInput {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly previousPadButtons = new Map<number, boolean[]>();
  private readonly assignedPads: Record<PlayerId, number | null> = { gold: null, cyan: null };
  private disconnected = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!event.repeat) this.pressed.add(event.code);
    this.held.add(event.code);
    if (CONTROL_KEYS.has(event.code)) event.preventDefault();
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
    if (CONTROL_KEYS.has(event.code)) event.preventDefault();
  };

  public constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  public commands(mode: GameMode): Record<PlayerId, PlayerCommand> {
    const pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => pad !== null && pad.connected);
    const byIndex = new Map(pads.map((pad) => [pad.index, pad]));
    this.updateAssignments(mode, pads, byIndex);
    const goldPad = this.assignedPads.gold === null ? null : byIndex.get(this.assignedPads.gold) ?? null;
    const cyanPad = this.assignedPads.cyan === null ? null : byIndex.get(this.assignedPads.cyan) ?? null;
    const gold = this.commandFor(GOLD_KEYS, goldPad);
    const cyan = mode === "solo" ? NEUTRAL_COMMAND : this.commandFor(CYAN_KEYS, cyanPad);
    this.pressed.clear();
    for (const pad of pads) this.previousPadButtons.set(pad.index, pad.buttons.map((button) => button.pressed));
    return { gold, cyan };
  }

  public consumeDisconnect(): boolean {
    const disconnected = this.disconnected;
    this.disconnected = false;
    return disconnected;
  }

  public rumble(id: PlayerId, duration: number, strongMagnitude: number, weakMagnitude: number): void {
    const index = this.assignedPads[id];
    if (index === null) return;
    const pad = navigator.getGamepads?.()[index] as (Gamepad & { vibrationActuator?: HapticActuator }) | null | undefined;
    const actuator = pad?.vibrationActuator;
    if (!actuator) return;
    void actuator.playEffect("dual-rumble", {
      duration: Math.min(500, Math.max(0, duration)),
      strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
      weakMagnitude: Math.min(1, Math.max(0, weakMagnitude))
    }).catch(() => undefined);
  }

  private updateAssignments(mode: GameMode, pads: readonly Gamepad[], byIndex: ReadonlyMap<number, Gamepad>): void {
    for (const id of ["gold", "cyan"] as const) {
      const assigned = this.assignedPads[id];
      if (assigned !== null && !byIndex.has(assigned)) {
        this.assignedPads[id] = null;
        this.previousPadButtons.delete(assigned);
        this.disconnected = true;
      }
    }
    if (mode === "solo") this.assignedPads.cyan = null;
    const used = new Set(Object.values(this.assignedPads).filter((index): index is number => index !== null));
    const available = pads.filter((pad) => !used.has(pad.index));
    if (this.assignedPads.gold === null) this.assignedPads.gold = available.shift()?.index ?? null;
    if (mode !== "solo" && this.assignedPads.cyan === null) this.assignedPads.cyan = available.shift()?.index ?? null;
  }

  private commandFor(profile: KeyProfile, pad: Gamepad | null): PlayerCommand {
    const previous = pad ? this.previousPadButtons.get(pad.index) ?? [] : [];
    const padPressed = (index: number): boolean => Boolean(pad?.buttons[index]?.pressed && !previous[index]);
    return {
      move: mergeDirection(firstDirection(profile, this.held), pad ? padDirection(pad) : null),
      fire: pressedAny(profile.fire, this.pressed) || padPressed(0),
      aim: pressedAny(profile.aim, this.held) || Boolean(pad?.buttons[2]?.pressed),
      pause: this.pressed.has("Escape") || this.pressed.has("KeyP") || padPressed(9)
    };
  }
}

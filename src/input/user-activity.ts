export const ATTRACT_IDLE_MS = 20_000;
export const ATTRACT_DEMO_MS = 30_000;
export interface HeldInput { keys?: string[]; pointers?: number[] }

export function gamepadActive(pads: readonly (Gamepad | null)[]): boolean {
  return pads.some(pad => pad?.connected && (pad.buttons.some(button => button.pressed)
    || pad.axes.some(axis => Math.abs(axis) > .3)));
}

/** Owns native activity listeners only for the lifetime of its scene. */
export class UserActivity {
  private lastActivity = performance.now();
  private keys = new Set<string>();
  private pointers = new Set<number>();
  private readonly events = ["keydown", "keyup", "pointerdown", "pointerup", "pointercancel", "pointermove", "wheel"] as const;
  private readonly onInput = (event: Event): void => {
    if (event instanceof KeyboardEvent) {
      if (event.type === "keydown") this.keys.add(event.code);
      else this.keys.delete(event.code);
    }
    if (event instanceof PointerEvent) {
      if (event.type === "pointerdown") this.pointers.add(event.pointerId);
      if (event.type === "pointerup" || event.type === "pointercancel") this.pointers.delete(event.pointerId);
    }
    this.reset();
    if (this.wake?.(this.heldInput())) {
      // The wake-up press belongs to the demo; don't also activate the next scene.
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  private readonly onBlur = (): void => { this.keys.clear(); this.pointers.clear(); this.reset(); };
  private readonly onVisibility = (): void => { this.onBlur(); };

  public constructor(private readonly wake?: (held: HeldInput) => boolean, held: HeldInput = {}) {
    this.keys = new Set(held.keys); this.pointers = new Set(held.pointers);
    for (const name of this.events) window.addEventListener(name, this.onInput, { capture: true, passive: false });
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("focus", this.onVisibility);
    document.addEventListener("visibilitychange", this.onVisibility);
  }
  public reset(): void { this.lastActivity = performance.now(); }
  public heldInput(): HeldInput { return { keys: [...this.keys], pointers: [...this.pointers] }; }
  public held(): boolean {
    return this.keys.size > 0 || this.pointers.size > 0 || gamepadActive(Array.from(navigator.getGamepads?.() ?? []));
  }
  public idleMs(): number {
    const pad = gamepadActive(Array.from(navigator.getGamepads?.() ?? []));
    if (pad) this.wake?.(this.heldInput());
    if (this.held() || document.hidden || !document.hasFocus()) this.reset();
    return performance.now() - this.lastActivity;
  }
  public destroy(): void {
    for (const name of this.events) window.removeEventListener(name, this.onInput, true);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("focus", this.onVisibility);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}

// Curated from the same production atlas as the creatures and maze.
// Keep original transparent pixels and use nearest-neighbor sampling in both renderers.
import mysteryBox from "../../assets/art/tiles/cells/tile-r0-c2.png?url";
import twin from "../../assets/art/ui/icons/icon-r2-c4.png?url";
import piercing from "../../assets/art/ui/icons/icon-r2-c5.png?url";
import bomb from "../../assets/art/ui/icons/icon-r2-c2.png?url";
import shield from "../../assets/art/ui/icons/icon-r2-c3.png?url";
import type { Direction, PickupEffectKind } from "../game/model";

export const OBJECT_IMAGE_ASSETS = {
  "mystery-box": mysteryBox, "item-twin": twin, "item-piercing": piercing,
  "item-bomb": bomb, "item-shield": shield
} as const;
export const EFFECT_TEXTURE: Record<PickupEffectKind, keyof typeof OBJECT_IMAGE_ASSETS> = {
  twin: "item-twin", piercing: "item-piercing", bomb: "item-bomb", shield: "item-shield"
};
export const BOX_COLOR = 0x19dcff;
export const BRUTE_TEXTURE = "ravager";
export function bruteFrame(direction: Direction, tick: number, arriving: boolean): number {
  return { south: 0, east: 1, north: 2, west: 3 }[direction] * 4 + (arriving ? 0 : Math.floor(tick / 18) % 2);
}

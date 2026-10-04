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
  twin: "item-twin", piercing: "item-piercing", bomb: "item-bomb", shield: "item-shield",
  crossfire: "item-twin", burst: "item-twin", ricochet: "item-piercing", speed: "item-shield", rapid: "item-twin"
};
export const BOX_COLOR = 0x19dcff;
export const BRUTE_TEXTURE = "ravager";
/** Small square highlights keep powered bolts in the existing pixel-art language. */
export function weaponPixels(kind: PickupEffectKind | undefined): readonly (readonly [number, number, number, number])[] {
  if (kind === "crossfire") return [[-1, -4, 2, 8], [-4, -1, 8, 2]];
  if (kind === "ricochet") return [[-3, -3, 6, 1], [-3, 2, 6, 1], [-3, -2, 1, 4], [2, -2, 1, 4]];
  if (kind === "burst" || kind === "rapid") return [[-1, -1, 2, 2]];
  return [];
}
export function bruteFrame(direction: Direction, tick: number, arriving: boolean): number {
  return { south: 0, east: 1, north: 2, west: 3 }[direction] * 4 + (arriving ? 0 : Math.floor(tick / 18) % 2);
}

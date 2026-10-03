import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, cycleVolume, normalizeSettings } from "../../src/persistence/settings";

describe("settings persistence contract", () => {
  it("falls back safely for missing or malformed records", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("bad")).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps and quantizes volumes while retaining valid toggles", () => {
    expect(normalizeSettings({
      musicVolume: 7,
      sfxVolume: 0.62,
      reducedFlash: true,
      highContrastRadar: true,
      haptics: false
    })).toEqual({
      musicVolume: 1,
      sfxVolume: 0.5,
      reducedFlash: true,
      highContrastRadar: true,
      haptics: false
    });
  });

  it("cycles volume steps in both directions", () => {
    expect(cycleVolume(0.5, 1)).toBe(0.75);
    expect(cycleVolume(1, 1)).toBe(0);
    expect(cycleVolume(0, -1)).toBe(1);
  });
});

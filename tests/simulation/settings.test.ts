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
      haptics: false,
      friendlyFire: true,
      randomMaps: false,
      crtScanlines: false
    });
  });

  it("migrates existing saves with both new options off and rejects malformed flags", () => {
    const old = normalizeSettings({ musicVolume: .75, haptics: false });
    expect(old).toMatchObject({ musicVolume: .75, haptics: false, randomMaps: false, crtScanlines: false });
    expect(normalizeSettings({ randomMaps: "yes", crtScanlines: 1 })).toMatchObject({ randomMaps: false, crtScanlines: false });
    expect(normalizeSettings({ randomMaps: true, crtScanlines: true })).toMatchObject({ randomMaps: true, crtScanlines: true });
  });

  it("defaults friendly fire on, retains opt-out, and rejects malformed values", () => {
    expect(normalizeSettings({}).friendlyFire).toBe(true);
    expect(normalizeSettings({ friendlyFire: false }).friendlyFire).toBe(false);
    expect(normalizeSettings({ friendlyFire: "false" }).friendlyFire).toBe(true);
  });

  it("cycles volume steps in both directions", () => {
    expect(cycleVolume(0.5, 1)).toBe(0.75);
    expect(cycleVolume(1, 1)).toBe(0);
    expect(cycleVolume(0, -1)).toBe(1);
  });
});

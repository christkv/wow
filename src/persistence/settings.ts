export interface GameSettings {
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly reducedFlash: boolean;
  readonly highContrastRadar: boolean;
  readonly haptics: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.25,
  sfxVolume: 0.5,
  reducedFlash: false,
  highContrastRadar: false,
  haptics: true
};

const STORAGE_KEY = "worbound.settings.v1";

function volume(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(1, Math.max(0, value)) * 4) / 4;
}

export function normalizeSettings(value: unknown): GameSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const record = value as Partial<Record<keyof GameSettings, unknown>>;
  return {
    musicVolume: volume(record.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: volume(record.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    reducedFlash: typeof record.reducedFlash === "boolean" ? record.reducedFlash : DEFAULT_SETTINGS.reducedFlash,
    highContrastRadar: typeof record.highContrastRadar === "boolean" ? record.highContrastRadar : DEFAULT_SETTINGS.highContrastRadar,
    haptics: typeof record.haptics === "boolean" ? record.haptics : DEFAULT_SETTINGS.haptics
  };
}

export function loadSettings(): GameSettings {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Persistence is optional. The live settings remain effective for this page.
  }
}

export function cycleVolume(value: number, direction: -1 | 1): number {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const current = Math.max(0, steps.indexOf(volume(value, 0)));
  return steps[(current + direction + steps.length) % steps.length] ?? 0;
}

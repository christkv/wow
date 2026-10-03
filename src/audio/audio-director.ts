import type Phaser from "phaser";
import type { GameEvent } from "../game/model";
import type { GameSettings } from "../persistence/settings";

const EVENT_CUES: Partial<Record<GameEvent["type"], string>> = {
  "enemy-shot": "enemy-shot",
  "enemy-windup": "reveal",
  "gaoler-windup": "reveal",
  "wall-impact": "wall-impact",
  "enemy-hit": "enemy-hit",
  "player-hit": "player-hit",
  "friendly-fire": "player-hit",
  cloak: "cloak",
  reveal: "reveal",
  transform: "transform",
  "riftwing-spawn": "riftwing-spawn",
  "riftwing-caught": "riftwing-caught",
  "riftwing-escaped": "riftwing-escaped",
  "gaoler-arrive": "gaoler-arrive",
  "gaoler-fire": "gaoler-fire",
  "gaoler-hit": "gaoler-hit",
  "dungeon-start": "dungeon-start",
  "game-over": "game-over"
};

export class AudioDirector {
  private music: Phaser.Sound.BaseSound | null = null;

  public constructor(private readonly scene: Phaser.Scene, private readonly settings: GameSettings) {}

  public startDungeonMusic(): void {
    if (this.music?.isPlaying) return;
    this.music = this.scene.sound.add("music-dungeon", { loop: true, volume: this.settings.musicVolume });
    this.music.play();
  }

  public handle(events: readonly GameEvent[]): void {
    for (const event of events) {
      const key = event.type === "shot"
        ? event.player === "cyan" ? "shot-cyan" : "shot-gold"
        : EVENT_CUES[event.type];
      if (!key || !this.scene.cache.audio.exists(key)) continue;
      const charging = event.type === "enemy-windup" || event.type === "gaoler-windup";
      this.scene.sound.play(key, { volume: this.settings.sfxVolume * (charging ? 0.45 : 1), rate: charging ? 1.6 : 1 });
    }
  }

  public setPaused(paused: boolean): void {
    if (!this.music) return;
    if (paused && this.music.isPlaying) this.music.pause();
    if (!paused && this.music.isPaused) this.music.resume();
  }

  public destroy(): void {
    this.music?.destroy();
    this.music = null;
  }
}

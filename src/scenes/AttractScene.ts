import Phaser from "phaser";
import { OBJECT_IMAGE_ASSETS } from "../presentation/art";
import type { GameMode } from "../game/model";
import { GAME_AUDIO_ASSETS, GAME_IMAGE_ASSETS } from "../runtime-assets";
import { cycleVolume, loadSettings, saveSettings, type GameSettings } from "../persistence/settings";

interface ModeOption {
  readonly mode: GameMode;
  readonly title: string;
  readonly detail: string;
  readonly color: string;
}

const MODES: readonly ModeOption[] = [
  { mode: "solo", title: "SOLO + AI", detail: "YOU ARE GOLD. CYAN COVERS YOU.", color: "#ffca28" },
  { mode: "alliance", title: "2P ALLIANCE", detail: "LOCAL CO-OP. FRIENDLY FIRE OFF.", color: "#19dcff" },
  { mode: "classic", title: "2P CLASSIC", detail: "LOCAL RIVALS. FRIENDLY FIRE ON.", color: "#f02dce" },
  { mode: "practice", title: "PRACTICE", detail: "INFINITE RESERVES. LEARN THE PULSE.", color: "#f4fbff" }
];

export class AttractScene extends Phaser.Scene {
  private selected = 0;
  private modeTexts: Phaser.GameObjects.Text[] = [];
  private detailText!: Phaser.GameObjects.Text;
  private music: Phaser.Sound.BaseSound | null = null;
  private leaving = false;
  private assetsReady = false;
  private pendingStart = false;
  private loadingText!: Phaser.GameObjects.Text;
  private settings!: GameSettings;
  private settingsOpen = false;
  private settingsIndex = 0;
  private settingsPanel!: Phaser.GameObjects.Container;
  private settingsTexts: Phaser.GameObjects.Text[] = [];

  public constructor() {
    super("Attract");
  }

  public create(): void {
    this.leaving = false;
    this.pendingStart = false;
    this.settingsOpen = false;
    this.settingsIndex = 0;
    this.settings = loadSettings();
    this.modeTexts = [];
    this.music?.destroy();
    this.music = null;
    this.add.image(320, 180, "attract").setDisplaySize(640, 360);
    this.add.rectangle(320, 278, 620, 148, 0x03040b, 0.88).setStrokeStyle(1, 0x19dcff, 0.65);
    this.add.text(320, 211, "CHOOSE YOUR DESCENT", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "10px", color: "#f4fbff"
    }).setOrigin(0.5);

    this.modeTexts = MODES.map((option, index) => {
      const x = 90 + index * 153;
      const text = this.add.text(x, 249, option.title, {
        fontFamily: '"Press Start 2P", monospace', fontSize: "8px", color: option.color,
        backgroundColor: "#07152bcc", padding: { x: 8, y: 9 }, align: "center"
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on("pointerover", () => this.select(index));
      text.on("pointerdown", () => this.startSelected());
      return text;
    });

    this.detailText = this.add.text(320, 290, "", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "7px", color: "#a9cbe8", align: "center"
    }).setOrigin(0.5);
    this.loadingText = this.add.text(320, 306, "LOADING DUNGEON 0%", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "5px", color: "#7540d8"
    }).setOrigin(0.5);
    this.add.text(320, 321, "↑↓ / A D SELECT   ENTER / FIRE START", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "6px", color: "#54627a"
    }).setOrigin(0.5);
    this.add.text(320, 343, "P1 WASD F E-BOMB   P2 ARROWS / RSHIFT-BOMB   PAD A/B", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "5px", color: "#19dcff"
    }).setOrigin(0.5);
    const fullscreen = this.add.text(624, 344, "[ X ] FULL", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "5px", color: "#7540d8"
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    fullscreen.on("pointerdown", () => this.toggleFullscreen());
    const settings = this.add.text(16, 344, "[ O ] OPTIONS", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "5px", color: "#7540d8"
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    settings.on("pointerdown", () => this.toggleSettings());
    this.createSettingsPanel();
    this.refreshSelection();

    const status = document.querySelector<HTMLElement>("#status");
    if (status) status.textContent = "Choose a game mode: Solo, Alliance, Classic, or Practice.";

    this.music = this.sound.add("music-attract", { loop: true, volume: this.settings.musicVolume });
    this.music.play();
    this.queueGameAssets();

    this.input.keyboard?.on("keydown-UP", () => this.navigateVertical(-1));
    this.input.keyboard?.on("keydown-W", () => this.navigateVertical(-1));
    this.input.keyboard?.on("keydown-LEFT", () => this.navigateHorizontal(-1));
    this.input.keyboard?.on("keydown-A", () => this.navigateHorizontal(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.navigateVertical(1));
    this.input.keyboard?.on("keydown-S", () => this.navigateVertical(1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.navigateHorizontal(1));
    this.input.keyboard?.on("keydown-D", () => this.navigateHorizontal(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.activateSelection());
    this.input.keyboard?.on("keydown-SPACE", () => this.activateSelection());
    this.input.keyboard?.on("keydown-ONE", () => { if (!this.settingsOpen) this.startMode(0); });
    this.input.keyboard?.on("keydown-TWO", () => { if (!this.settingsOpen) this.startMode(1); });
    this.input.keyboard?.on("keydown-THREE", () => { if (!this.settingsOpen) this.startMode(2); });
    this.input.keyboard?.on("keydown-FOUR", () => { if (!this.settingsOpen) this.startMode(3); });
    this.input.keyboard?.on("keydown-X", () => this.toggleFullscreen());
    this.input.keyboard?.on("keydown-O", () => this.toggleSettings());
    this.input.keyboard?.on("keydown-ESC", () => { if (this.settingsOpen) this.toggleSettings(); });
    this.input.gamepad?.on("down", (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 12) this.navigateVertical(-1);
      else if (button.index === 13) this.navigateVertical(1);
      else if (button.index === 14) this.navigateHorizontal(-1);
      else if (button.index === 15) this.navigateHorizontal(1);
      else if (button.index === 0 || button.index === 9) this.activateSelection();
      else if (button.index === 1 && this.settingsOpen) this.toggleSettings();
      else if (button.index === 3) this.toggleSettings();
    });
  }

  private navigateVertical(direction: -1 | 1): void {
    if (this.settingsOpen) {
      this.settingsIndex = (this.settingsIndex + direction + 6) % 6;
      this.refreshSettingsPanel();
    } else {
      this.select(this.selected + direction);
    }
  }

  private navigateHorizontal(direction: -1 | 1): void {
    if (this.settingsOpen) this.adjustSetting(direction);
    else this.select(this.selected + direction);
  }

  private activateSelection(): void {
    if (this.settingsOpen) {
      if (this.settingsIndex === 5) this.toggleSettings();
      else this.adjustSetting(1);
    } else {
      this.startSelected();
    }
  }

  private select(index: number): void {
    this.selected = (index + MODES.length) % MODES.length;
    this.refreshSelection();
    if (this.cache.audio.exists("ui-move")) this.sound.play("ui-move", { volume: 0.25 });
  }

  private refreshSelection(): void {
    this.modeTexts.forEach((text, index) => {
      const selected = index === this.selected;
      text.setScale(selected ? 1.08 : 1);
      text.setAlpha(selected ? 1 : 0.55);
      text.setStroke(selected ? "#f4fbff" : "#000000", selected ? 1 : 0);
    });
    const option = MODES[this.selected];
    if (option) this.detailText.setText(option.detail);
  }

  private startMode(index: number): void {
    this.selected = index;
    this.startSelected();
  }

  private startSelected(): void {
    if (this.leaving) return;
    const option = MODES[this.selected];
    if (!option) return;
    if (!this.assetsReady) {
      this.pendingStart = true;
      this.detailText.setText("PREPARING THE DUNGEON…");
      return;
    }
    this.leaving = true;
    this.music?.stop();
    this.scene.start("Game", { mode: option.mode });
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  private createSettingsPanel(): void {
    const backdrop = this.add.rectangle(320, 180, 520, 288, 0x03040b, 0.97)
      .setStrokeStyle(2, 0x7540d8, 1)
      .setInteractive();
    const title = this.add.text(320, 56, "OPTIONS", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "12px", color: "#f4fbff"
    }).setOrigin(0.5);
    this.settingsTexts = Array.from({ length: 6 }, (_value, index) => {
      const text = this.add.text(320, 94 + index * 31, "", {
        fontFamily: '"Press Start 2P", monospace', fontSize: "8px", color: "#a9cbe8",
        padding: { x: 10, y: 6 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on("pointerover", () => {
        this.settingsIndex = index;
        this.refreshSettingsPanel();
      });
      text.on("pointerdown", () => this.activateSelection());
      return text;
    });
    const help = this.add.text(320, 292, "↑↓ SELECT   ←→ CHANGE   A / ENTER APPLY   B / ESC BACK", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "5px", color: "#54627a"
    }).setOrigin(0.5);
    this.settingsPanel = this.add.container(0, 0, [backdrop, title, ...this.settingsTexts, help]).setVisible(false).setDepth(100);
    this.refreshSettingsPanel();
  }

  private toggleSettings(): void {
    this.settingsOpen = !this.settingsOpen;
    this.settingsPanel.setVisible(this.settingsOpen);
    if (this.settingsOpen) {
      this.settingsIndex = 0;
      this.refreshSettingsPanel();
      const status = document.querySelector<HTMLElement>("#status");
      if (status) status.textContent = "Options. Use up and down to select, left and right to change, and Escape to return.";
    } else {
      const status = document.querySelector<HTMLElement>("#status");
      if (status) status.textContent = "Choose a game mode: Solo, Alliance, Classic, or Practice.";
    }
  }

  private adjustSetting(direction: -1 | 1): void {
    const settings = this.settings;
    if (this.settingsIndex === 0) this.settings = { ...settings, musicVolume: cycleVolume(settings.musicVolume, direction) };
    else if (this.settingsIndex === 1) this.settings = { ...settings, sfxVolume: cycleVolume(settings.sfxVolume, direction) };
    else if (this.settingsIndex === 2) this.settings = { ...settings, reducedFlash: !settings.reducedFlash };
    else if (this.settingsIndex === 3) this.settings = { ...settings, highContrastRadar: !settings.highContrastRadar };
    else if (this.settingsIndex === 4) this.settings = { ...settings, haptics: !settings.haptics };
    else return;
    saveSettings(this.settings);
    const adjustable = this.music as (Phaser.Sound.BaseSound & { setVolume?: (value: number) => unknown }) | null;
    adjustable?.setVolume?.(this.settings.musicVolume);
    this.refreshSettingsPanel();
  }

  private refreshSettingsPanel(): void {
    if (this.settingsTexts.length !== 6) return;
    const percent = (value: number): string => `${Math.round(value * 100)}%`;
    const labels = [
      `MUSIC      ${percent(this.settings.musicVolume)}`,
      `SFX        ${percent(this.settings.sfxVolume)}`,
      `REDUCED FX ${this.settings.reducedFlash ? "ON" : "OFF"}`,
      `RADAR      ${this.settings.highContrastRadar ? "HIGH CONTRAST" : "CLASSIC"}`,
      `HAPTICS    ${this.settings.haptics ? "ON" : "OFF"}`,
      "BACK"
    ];
    this.settingsTexts.forEach((text, index) => {
      const selected = index === this.settingsIndex;
      text.setText(labels[index] ?? "");
      text.setColor(selected ? "#ffca28" : "#a9cbe8");
      text.setBackgroundColor(selected ? "#35207bcc" : "#00000000");
    });
  }

  private queueGameAssets(): void {
    this.assetsReady = Object.keys({ ...GAME_IMAGE_ASSETS, ...OBJECT_IMAGE_ASSETS }).every((key) => this.textures.exists(key))
      && Object.keys(GAME_AUDIO_ASSETS).every((key) => this.cache.audio.exists(key));
    if (this.assetsReady) {
      this.loadingText.setText("DUNGEON READY").setColor("#19dcff");
      return;
    }
    for (const [key, url] of Object.entries(GAME_IMAGE_ASSETS)) {
      if (!this.textures.exists(key)) this.load.spritesheet(key, url, { frameWidth: 64, frameHeight: 64 });
    }
    for (const [key, url] of Object.entries(OBJECT_IMAGE_ASSETS)) {
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
    for (const [key, urls] of Object.entries(GAME_AUDIO_ASSETS)) {
      if (!this.cache.audio.exists(key)) this.load.audio(key, [...urls]);
    }
    this.load.on("progress", (progress: number) => this.loadingText.setText(`LOADING DUNGEON ${Math.round(progress * 100)}%`));
    this.load.once("complete", () => {
      this.assetsReady = true;
      for (const key of Object.keys({ ...GAME_IMAGE_ASSETS, ...OBJECT_IMAGE_ASSETS })) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.loadingText.setText("DUNGEON READY").setColor("#19dcff");
      if (this.pendingStart) this.startSelected();
    });
    this.load.start();
  }
}

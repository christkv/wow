import Phaser from "phaser";
import { BOX_COLOR, BRUTE_TEXTURE, EFFECT_TEXTURE, bruteFrame } from "../presentation/art";
import { PixelEffects } from "../presentation/pixel-effects";
import { AudioDirector } from "../audio/audio-director";
import { companionCommand } from "../game/ai";
import {
  ACTOR_DISPLAY_SIZE,
  DIRECTION_VECTOR,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  TILE_SIZE,
  TICKS_PER_SECOND,
  type Direction,
  type EnemyState,
  type GameEvent,
  type GameMode,
  type PlayerId,
  type WorldState
} from "../game/model";
import { canPlayerFire, pickupStatus } from "../game/pickups";
import { createWorld, stepWorld } from "../game/simulation";
import { BrowserInput } from "../input/browser-input";
import { loadSettings, type GameSettings } from "../persistence/settings";

const MAZE_X = 48;
const MAZE_Y = 46;
const STEP_MS = 1000 / TICKS_PER_SECOND;
const ROW_BY_DIRECTION: Readonly<Record<Direction, number>> = { south: 0, east: 1, north: 2, west: 3 };
const COLOR = {
  black: 0x03040b,
  navy: 0x07152b,
  cobalt: 0x0b46a5,
  cyan: 0x19dcff,
  gold: 0xffca28,
  scarlet: 0xf03528,
  magenta: 0xf02dce,
  violet: 0x7540d8,
  white: 0xf4fbff,
  gray: 0x54627a
} as const;

function textStyle(size: number, color = "#f4fbff"): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: '"Press Start 2P", monospace', fontSize: `${size}px`, color };
}

export class GameScene extends Phaser.Scene {
  private mode: GameMode = "solo";
  private world!: WorldState;
  private browserInput!: BrowserInput;
  private audioDirector!: AudioDirector;
  private settings!: GameSettings;
  private accumulator = 0;
  private paused = false;
  private mazeGraphics!: Phaser.GameObjects.Graphics;
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private pickupGraphics!: Phaser.GameObjects.Graphics;
  private pickupText!: Phaser.GameObjects.Text;
  private radarGraphics!: Phaser.GameObjects.Graphics;
  private fxGraphics!: Phaser.GameObjects.Graphics;
  private objectiveText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private cyanText!: Phaser.GameObjects.Text;
  private dungeonText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private playerSprites = new Map<PlayerId, Phaser.GameObjects.Sprite>();
  private enemySprites = new Map<number, Phaser.GameObjects.Sprite>();
  private riftwingSprite: Phaser.GameObjects.Sprite | null = null;
  private gaolerSprite: Phaser.GameObjects.Sprite | null = null;
  private readonly fx = new PixelEffects();
  private boxSprite!: Phaser.GameObjects.Image;
  private itemIcon!: Phaser.GameObjects.Image;
  private bruteSprite!: Phaser.GameObjects.Sprite;
  private lastStatus = "";
  private readonly onVisibility = (): void => {
    if (document.hidden) this.setPaused(true);
  };
  private readonly onBlur = (): void => this.setPaused(true);

  public constructor() {
    super("Game");
  }

  public init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? "solo";
  }

  public create(): void {
    this.paused = false;
    this.accumulator = 0;
    this.playerSprites.clear();
    this.enemySprites.clear();
    this.riftwingSprite = null;
    this.gaolerSprite = null;
    this.fx.clear();
    this.world = createWorld({ mode: this.mode, seed: Date.now() & 0xffff_ffff });
    this.settings = loadSettings();
    this.browserInput = new BrowserInput();
    this.audioDirector = new AudioDirector(this, this.settings);
    this.audioDirector.startDungeonMusic();

    this.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, COLOR.black);
    this.add.rectangle(320, 174, 558, 270, COLOR.navy, 0.5).setStrokeStyle(1, COLOR.cobalt, 0.8);
    this.mazeGraphics = this.add.graphics();
    this.projectileGraphics = this.add.graphics();
    this.fxGraphics = this.add.graphics().setDepth(5);
    this.radarGraphics = this.add.graphics();
    this.pickupGraphics = this.add.graphics().setDepth(3);
    this.pickupText = this.add.text(320, 354, "", textStyle(6, "#76e5cd")).setOrigin(0.5).setDepth(4);

    this.goldText = this.add.text(10, 10, "", textStyle(7, "#ffca28"));
    this.cyanText = this.add.text(630, 10, "", textStyle(7, "#19dcff")).setOrigin(1, 0);
    this.dungeonText = this.add.text(320, 9, "", textStyle(7, "#a9cbe8")).setOrigin(0.5, 0);
    this.objectiveText = this.add.text(320, 27, "", textStyle(7)).setOrigin(0.5, 0);
    this.messageText = this.add.text(320, 306, "ESC / START PAUSE   R RESTART   M MENU", textStyle(5, "#54627a")).setOrigin(0.5);

    this.boxSprite = this.add.image(0, 0, "mystery-box").setDisplaySize(14, 14).setDepth(2).setVisible(false);
    this.itemIcon = this.add.image(0, 0, "item-twin").setDisplaySize(12, 12).setDepth(4).setVisible(false);
    this.bruteSprite = this.add.sprite(0, 0, BRUTE_TEXTURE, 0).setDisplaySize(ACTOR_DISPLAY_SIZE, ACTOR_DISPLAY_SIZE).setDepth(2).setVisible(false);
    this.createPlayerSprite("gold");
    this.createPlayerSprite("cyan");
    this.drawMaze();
    this.renderWorld();

    this.input.keyboard?.on("keydown-R", () => this.restartRun());
    this.input.keyboard?.on("keydown-M", () => this.scene.start("Attract"));
    this.input.keyboard?.on("keydown-X", () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });

    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onBlur);
    this.events.once("shutdown", () => this.cleanup());
  }

  public override update(_time: number, delta: number): void {
    this.accumulator += Math.min(delta, 100);
    let steps = 0;
    while (this.accumulator >= STEP_MS && steps < 5) {
      const commands = this.browserInput.commands(this.mode);
      if (this.mode === "solo") commands.cyan = companionCommand(this.world);
      if (this.browserInput.consumeDisconnect()) this.setPaused(true);

      const pausePressed = commands.gold.pause || commands.cyan.pause;
      // BrowserInput already emits a one-tick press edge for keyboard and pads.
      if (pausePressed) this.setPaused(!this.paused);

      if (!this.paused) this.fx.advance();
      if (this.world.phase === "game-over") {
        if (commands.gold.fire || commands.cyan.fire) this.restartRun();
      } else if (!this.paused) {
        const events = stepWorld(this.world, commands);
        this.handleEvents(events);
      }
      this.accumulator -= STEP_MS;
      steps += 1;
    }
    if (steps === 5) this.accumulator = 0;
    this.renderWorld();
  }

  private createPlayerSprite(id: PlayerId): void {
    const sprite = this.add.sprite(0, 0, `delver-${id}`, 0).setDisplaySize(ACTOR_DISPLAY_SIZE, ACTOR_DISPLAY_SIZE);
    this.playerSprites.set(id, sprite);
  }

  private renderWorld(): void {
    this.drawMaze();
    this.syncPlayers();
    this.syncEnemies();
    this.syncEncounterSprites();
    this.drawProjectiles();
    this.drawPickups();
    this.drawRadar();
    this.drawFx();
    this.drawHud();
  }

  private drawMaze(): void {
    const graphics = this.mazeGraphics;
    graphics.clear();
    graphics.fillStyle(COLOR.black, 0.92);
    graphics.fillRect(MAZE_X, MAZE_Y, this.world.maze.width * TILE_SIZE, this.world.maze.height * TILE_SIZE);
    graphics.lineStyle(1, COLOR.cobalt, 0.12);
    for (let x = 0; x <= this.world.maze.width; x += 1) {
      graphics.lineBetween(MAZE_X + x * TILE_SIZE, MAZE_Y, MAZE_X + x * TILE_SIZE, MAZE_Y + this.world.maze.height * TILE_SIZE);
    }
    for (let y = 0; y <= this.world.maze.height; y += 1) {
      graphics.lineBetween(MAZE_X, MAZE_Y + y * TILE_SIZE, MAZE_X + this.world.maze.width * TILE_SIZE, MAZE_Y + y * TILE_SIZE);
    }
    for (let y = 0; y < this.world.maze.height; y += 1) {
      for (let x = 0; x < this.world.maze.width; x += 1) {
        if (!this.world.maze.walls[y]?.[x]) continue;
        const px = MAZE_X + x * TILE_SIZE;
        const py = MAZE_Y + y * TILE_SIZE;
        graphics.fillStyle(COLOR.navy, 1);
        graphics.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        graphics.lineStyle(1, COLOR.cyan, 0.65);
        graphics.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
        graphics.fillStyle(COLOR.cobalt, 0.6);
        graphics.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }
    }
    const gateY = MAZE_Y + (this.world.maze.gateRow + 0.5) * TILE_SIZE;
    const gateColor = this.world.gateCooldownTicks === 0 ? COLOR.magenta : COLOR.gray;
    graphics.lineStyle(3, gateColor, 1);
    graphics.lineBetween(MAZE_X - 6, gateY - 7, MAZE_X - 6, gateY + 7);
    graphics.lineBetween(MAZE_X + this.world.maze.width * TILE_SIZE + 6, gateY - 7, MAZE_X + this.world.maze.width * TILE_SIZE + 6, gateY + 7);
  }

  private syncPlayers(): void {
    for (const id of ["gold", "cyan"] as const) {
      const state = this.world.players[id];
      const sprite = this.playerSprites.get(id);
      if (!sprite) continue;
      sprite.setPosition(MAZE_X + state.x, MAZE_Y + state.y);
      sprite.setVisible(state.alive);
      sprite.setAlpha(state.invulnerableTicks > 0 && this.world.tick % 8 < 4 ? 0.45 : 1);
      const movingFrame = Math.floor(this.world.tick / 8) % 2 === 0 ? 1 : 2;
      sprite.setFrame(ROW_BY_DIRECTION[state.facing] * 4 + (state.shotId === null ? movingFrame : 0));
    }
  }

  private syncEnemies(): void {
    const liveIds = new Set(this.world.enemies.map((enemy) => enemy.id));
    for (const [id, sprite] of this.enemySprites) {
      if (!liveIds.has(id)) {
        sprite.destroy();
        this.enemySprites.delete(id);
      }
    }
    for (const enemy of this.world.enemies) {
      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite || sprite.texture.key !== enemy.kind) {
        sprite?.destroy();
        sprite = this.add.sprite(0, 0, enemy.kind, 0).setDisplaySize(ACTOR_DISPLAY_SIZE, ACTOR_DISPLAY_SIZE);
        this.enemySprites.set(enemy.id, sprite);
      }
      this.setEnemySprite(sprite, enemy);
    }
  }

  private setEnemySprite(sprite: Phaser.GameObjects.Sprite, enemy: EnemyState): void {
    sprite.setPosition(MAZE_X + enemy.x, MAZE_Y + enemy.y);
    sprite.setFrame(ROW_BY_DIRECTION[enemy.facing] * 4 + (enemy.fireDirection || enemy.arrivalTicks > 0 ? 0 : Math.floor(this.world.tick / 10) % 2));
    sprite.setAlpha(enemy.arrivalTicks > 0 ? 0.5 : enemy.cloaked ? 0.13 : 1);
    sprite.setTint(enemy.fireDirection ? COLOR.gold : enemy.cloaked ? COLOR.magenta : COLOR.white);
  }

  private syncEncounterSprites(): void {
    if (this.world.riftwing) {
      this.riftwingSprite ??= this.add.sprite(0, 0, "riftwing", 0).setDisplaySize(ACTOR_DISPLAY_SIZE, ACTOR_DISPLAY_SIZE);
      this.riftwingSprite.setVisible(true);
      this.riftwingSprite.setPosition(MAZE_X + this.world.riftwing.x, MAZE_Y + this.world.riftwing.y);
      this.riftwingSprite.setFrame(ROW_BY_DIRECTION[this.world.riftwing.facing] * 4 + Math.floor(this.world.tick / 5) % 3);
    } else if (this.riftwingSprite) {
      this.riftwingSprite.setVisible(false);
    }

    if (this.world.gaoler) {
      this.gaolerSprite ??= this.add.sprite(0, 0, "gaoler", 1).setDisplaySize(43, 43);
      this.gaolerSprite.setVisible(this.world.gaoler.visible);
      this.gaolerSprite.setPosition(MAZE_X + this.world.gaoler.x, MAZE_Y + this.world.gaoler.y);
      this.gaolerSprite.setFrame((Math.floor(this.world.tick / 8) % 4) * 4 + (this.world.gaoler.hasFired ? 2 : 1));
    } else if (this.gaolerSprite) {
      this.gaolerSprite.setVisible(false);
    }
  }

  private drawProjectiles(): void {
    const graphics = this.projectileGraphics;
    graphics.clear();
    for (const enemy of this.world.enemies) {
      if (enemy.fireDirection) this.drawCharge(graphics, enemy.x, enemy.y, enemy.fireDirection);
      if (enemy.arrivalTicks > 0) {
        graphics.lineStyle(1, COLOR.white, 0.8);
        graphics.strokeCircle(MAZE_X + enemy.x, MAZE_Y + enemy.y, 6 + enemy.arrivalTicks / 6);
      }
    }
    const gaoler = this.world.gaoler;
    if (gaoler?.visible && gaoler.fireDirection && !gaoler.hasFired) this.drawCharge(graphics, gaoler.x, gaoler.y, gaoler.fireDirection);
    for (const player of Object.values(this.world.players)) {
      if (!player.alive || !canPlayerFire(this.world, player.id)) continue;
      graphics.fillStyle(player.id === "gold" ? COLOR.gold : COLOR.cyan, 0.9);
      graphics.fillRect(MAZE_X + player.x - 2, MAZE_Y + player.y + 9, 4, 1);
    }
    for (const projectile of this.world.projectiles) {
      const color = projectile.ownerType === "gaoler"
        ? COLOR.violet
        : projectile.ownerType === "enemy"
          ? COLOR.scarlet
          : projectile.ownerId === "cyan" ? COLOR.cyan : COLOR.gold;
      const x = MAZE_X + projectile.x;
      const y = MAZE_Y + projectile.y;
      const v = DIRECTION_VECTOR[projectile.direction];
      graphics.lineStyle(1, color, 0.55);
      graphics.lineBetween(x - v.x * 7, y - v.y * 7, x, y);
      graphics.fillStyle(color, 1);
      if (projectile.ownerType === "player") {
        graphics.fillRect(x - (v.x ? 3 : 1), y - (v.y ? 3 : 1), v.x ? 6 : 2, v.y ? 6 : 2);
      } else {
        graphics.fillTriangle(x, y - 3, x + 3, y, x, y + 3);
        graphics.fillTriangle(x, y - 3, x - 3, y, x, y + 3);
      }
    }
  }

  private drawPickups(): void {
    const g = this.pickupGraphics;
    g.clear();
    const { box, effect, brute, blast } = this.world.pickups;
    this.boxSprite.setVisible(Boolean(box));
    this.bruteSprite.setVisible(Boolean(brute));
    if (box) {
      const x = MAZE_X + box.x, y = MAZE_Y + box.y;
      this.boxSprite.setPosition(Math.round(x), Math.round(y));
      g.fillStyle(BOX_COLOR, 1); g.fillRect(x - 6, y + 8, Math.ceil(12 * box.ticks / 600), 1);
    }
    if (effect) {
      const owner = this.world.players[effect.owner], x = MAZE_X + owner.x, y = MAZE_Y + owner.y;
      g.lineStyle(1, effect.kind === "shield" ? 0x76e5cd : COLOR.white, .9);
      if (effect.kind === "shield") g.strokeCircle(x, y, 7);

      g.fillStyle(effect.owner === "gold" ? COLOR.gold : COLOR.cyan, 1);
      g.fillRect(x - 6, y - 10, 12 * effect.ticks / effect.duration, 2);
    }
    if (brute) {
      const x = MAZE_X + brute.x, y = MAZE_Y + brute.y;
      if (brute.arrivalTicks > 0) {
        g.lineStyle(1, COLOR.magenta, 1); g.strokeCircle(x, y, 7 + brute.arrivalTicks / 10);
        g.lineBetween(x - 5, y - 5, x + 5, y + 5); g.lineBetween(x + 5, y - 5, x - 5, y + 5);
      } else {
        g.fillStyle(COLOR.magenta, 1);
        for (let i = 0; i < brute.health; i++) g.fillRect(x - 5 + i * 4, y - 9, 3, 2);
      }
      this.bruteSprite.setPosition(Math.round(x), Math.round(y));
      this.bruteSprite.setFrame(bruteFrame(brute.facing, this.world.tick, brute.arrivalTicks > 0));
      this.bruteSprite.setAlpha(brute.arrivalTicks > 0 ? .35 : 1);
    }

    if (blast) for (const cell of blast.cells) {
      g.fillStyle(COLOR.gold, (this.settings.reducedFlash ? .15 : .4) * blast.ticks / 18);
      g.fillRect(MAZE_X + cell.x - 7, MAZE_Y + cell.y - 7, 14, 14);
    }
  }

  private drawCharge(graphics: Phaser.GameObjects.Graphics, x: number, y: number, direction: Direction): void {
    const v = DIRECTION_VECTOR[direction], px = MAZE_X + x, py = MAZE_Y + y;
    graphics.lineStyle(1, COLOR.gold, 1);
    graphics.strokeCircle(px, py, 7);
    graphics.lineBetween(px + v.x * 8, py + v.y * 8, px + v.x * 14, py + v.y * 14);
    graphics.lineBetween(px + v.x * 14, py + v.y * 14, px + v.x * 11 - v.y * 3, py + v.y * 11 + v.x * 3);
    graphics.lineBetween(px + v.x * 14, py + v.y * 14, px + v.x * 11 + v.y * 3, py + v.y * 11 - v.x * 3);
  }

  private drawRadar(): void {
    const graphics = this.radarGraphics;
    const x = 250;
    const y = 313;
    const width = 140;
    const height = 34;
    graphics.clear();
    graphics.fillStyle(this.settings.highContrastRadar ? COLOR.black : COLOR.navy, 0.95);
    graphics.fillRect(x, y, width, height);
    graphics.lineStyle(this.settings.highContrastRadar ? 2 : 1, this.settings.highContrastRadar ? COLOR.white : COLOR.cyan, 0.9);
    graphics.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    graphics.lineStyle(1, COLOR.cobalt, 0.35);
    graphics.lineBetween(x + width / 2, y + 2, x + width / 2, y + height - 2);
    const plot = (worldX: number, worldY: number, color: number, radius: number): void => {
      if (this.settings.highContrastRadar) {
        graphics.lineStyle(1, COLOR.white, 1);
        graphics.strokeCircle(x + worldX / (this.world.maze.width * TILE_SIZE) * width, y + worldY / (this.world.maze.height * TILE_SIZE) * height, radius + 1);
      }
      graphics.fillStyle(color, 1);
      graphics.fillCircle(x + worldX / (this.world.maze.width * TILE_SIZE) * width, y + worldY / (this.world.maze.height * TILE_SIZE) * height, radius);
    };
    for (const enemy of this.world.enemies) {
      const color = enemy.tier === 0 ? COLOR.cobalt : enemy.tier === 1 ? COLOR.gold : COLOR.scarlet;
      plot(enemy.x, enemy.y, color, enemy.tier + 1.5);
    }
    if (this.world.pickups.box) plot(this.world.pickups.box.x, this.world.pickups.box.y, BOX_COLOR, 2);
    if (this.world.pickups.brute) plot(this.world.pickups.brute.x, this.world.pickups.brute.y, COLOR.magenta, 3);
    if (this.world.riftwing) plot(this.world.riftwing.x, this.world.riftwing.y, COLOR.magenta, 2.5);
    if (this.world.gaoler?.visible) plot(this.world.gaoler.x, this.world.gaoler.y, COLOR.violet, 3);
    for (const id of ["gold", "cyan"] as const) {
      const state = this.world.players[id];
      if (state.alive) plot(state.x, state.y, id === "gold" ? COLOR.gold : COLOR.cyan, 1.5);
    }
  }

  private drawFx(): void {
    this.fxGraphics.clear();
    for (const p of this.fx.pixels()) {
      if (p.x < 0 || p.y < 0 || p.x >= this.world.maze.width * TILE_SIZE || p.y >= this.world.maze.height * TILE_SIZE) continue;
      this.fxGraphics.fillStyle(p.color, p.alpha);
      this.fxGraphics.fillRect(MAZE_X + p.x, MAZE_Y + p.y, p.size, p.size);
    }
  }

  private drawHud(): void {
    const gold = this.world.players.gold;
    const cyan = this.world.players.cyan;
    this.goldText.setText(`GOLD ${gold.score.toString().padStart(6, "0")}  ${"◆".repeat(Math.max(0, gold.lives))}`);
    this.cyanText.setText(`${"◆".repeat(Math.max(0, cyan.lives))}  ${cyan.score.toString().padStart(6, "0")} CYAN`);
    const mazeTitle = this.world.maze.id === "pit-01" ? "THE PIT" : this.world.maze.id === "arena-01" ? "ARENA" : `DUNGEON ${this.world.dungeon}`;
    this.dungeonText.setText(`${mazeTitle}  ${this.world.multiplier === 2 ? "×2" : ""}`);
    this.objectiveText.setText(this.paused ? "PAUSED" : this.world.objective);
    this.objectiveText.setColor(this.world.phase === "riftwing" ? "#f02dce" : this.world.phase === "gaoler" ? "#7540d8" : "#f4fbff");
    const waiting = (["gold", "cyan"] as const).find((id) => {
      const state = this.world.players[id];
      return !state.alive && state.lives > 0;
    });
    if (this.world.phase === "game-over") this.messageText.setText("RUN ENDED — FIRE / R RESTART    M MENU").setColor("#f03528");
    else if (this.paused) this.messageText.setText("PAUSED — ESC / START RESUME    M MENU").setColor("#ffca28");
    else if (waiting) {
      const seconds = Math.max(1, Math.ceil(this.world.players[waiting].respawnTicks / TICKS_PER_SECOND));
      this.messageText.setText(`${waiting.toUpperCase()} — FIRE TO RE-ENTER   AUTO ${seconds}`).setColor(waiting === "gold" ? "#ffca28" : "#19dcff");
    }
    else this.messageText.setText("ESC / START PAUSE   R RESTART   M MENU").setColor("#54627a");

    const pickupMessage = pickupStatus(this.world);
    this.pickupText.setText(pickupMessage).setColor(this.world.pickups.brute ? "#f02dce" : "#76e5cd");
    const effect = this.world.pickups.effect;
    this.itemIcon.setVisible(Boolean(effect));
    if (effect) this.itemIcon.setTexture(EFFECT_TEXTURE[effect.kind]).setDisplaySize(12, 12).setPosition(320 - this.pickupText.width / 2 - 10, 354);
    const spokenObjective = this.paused ? "PAUSED" : this.world.objective;
    const status = `${spokenObjective}. Dungeon ${this.world.dungeon}. Gold score ${gold.score}. Cyan score ${cyan.score}. ${pickupMessage}.`;
    if (status !== this.lastStatus) {
      const element = document.querySelector<HTMLElement>("#status");
      if (element) element.textContent = status;
      this.lastStatus = status;
    }
  }

  private handleEvents(events: readonly GameEvent[]): void {
    this.audioDirector.handle(events);
    if (this.settings.haptics) {
      for (const event of events) {
        if ((event.type === "player-hit" || event.type === "friendly-fire") && event.player) {
          this.browserInput.rumble(event.player, 180, 0.75, 0.3);
        } else if (event.type === "riftwing-caught" && event.player) {
          this.browserInput.rumble(event.player, 120, 0.25, 0.7);
        } else if (event.type === "gaoler-fire") {
          this.browserInput.rumble("gold", 90, 0.3, 0.5);
          this.browserInput.rumble("cyan", 90, 0.3, 0.5);
        }
      }
    }
    this.fx.emit(events, this.settings.reducedFlash);
    if (events.some((event) => event.type === "game-over")) this.saveHighScore();
  }

  private saveHighScore(): void {
    try {
      const key = "worbound.scores.v1";
      const current = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, number>;
      const total = this.world.players.gold.score + this.world.players.cyan.score;
      current[this.mode] = Math.max(current[this.mode] ?? 0, total);
      localStorage.setItem(key, JSON.stringify(current));
    } catch {
      // Storage is optional; gameplay remains available when it is blocked or full.
    }
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.accumulator = 0;
    this.audioDirector.setPaused(paused);
  }

  private restartRun(): void {
    this.scene.restart({ mode: this.mode });
  }

  private cleanup(): void {
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onBlur);
    this.browserInput.destroy();
    this.audioDirector.destroy();
  }
}

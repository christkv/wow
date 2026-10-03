import Phaser from "phaser";
import "./style.css";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./game/model";
import { AttractScene } from "./scenes/AttractScene";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  backgroundColor: "#03040b",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  input: {
    gamepad: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    powerPreference: "high-performance"
  },
  scene: [BootScene, AttractScene, GameScene]
};

const game = new Phaser.Game(config);

window.addEventListener("beforeunload", () => game.destroy(true));

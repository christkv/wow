import Phaser from "phaser";
import { BOOT_AUDIO_ASSETS, BOOT_IMAGE_ASSETS } from "../runtime-assets";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("Boot");
  }

  public preload(): void {
    const barBack = this.add.rectangle(320, 190, 300, 12, 0x07152b).setStrokeStyle(1, 0x19dcff);
    const bar = this.add.rectangle(171, 190, 2, 8, 0xffca28).setOrigin(0, 0.5);
    const label = this.add.text(320, 164, "AWAKENING THE DUNGEON", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "9px",
      color: "#f4fbff"
    }).setOrigin(0.5);

    this.load.on("progress", (progress: number) => bar.setSize(Math.max(2, 296 * progress), 8));
    this.load.once("complete", () => {
      bar.destroy();
      barBack.destroy();
      label.destroy();
    });

    this.load.image("attract", BOOT_IMAGE_ASSETS.attract);
    for (const [key, urls] of Object.entries(BOOT_AUDIO_ASSETS)) this.load.audio(key, [...urls]);
  }

  public create(): void {
    this.textures.get("attract").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.start("Attract");
  }
}

import Phaser from "phaser";
import type { GameContext, GameModule } from "@sdk/index";
import { meta } from "./meta";
import { SnakeScene } from "./SnakeScene";

// Phaser-backed GameModule. Boots a Phaser.Game into ctx.mount and tears it down
// on unmount. Phaser lives in a shared vendor chunk (see vite.config manualChunks)
// so it is downloaded once and cached across every Phaser game.

let game: Phaser.Game | null = null;

const module: GameModule = {
  meta,
  async mount(ctx: GameContext) {
    ctx.lifecycle.loadingStart();
    const size = Math.min(ctx.mount.clientWidth || 360, 460);
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ctx.mount,
      width: size,
      height: size,
      backgroundColor: "#0f1226",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: SnakeScene,
    });
    game.scene.start("snake", { ctx });
    ctx.lifecycle.loadingFinished();
  },
  unmount() {
    game?.destroy(true);
    game = null;
  },
};

export default module;

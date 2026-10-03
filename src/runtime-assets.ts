import attractScreen from "../assets/runtime/web/screens/attract-screen.png?url";
import delverGold from "../assets/runtime/web/sprites/delver-gold.png?url";
import delverCyan from "../assets/runtime/web/sprites/delver-cyan.png?url";
import prowler from "../assets/runtime/web/sprites/prowler.png?url";
import veilmaw from "../assets/runtime/web/sprites/veilmaw.png?url";
import ravager from "../assets/runtime/web/sprites/ravager.png?url";
import riftwing from "../assets/runtime/web/sprites/riftwing.png?url";
import gaoler from "../assets/runtime/web/sprites/gaoler.png?url";
import dungeonMusic from "../assets/audio/music/dungeon-loop.ogg?url";
import attractMusic from "../assets/audio/music/attract-loop.ogg?url";
import playerFireGold from "../assets/runtime/web/audio/player-fire-gold.ogg?url";
import playerFireCyan from "../assets/runtime/web/audio/player-fire-cyan.ogg?url";
import enemyFire from "../assets/runtime/web/audio/enemy-fire.ogg?url";
import wallImpact from "../assets/runtime/web/audio/impact-wall.ogg?url";
import enemyHit from "../assets/runtime/web/audio/impact-creature.ogg?url";
import playerDeath from "../assets/runtime/web/audio/player-death.ogg?url";
import cloak from "../assets/runtime/web/audio/cloak.ogg?url";
import reveal from "../assets/runtime/web/audio/reveal.ogg?url";
import transform from "../assets/runtime/web/audio/transform.ogg?url";
import riftwingSpawn from "../assets/runtime/web/audio/riftwing-spawn.ogg?url";
import riftwingCaught from "../assets/runtime/web/audio/riftwing-caught.ogg?url";
import riftwingEscaped from "../assets/runtime/web/audio/riftwing-escaped.ogg?url";
import gaolerArrive from "../assets/runtime/web/audio/gaoler-teleport-in.ogg?url";
import gaolerFire from "../assets/runtime/web/audio/gaoler-lightning.ogg?url";
import gaolerHit from "../assets/runtime/web/audio/gaoler-hit.ogg?url";
import dungeonStart from "../assets/runtime/web/audio/dungeon-start.ogg?url";
import gameOver from "../assets/runtime/web/audio/game-over.ogg?url";

const m4a = import.meta.glob<string>("../assets/runtime/web/audio/*.m4a", {
  eager: true,
  query: "?url",
  import: "default"
});

function fallback(name: string): string {
  const url = m4a[`../assets/runtime/web/audio/${name}.m4a`];
  if (!url) throw new Error(`Missing runtime AAC fallback for ${name}`);
  return url;
}

export const BOOT_IMAGE_ASSETS = {
  attract: attractScreen
} as const;

export const GAME_IMAGE_ASSETS = {
  "delver-gold": delverGold,
  "delver-cyan": delverCyan,
  prowler,
  veilmaw,
  ravager,
  riftwing,
  gaoler
} as const;

export const BOOT_AUDIO_ASSETS = {
  "music-attract": [attractMusic, fallback("music-attract")]
} as const;

export const GAME_AUDIO_ASSETS = {
  "music-dungeon": [dungeonMusic, fallback("music-dungeon")],
  "shot-gold": [playerFireGold, fallback("player-fire-gold")],
  "shot-cyan": [playerFireCyan, fallback("player-fire-cyan")],
  "enemy-shot": [enemyFire, fallback("enemy-fire")],
  "wall-impact": [wallImpact, fallback("impact-wall")],
  "enemy-hit": [enemyHit, fallback("impact-creature")],
  "player-hit": [playerDeath, fallback("player-death")],
  cloak: [cloak, fallback("cloak")],
  reveal: [reveal, fallback("reveal")],
  transform: [transform, fallback("transform")],
  "riftwing-spawn": [riftwingSpawn, fallback("riftwing-spawn")],
  "riftwing-caught": [riftwingCaught, fallback("riftwing-caught")],
  "riftwing-escaped": [riftwingEscaped, fallback("riftwing-escaped")],
  "gaoler-arrive": [gaolerArrive, fallback("gaoler-teleport-in")],
  "gaoler-fire": [gaolerFire, fallback("gaoler-lightning")],
  "gaoler-hit": [gaolerHit, fallback("gaoler-hit")],
  "dungeon-start": [dungeonStart, fallback("dungeon-start")],
  "game-over": [gameOver, fallback("game-over")]
} as const;

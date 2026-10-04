import type { GameEvent } from "../game/model";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  born: number; life: number; size: number; color: number; alpha: number;
}
export interface ParticlePixel { x: number; y: number; size: number; color: number; alpha: number }
export const MAX_PARTICLES = 256;
const GOLD = [0xfff3b0, 0xffca28, 0xf58b19, 0xbd3b21];
const CYAN = [0xd9faff, 0x19dcff, 0x2385dc, 0x3551a6];
const RED = [0xffd375, 0xff9d28, 0xf03528, 0x84265d];
const PURPLE = [0xf7b8ff, 0xf02dce, 0x9d43dd, 0x53348d];

/** Presentation-only, fixed-tick debris. Never reads or changes gameplay RNG. */
export class PixelEffects {
  private tick = 0;
  private particles: Particle[] = [];
  public clear(): void { this.tick = 0; this.particles = []; }
  public advance(): void {
    this.tick++;
    this.particles = this.particles.filter(p => this.tick - p.born < p.life);
  }
  public emit(events: readonly GameEvent[], reduced = false): void {
    const kills = new Set(events.filter(e => e.type === "enemy-killed" || e.type === "brute-killed").map(e => `${e.x},${e.y}`));
    for (const event of events) {
      if (event.x === undefined || event.y === undefined) continue;
      if ((event.type === "enemy-hit" || event.type === "brute-hit") && kills.has(`${event.x},${event.y}`)) continue;
      let count = 0, life = 24, speed = 1, palette = GOLD;
      switch (event.type) {
        case "enemy-killed": count = 26; life = 32; speed = 1.5; palette = RED; break;
        case "brute-killed": case "gaoler-hit": count = 38; life = 40; speed = 1.8; palette = PURPLE; break;
        case "player-hit": case "friendly-fire": count = 32; life = 36; speed = 1.6; palette = event.player === "cyan" ? CYAN : GOLD; break;
        case "enemy-hit": case "brute-hit": count = 7; life = 14; palette = RED; break;
        case "shield-hit": count = 12; life = 22; palette = CYAN; break;
        case "bomb": count = 40; life = 34; speed = 2; break;
        case "transform": count = 10; life = 22; palette = PURPLE; break;
        case "riftwing-caught": count = 24; life = 32; palette = PURPLE; break;
        case "box-collected": count = 10; life = 22; palette = CYAN; break;
        case "wall-impact": count = 4; life = 10; speed = .6; break;
        default: continue;
      }
      if (reduced) { count = Math.ceil(count / 4); life = Math.min(life, 20); speed *= .6; }
      for (let i = 0; i < count; i++) {
        // Golden-angle spread gives a varied, repeatable explosion without random rolls.
        const angle = i * 2.399963 + (event.x + event.y) * .1;
        const velocity = speed * (.3 + (i * 7 % 13) / 13);
        this.particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
          born: this.tick, life: life - i % 7, size: reduced ? 1 : i % 4 === 0 ? 2 : 1,
          color: palette[i % palette.length]!, alpha: reduced ? .45 : .95 });
      }
    }
    // Heavy multi-kills stay bounded, with the newest impacts kept visible.
    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
  }
  public pixels(): ParticlePixel[] {
    return this.particles.map(p => {
      const age = this.tick - p.born;
      const travel = age / (1 + age * .025);
      return { x: Math.round(p.x + p.vx * travel), y: Math.round(p.y + p.vy * travel + age * age * .006),
        size: age > p.life * .6 ? 1 : p.size, color: p.color, alpha: p.alpha * (1 - age / p.life) };
    });
  }
}

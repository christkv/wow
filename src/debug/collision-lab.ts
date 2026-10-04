import "./collision-lab.css";
import { OBJECT_IMAGE_ASSETS, EFFECT_TEXTURE, bruteFrame } from "../presentation/art";
import { PixelEffects } from "../presentation/pixel-effects";
import { AUDIT_SEED, COLLISION_SCENARIOS, collisionBodies, overlapsWall } from "./collision-scenarios";
import { DIRECTION_VECTOR, TILE_SIZE, type CombatProfile, type Direction, type PlayerCommand, type PlayerId } from "../game/model";
import { COMBAT_SCENARIOS } from "./combat-scenarios";
import { COMBAT_PROFILES } from "../game/combat";
import { stepWorld, worldHash } from "../game/simulation";

import { PICKUP_SCENARIOS } from "./pickup-scenarios";
import { canPlayerFire, pickupStatus } from "../game/pickups";

const SCENARIOS = [...COLLISION_SCENARIOS, ...COMBAT_SCENARIOS, ...PICKUP_SCENARIOS];
const MAX_TICKS = 3600;
document.querySelector<HTMLDivElement>("#lab")!.innerHTML = `
  <header><div><div class="eyebrow">Worbound / developer tools</div><h1>Collision lab</h1><span>Combat, pickups &amp; movement scenarios</span></div><a href="./">Open game ↗</a></header>
  <div class="layout">
    <aside>
      <label for="scenario">Scenario</label><select id="scenario"></select>
      <label for="profile">Combat profile</label><select id="profile"><option value="balanced">Balanced + staged enemies</option><option value="readable">Warnings + buffer</option><option value="slower">Slower shots only</option><option value="legacy">Previous timing</option></select>
      <p id="tuning" class="hint"></p>
      <label for="reaction">Dodge response (ms)</label><input id="reaction" type="number" min="0" max="1000" step="50" value="200" style="width:100%;margin-top:8px">
      <div id="badge" class="badge"></div><p id="description"></p>
      <p class="expectation" id="expected"></p>
      <p class="hint">Real simulation · seed ${AUDIT_SEED} · 60 ticks / second. Paused on load. One pixel in the maze equals one simulation unit.</p>
      <a id="permalink" href="#">Link to this scenario</a>
    </aside>
    <section aria-label="Simulation">
      <div class="toolbar">
        <button id="run">Run</button><button id="reset">Reset</button><button id="fire">Fire once</button><button id="bomb">Detonate bomb</button>
        <button data-step="1">+1 tick</button><button data-step="10">+10</button><button data-step="60">+60</button><button data-step="600">+600</button>
        <label for="speed">Speed</label><select id="speed"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="1" selected>1×</option><option value="4">4×</option></select>
      </div>
      <div class="viewport"><canvas id="maze" width="608" height="304" role="img" aria-label="Maze, actors, movement trails, and collision overlays"></canvas></div>
      <div class="options">
        <label><input id="boxes" type="checkbox" checked>Collision boxes</label>
        <label><input id="sprites" type="checkbox" checked>Sprites</label>
        <label><input id="bounds" type="checkbox">Sprite bounds</label>
        <label><input id="reduced-fx" type="checkbox">Reduced particles</label>
        <label><input id="trails" type="checkbox" checked>Trails</label>
        <label for="control">Gold movement</label><select id="control"><option value="script">Scenario script</option><option value="idle">Idle</option><option>north</option><option>east</option><option>south</option><option>west</option></select>
      </div>
      <p class="legend">Yellow = collision box · red = wall overlap · dashed gray = sprite bounds. Walls collide across their entire tile. Gold rings/arrows = firing warning; thin shots = friendly, diamonds = hostile. Every blue chest hides its outcome until opened. Brute squares = remaining health. Pixel debris = cosmetic impacts.</p>
      <div class="metrics"><span id="tick"></span><span id="phase"></span><span id="gate"></span><span id="overlap"></span><span id="hash"></span><span id="combat-status"></span><span id="pickup-status"></span><span id="particle-status"></span></div>
      <label for="timeline">Replay recorded ticks</label><div class="timeline"><input id="timeline" type="range" min="0" max="0" value="0"><output id="time">0 / 0</output></div>
      <p class="hint">Scrub backward to inspect contact. Stepping after rewinding branches the replay using the current controls. Reset restores the fixture; the lab stops after 3,600 ticks.</p>
      <div class="inspection"><div class="panel"><h2>Actor positions</h2><pre id="actors"></pre></div><div class="panel"><h2>Recent events</h2><pre id="events"></pre></div></div>
    </section>
  </div>`;

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const select = element<HTMLSelectElement>("scenario");
for (const s of SCENARIOS) select.add(new Option(s.title, s.id));
const requested = new URLSearchParams(location.search).get("scenario");
let scenario = SCENARIOS.find(s => s.id === requested) ?? COLLISION_SCENARIOS[0]!;
const requestedProfile = new URLSearchParams(location.search).get("profile");
let profile: CombatProfile = requestedProfile && Object.hasOwn(COMBAT_PROFILES, requestedProfile) ? requestedProfile as CombatProfile : "balanced";
element<HTMLSelectElement>("profile").value = profile;
let world = scenario.create(profile);
let elapsed = 0;
let playing = false;
let accumulator = 0;
type Commands = Record<PlayerId, PlayerCommand>;
let history: Commands[] = [];
let events: string[] = [];
const fx = new PixelEffects();
let trails = new Map<string, Array<{ x: number; y: number }>>();
const canvas = element<HTMLCanvasElement>("maze");
const ctx = canvas.getContext("2d")!;
const sheets = new Map<string, HTMLImageElement>();
const spriteUrls = import.meta.glob<string>("../../assets/runtime/web/sprites/*.png", { eager: true, query: "?url", import: "default" });
for (const [path, url] of Object.entries(spriteUrls)) {
  const sheet = new Image(); sheet.src = url;
  sheets.set(path.split("/").pop()!.replace(".png", ""), sheet);
  sheet.onload = () => render();
}
const objectImages = new Map<string, HTMLImageElement>();
for (const [key, url] of Object.entries(OBJECT_IMAGE_ASSETS)) {
  const img = new Image(); img.src = url; img.onload = () => render(); objectImages.set(key, img);
}
const enabled = (id: string): boolean => element<HTMLInputElement>(id).checked;

function pause(): void { playing = false; accumulator = 0; element("run").textContent = "Run"; }

function recordPositions(): void {
  for (const body of collisionBodies(world)) {
    const points = trails.get(body.id) ?? [];
    points.push({ x: body.x, y: body.y });
    if (points.length > 240) points.shift();
    trails.set(body.id, points);
  }
}

function apply(input: Commands): void {
  fx.advance();
  const result = stepWorld(world, input);
  fx.emit(result, enabled("reduced-fx"));
  elapsed++;
  for (const event of result) events.push(`${elapsed}: ${event.type}${event.player ? ` (${event.player})` : ""}`);
  events = events.slice(-20);
  recordPositions();
}

function step(count: number, fireOnce = false, bombOnce = false): void {
  history = history.slice(0, elapsed);
  for (let i = 0; i < count && elapsed < MAX_TICKS; i++) {
    const input = scenario.commands(world, Math.round(Number(element<HTMLInputElement>("reaction").value) * 60 / 1000));
    const control = element<HTMLSelectElement>("control").value;
    if (control !== "script") input.gold = { ...input.gold, move: control === "idle" ? null : control as Direction, aim: false };
    if (fireOnce && i === 0) input.gold = { ...input.gold, fire: true };
    if (bombOnce && i === 0) input.gold = { ...input.gold, bomb: true };
    history.push(structuredClone(input));
    apply(input);
  }
  if (elapsed === MAX_TICKS) pause();
  render();
}

function reset(): void {
  pause(); fx.clear(); world = scenario.create(profile); elapsed = 0; history = []; events = []; trails = new Map();
  element<HTMLSelectElement>("control").value = "script";
  select.value = scenario.id;
  element<HTMLSelectElement>("profile").disabled = !scenario.combat;
  element<HTMLInputElement>("reaction").disabled = !scenario.combat;
  const tuning = COMBAT_PROFILES[world.combatProfile];
  element("tuning").textContent = `Shots: player ${tuning.playerSpeed * 60} px/s; enemies ${tuning.enemySpeeds.map(s => s * 60).join(" / ")} px/s. Warning ${tuning.warnings.map(t => Math.round(t / 60 * 1000)).join(" / ")} ms.`;
  element("description").textContent = scenario.description;
  element("expected").textContent = scenario.expected;
  element("badge").textContent = scenario.pickup ? "Pickup experiment" : scenario.combat ? "Combat comparison" : scenario.regression ? "Regression check" : "Collision baseline";
  const url = new URL(location.href); url.searchParams.set("scenario", scenario.id); if (scenario.combat) url.searchParams.set("profile", profile); else url.searchParams.delete("profile");
  window.history.replaceState(null, "", url);
  element<HTMLAnchorElement>("permalink").href = url.toString();
  recordPositions(); render();
}

function render(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(32, 24); ctx.imageSmoothingEnabled = false;
  const maze = world.maze;
  for (let y = 0; y < maze.height; y++) for (let x = 0; x < maze.width; x++) {
    ctx.fillStyle = maze.walls[y]?.[x] ? "#193553" : "#0b1422";
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = maze.walls[y]?.[x] ? "#42729b" : "#142033";
    ctx.lineWidth = .4; ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
  ctx.strokeStyle = world.gateCooldownTicks > 0 ? "#ff7285" : "#76e5cd";
  ctx.lineWidth = 2;
  for (const x of [0, maze.width * TILE_SIZE]) {
    ctx.beginPath(); ctx.moveTo(x, maze.gateRow * TILE_SIZE); ctx.lineTo(x, (maze.gateRow + 1) * TILE_SIZE); ctx.stroke();
  }
  if (enabled("trails")) for (const points of trails.values()) {
    ctx.strokeStyle = "#65b0b688"; ctx.lineWidth = .7; ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0 || Math.abs(p.x - points[i - 1]!.x) > 100) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }); ctx.stroke();
  }
  const bodies = collisionBodies(world);
  for (const b of bodies) {
    const sheet = sheets.get(b.sprite), size = b.displaySize;
    if (enabled("sprites") && sheet?.complete && sheet.naturalWidth) {
      const row = { south: 0, east: 1, north: 2, west: 3 }[b.facing];
      if (b.id === "brute") ctx.globalAlpha = world.pickups.brute!.arrivalTicks > 0 ? .35 : 1;
      const col = b.id === "brute" ? bruteFrame(b.facing, world.tick, world.pickups.brute!.arrivalTicks !== 0) % 4 : b.sprite.startsWith("delver") ? 1 + Math.floor(world.tick / 8) % 2 : Math.floor(world.tick / 10) % 2;
      ctx.drawImage(sheet, col * 64, row * 64, 64, 64, b.x - size / 2, b.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
    if (enabled("bounds")) {
      ctx.strokeStyle = "#b0bfd199"; ctx.lineWidth = .5; ctx.setLineDash([2, 2]);
      ctx.strokeRect(b.x - size / 2, b.y - size / 2, size, size); ctx.setLineDash([]);
    }
    const hit = overlapsWall(maze, b);
    if (enabled("boxes")) {
      ctx.strokeStyle = hit ? "#ff657e" : "#ffe28a"; ctx.fillStyle = hit ? "#ff315d55" : "#ffe28a18"; ctx.lineWidth = .8;
      ctx.fillRect(b.x - b.halfSize, b.y - b.halfSize, b.halfSize * 2, b.halfSize * 2);
      ctx.strokeRect(b.x - b.halfSize, b.y - b.halfSize, b.halfSize * 2, b.halfSize * 2);
    }
    const v = DIRECTION_VECTOR[b.facing]; ctx.strokeStyle = "#fff"; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + v.x * 6, b.y + v.y * 6); ctx.stroke();
  }
  for (const enemy of world.enemies) {
    if (enemy.arrivalTicks > 0) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 6 + enemy.arrivalTicks / 6, 0, Math.PI * 2); ctx.stroke(); }
    if (!enemy.fireDirection) continue;
    const v = DIRECTION_VECTOR[enemy.fireDirection];
    ctx.strokeStyle = "#ffce61"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(enemy.x + v.x * 8, enemy.y + v.y * 8); ctx.lineTo(enemy.x + v.x * 14, enemy.y + v.y * 14);
    ctx.lineTo(enemy.x + v.x * 11 - v.y * 3, enemy.y + v.y * 11 + v.x * 3);
    ctx.moveTo(enemy.x + v.x * 14, enemy.y + v.y * 14); ctx.lineTo(enemy.x + v.x * 11 + v.y * 3, enemy.y + v.y * 11 - v.x * 3); ctx.stroke();
  }
  for (const p of world.projectiles) {
    const v = DIRECTION_VECTOR[p.direction];
    ctx.fillStyle = p.ownerType === "player" ? (p.ownerId === "cyan" ? "#6cecff" : "#ffdb62") : "#ff658b";
    ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(p.x - v.x * 7, p.y - v.y * 7); ctx.lineTo(p.x, p.y); ctx.stroke();
    if (p.ownerType === "player") ctx.fillRect(p.x - (v.x ? 3 : 1), p.y - (v.y ? 3 : 1), v.x ? 6 : 2, v.y ? 6 : 2);
    else { ctx.beginPath(); ctx.moveTo(p.x, p.y - 3); ctx.lineTo(p.x + 3, p.y); ctx.lineTo(p.x, p.y + 3); ctx.lineTo(p.x - 3, p.y); ctx.closePath(); ctx.fill(); }
  }
  const { box, effect, brute, blast } = world.pickups;
  const drawObject = (key: string, x: number, y: number, size: number): void => {
    const img = objectImages.get(key);
    if (img?.complete && img.naturalWidth) ctx.drawImage(img, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  };
  if (box) {
    drawObject("mystery-box", box.x, box.y, 14);
    ctx.fillStyle = "#19dcff"; ctx.fillRect(box.x - 6, box.y + 8, Math.ceil(12 * box.ticks / 600), 1);
  }
  if (effect) {
    const p = world.players[effect.owner]; drawObject(EFFECT_TEXTURE[effect.kind], p.x, p.y - 19, 10); ctx.strokeStyle = "#76e5cd"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#76e5cd"; ctx.fillRect(p.x - 6, p.y - 11, 12 * effect.ticks / effect.duration, 2);
  }
  if (brute) {
    ctx.strokeStyle = "#f02dce"; ctx.lineWidth = 1;
    if (brute.arrivalTicks) { ctx.beginPath(); ctx.arc(brute.x, brute.y, 7 + brute.arrivalTicks / 10, 0, Math.PI * 2); ctx.stroke(); }
    else {
      ctx.fillStyle = "#f02dce";
      for (let i = 0; i < brute.health; i++) ctx.fillRect(brute.x - 5 + i * 4, brute.y - 9, 3, 2);
    }
  }
  if (blast) for (const p of blast.cells) { ctx.fillStyle = `rgba(255,202,40,${.4 * blast.ticks / 18})`; ctx.fillRect(p.x - 7, p.y - 7, 14, 14); }
  const particles = fx.pixels();
  for (const p of particles) {
    if (p.x < 0 || p.y < 0 || p.x >= maze.width * TILE_SIZE || p.y >= maze.height * TILE_SIZE) continue;
    ctx.fillStyle = `#${p.color.toString(16).padStart(6, "0")}`; ctx.globalAlpha = p.alpha;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  element("particle-status").textContent = `Particles: ${particles.length}`;
  element("pickup-status").textContent = pickupStatus(world);
  const gold = world.players.gold;
  element("combat-status").textContent = `Gold: ${gold.alive ? "alive" : "hit"} · ${gold.lives} lives · ${canPlayerFire(world, "gold") ? "ready" : gold.fireBufferUntil >= world.tick && gold.fireBufferUntil > 0 ? "queued" : "shot live"} · ${world.enemies.filter(e => e.fireDirection).length} charging · ${world.projectiles.length} shots · ${world.enemies.length} enemies`;
  element("tick").textContent = `Tick ${elapsed} · ${(elapsed / 60).toFixed(2)}s`;
  element("phase").textContent = `Phase: ${world.phase}`;
  element("gate").textContent = `Gate: ${world.gateCooldownTicks ? `${world.gateCooldownTicks} ticks closed` : "open"}`;
  const overlapping = bodies.filter(b => overlapsWall(maze, b));
  element("overlap").textContent = overlapping.length ? `Wall overlap: ${overlapping.map(b => b.id).join(", ")}` : "No wall overlap";
  element("overlap").dataset.hit = String(overlapping.length > 0);
  element("hash").textContent = `Hash: ${worldHash(world)}`;
  element("actors").textContent = bodies.map(b => `${b.id.padEnd(10)} x=${b.x.toFixed(2).padStart(7)} y=${b.y.toFixed(2).padStart(7)} ${b.facing}`).join("\n");
  element("events").textContent = [...events].reverse().join("\n") || "No events yet.";
  const timeline = element<HTMLInputElement>("timeline"); timeline.max = String(history.length); timeline.value = String(elapsed);
  element("time").textContent = `${elapsed} / ${history.length}`;
}

select.addEventListener("change", () => { scenario = SCENARIOS.find(s => s.id === select.value)!; reset(); });
element("run").addEventListener("click", () => {
  if (playing) pause(); else if (elapsed < MAX_TICKS) { playing = true; accumulator = 0; element("run").textContent = "Pause"; }
});
element("reduced-fx").addEventListener("change", reset);
element("reset").addEventListener("click", reset);
element("bomb").addEventListener("click", () => { pause(); step(1, false, true); });
element("fire").addEventListener("click", () => { pause(); step(1, true); });
element("profile").addEventListener("change", () => { profile = element<HTMLSelectElement>("profile").value as CombatProfile; reset(); });
element("reaction").addEventListener("change", () => {
  const input = element<HTMLInputElement>("reaction"); input.value = String(Math.max(0, Math.min(1000, Number(input.value) || 0))); reset();
});
document.querySelectorAll<HTMLButtonElement>("[data-step]").forEach(button => button.addEventListener("click", () => { pause(); step(Number(button.dataset.step)); }));
for (const id of ["boxes", "sprites", "bounds", "trails"]) element(id).addEventListener("change", render);
element("timeline").addEventListener("input", () => {
  pause(); const target = Number(element<HTMLInputElement>("timeline").value);
  fx.clear(); world = scenario.create(profile); elapsed = 0; events = []; trails = new Map(); recordPositions();
  for (let i = 0; i < target; i++) apply(history[i]!);
  render();
});
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
window.addEventListener("blur", pause);
let previousTime = performance.now();
function frame(now: number): void {
  if (playing) {
    accumulator += Math.min(now - previousTime, 100) * Number(element<HTMLSelectElement>("speed").value);
    const ticks = Math.floor(accumulator / (1000 / 60));
    if (ticks > 0) { accumulator -= ticks * (1000 / 60); step(ticks); }
  }
  previousTime = now; requestAnimationFrame(frame);
}
reset(); requestAnimationFrame(frame);

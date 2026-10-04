import { expect, test, type Page } from "@playwright/test";

test.setTimeout(60_000);
async function title(page: Page) {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.waitForLoadState("networkidle");
  await page.clock.runFor(100);
}
async function idleDemo(page: Page) {
  await page.clock.fastForward(21_000);
  await expect(page.locator("#status")).toContainText("DEMO PLAY");
}

test("idle title plays a real demo, cycles, and never changes saved scores", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await title(page);
  const saved = JSON.stringify({ solo: 3456, alliance: 1234 });
  await page.evaluate(value => localStorage.setItem("worbound.scores.v1", value), saved);
  await idleDemo(page);
  await page.clock.runFor(6000);
  await expect(page.locator("#status")).toContainText("DEMO PLAY");
  await expect(page.locator("#status")).not.toContainText("Gold score 0. Cyan score 0.");
  await page.screenshot({ path: test.info().outputPath("arcade-demo.png") });
  await page.clock.fastForward(31_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.clock.runFor(100);
  await idleDemo(page);
  expect(await page.evaluate(() => localStorage.getItem("worbound.scores.v1"))).toBe(saved);
  expect(errors).toEqual([]);
});

test("activity postpones autoplay, options suppress it, and a waking key does not start a game", async ({ page }) => {
  await title(page);
  await page.clock.fastForward(15_000);
  await page.keyboard.press("q");
  await page.clock.fastForward(10_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.keyboard.press("o");
  await page.clock.fastForward(30_000);
  await expect(page.locator("#status")).toContainText("Options.");
  await page.keyboard.press("Escape");
  await idleDemo(page);
  await page.keyboard.down("Enter");
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.clock.fastForward(25_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.keyboard.up("Enter");
  await page.clock.runFor(100);
  await page.keyboard.press("f");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
  await expect(page.locator("#status")).not.toContainText("DEMO PLAY");
  await page.keyboard.press("Escape");
  await page.clock.fastForward(35_000);
  await expect(page.locator("#status")).toContainText("PAUSED");
});

test("pointer and controller activity dismiss demos without leaking into the title controls", async ({ page }) => {
  await title(page); await idleDemo(page);
  await page.mouse.move(400, 200);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.clock.runFor(100); await idleDemo(page);
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, touched: false, value: i === 0 ? 1 : 0 }));
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [{ id: "test-pad", index: 0, connected: true, mapping: "standard", timestamp: 0, axes: [0, 0], buttons }] });
  });
  await page.clock.runFor(100);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.clock.fastForward(25_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.evaluate(() => Reflect.deleteProperty(navigator, "getGamepads"));
  await page.clock.runFor(100);
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
  await expect(page.locator("#status")).not.toContainText("DEMO PLAY");
});

test("hidden tabs do not enter or continue demos, and idle practice play is not interrupted", async ({ page }) => {
  await title(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(25_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden"); document.dispatchEvent(new Event("visibilitychange"));
  });
  await idleDemo(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.clock.runFor(100);
  await page.keyboard.press("4");
  await page.clock.runFor(1200);
  await page.clock.fastForward(35_000);
  await expect(page.locator("#status")).toContainText("CLEAR THE DUNGEON");
  await expect(page.locator("#status")).not.toContainText("DEMO PLAY");
});

test("real game over saves its score then returns to title after inactivity", async ({ page }) => {
  let sceneUrl = "";
  page.on("request", request => { if (request.url().includes("/src/scenes/GameScene.ts")) sceneUrl = request.url(); });
  await title(page);
  expect(sceneUrl).not.toBe("");
  // Set up an exhausted run through the real scene, then let its normal update,
  // game-over event, persistence and idle transition run unmodified.
  await page.evaluate(async path => {
    const { GameScene } = await import(/* @vite-ignore */ path);
    const create = GameScene.prototype.create;
    GameScene.prototype.create = function () {
      create.call(this);
      for (const player of Object.values(this.world.players) as Array<{ alive: boolean; lives: number }>) {
        player.alive = false; player.lives = 0;
      }
      this.world.players.gold.score = 4321;
    };
  }, sceneUrl);
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toContainText("RUN ENDED");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("worbound.scores.v1")!).solo)).toBe(4321);
  await page.clock.fastForward(15_000);
  await page.keyboard.press("q");
  await page.clock.fastForward(10_000);
  await expect(page.locator("#status")).toContainText("RUN ENDED");
  await page.clock.fastForward(11_000);
  await expect(page.locator("#status")).toContainText("Choose a game mode");
});

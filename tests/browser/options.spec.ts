import { expect, test } from "@playwright/test";

async function openOptions(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.keyboard.press("o");
  await expect(page.locator("#status")).toContainText("Options.");
}

test("random maps and bright CRT are opt-in, persist, and apply to a new run", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  let sceneUrl = "";
  page.on("request", request => { if (request.url().includes("/src/scenes/GameScene.ts")) sceneUrl = request.url(); });
  await openOptions(page);
  await expect(page.locator("#game")).toHaveAttribute("data-crt", "off");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator("#status")).toContainText("RANDOM MAPS OFF");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#status")).toContainText("RANDOM MAPS ON");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#status")).toContainText("CRT SCANLINES OFF");
  await page.screenshot({ path: test.info().outputPath("options-crt-off.png") });
  await page.keyboard.press("Enter");
  await expect(page.locator("#status")).toContainText("CRT SCANLINES ON + BRIGHT");
  await expect(page.locator("#game")).toHaveAttribute("data-crt", "on");
  await expect(page.locator("#game canvas")).toHaveCSS("filter", "brightness(1.3) saturate(1.08)");
  const overlay = await page.locator("#game").evaluate(element => {
    const style = getComputedStyle(element, "::after");
    return { display: style.display, pointerEvents: style.pointerEvents, image: style.backgroundImage };
  });
  expect(overlay).toMatchObject({ display: "block", pointerEvents: "none" });
  expect(overlay.image).toContain("repeating-linear-gradient");
  await page.screenshot({ path: test.info().outputPath("options-crt-on.png") });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("worbound.settings.v1")!))).toMatchObject({ randomMaps: true, crtScanlines: true });
  await page.reload();
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await expect(page.locator("#game")).toHaveAttribute("data-crt", "on");
  // Observe the real scene module to inspect its new-run setting, avoiding a test-only global API.
  expect(sceneUrl).toBeTruthy();
  await page.evaluate(async url => {
    const { GameScene } = await import(/* @vite-ignore */ url!);
    const create = GameScene.prototype.create;
    GameScene.prototype.create = function () { create.call(this); document.body.dataset.randomRun = String(this.world.mapRotation.enabled); };
  }, sceneUrl);
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
  await expect(page.locator("body")).toHaveAttribute("data-random-run", "true");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: test.info().outputPath("game-crt.png") });
  expect(errors).toEqual([]);
});

test("CRT fits a resized letterboxed canvas, can be disabled, and Back still closes options", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("worbound.settings.v1", JSON.stringify({ crtScanlines: true })));
  await openOptions(page);
  await page.setViewportSize({ width: 900, height: 900 });
  await expect.poll(async () => page.locator("#game").evaluate(element => {
    const canvas = element.querySelector("canvas")!.getBoundingClientRect(), parent = element.getBoundingClientRect(), overlay = getComputedStyle(element, "::after");
    return Math.abs(parseFloat(overlay.width) - canvas.width) + Math.abs(parseFloat(overlay.height) - canvas.height)
      + Math.abs(parseFloat(overlay.left) - canvas.left + parent.left) + Math.abs(parseFloat(overlay.top) - canvas.top + parent.top);
  })).toBeLessThan(1);
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#game")).toHaveAttribute("data-crt", "off");
  await expect(page.locator("#game canvas")).toHaveCSS("filter", "none");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#status")).toContainText("FRIENDLY FIRE ON");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#status")).toContainText("BACK");
  await page.keyboard.press("Enter");
  await expect(page.locator("#status")).toContainText("Choose a game mode");
});

for (const enabled of [false, true]) {
  test(`friendly fire defaults on, saves ${enabled ? "on" : "off"}, and applies to Alliance`, async ({ page }) => {
    let sceneUrl = "";
    page.on("request", request => { if (request.url().includes("/src/scenes/GameScene.ts")) sceneUrl = request.url(); });
    await openOptions(page);
    for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowDown");
    await expect(page.locator("#status")).toContainText("FRIENDLY FIRE ON");
    await page.keyboard.press("Enter");
    await expect(page.locator("#status")).toContainText("FRIENDLY FIRE OFF");
    if (enabled) await page.keyboard.press("ArrowRight");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("worbound.settings.v1")!).friendlyFire)).toBe(enabled);
    await page.screenshot({ path: test.info().outputPath("friendly-fire-options.png") });
    await page.reload();
    await expect(page.locator("#status")).toContainText("Choose a game mode");
    expect(sceneUrl).toBeTruthy();
    await page.evaluate(async url => {
      const { GameScene } = await import(/* @vite-ignore */ url);
      const create = GameScene.prototype.create;
      GameScene.prototype.create = function () { create.call(this); document.body.dataset.friendlyFire = String(this.world.friendlyFire); };
    }, sceneUrl);
    await page.keyboard.press("2");
    await expect(page.locator("#status")).toContainText("Dungeon 1");
    await expect(page.locator("body")).toHaveAttribute("data-friendly-fire", String(enabled));
  });
}

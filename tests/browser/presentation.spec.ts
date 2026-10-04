import { expect, test } from "@playwright/test";

test("every unopened outcome renders the same pixel-art chest", async ({ page }) => {
  const images: string[] = [];
  for (const scenario of ["pickup-twin", "pickup-brute", "pickup-cursed-reward"]) {
    await page.goto(`/collision-lab.html?scenario=${scenario}`);
    await page.waitForLoadState("networkidle");
    images.push(await page.locator("#maze").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL()));
    await expect(page.locator("#pickup-status")).toHaveText("MYSTERY BOX · REWARD OR MONSTER?");
  }
  expect(images[1]).toBe(images[0]); expect(images[2]).toBe(images[0]);
  await page.screenshot({ path: test.info().outputPath("mystery-chest.png"), fullPage: true });
});

test("pixel explosions pause, rewind, expire and respect reduced effects", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/collision-lab.html?scenario=fx-enemy-kill");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#events")).toContainText("enemy-killed");
  const particles = await page.locator("#particle-status").textContent();
  const frame = await page.locator("#maze").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  const hash = await page.locator("#hash").textContent();
  await page.waitForTimeout(200);
  await expect(page.locator("#particle-status")).toHaveText(particles!);
  await page.screenshot({ path: test.info().outputPath("enemy-explosion.png"), fullPage: true });
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await expect(page.locator("#particle-status")).toHaveText("Particles: 0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("10");
  await expect(page.locator("#particle-status")).toHaveText(particles!);
  expect(await page.locator("#maze").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())).toBe(frame);
  await page.getByLabel("Reduced particles", { exact: true }).check();
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#hash")).toHaveText(hash!);
  expect(Number((await page.locator("#particle-status").textContent())!.split(": ")[1])).toBeLessThan(Number(particles!.split(": ")[1]));
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#particle-status")).toHaveText("Particles: 0");
  await page.getByLabel("Scenario", { exact: true }).selectOption("fx-player-hit");
  await page.getByLabel("Reduced particles", { exact: true }).uncheck();
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("Gold: hit · 2 lives");
  await page.screenshot({ path: test.info().outputPath("player-hit.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("the brute uses the animated creature art after its arrival", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-brute");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("BRUTE 3/3 HP");
  await page.screenshot({ path: test.info().outputPath("brute-sprite.png"), fullPage: true });
});

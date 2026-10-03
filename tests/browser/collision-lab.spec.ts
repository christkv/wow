import { expect, test } from "@playwright/test";
import { COLLISION_SCENARIOS, collisionBodies, overlapsWall } from "../../src/debug/collision-scenarios";
import { stepWorld } from "../../src/game/simulation";

test("steps, rewinds, and deterministically replays a wall approach", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=wall-east");
  await expect(page.getByRole("heading", { name: "Collision lab" })).toBeVisible();
  await expect(page.locator("#tick")).toContainText("Tick 0");
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#tick")).toContainText("Tick 60");
  await expect(page.locator("#overlap")).toHaveText("No wall overlap");
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await expect(page.locator("#tick")).toContainText("Tick 0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("60");
  await expect(page.locator("#hash")).toHaveText(hash!);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("#time")).toHaveText("0 / 0");
});

test("renders the real simulation's overlap verdict and gate events", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=riftwing-rings-02");
  const spawn = COLLISION_SCENARIOS.find(s => s.id === "riftwing-rings-02")!.create();
  const overlapping = collisionBodies(spawn).filter(b => overlapsWall(spawn.maze, b));
  await expect(page.locator("#overlap")).toHaveText(overlapping.length ? `Wall overlap: ${overlapping.map(b => b.id).join(", ")}` : "No wall overlap");
  await page.screenshot({ path: test.info().outputPath("collision-lab.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("collision-lab-mobile.png"), fullPage: true });
  await page.getByLabel("Scenario", { exact: true }).selectOption("closed-gate");
  const scenario = COLLISION_SCENARIOS.find(s => s.id === "closed-gate")!;
  const world = scenario.create();
  const events = stepWorld(world, scenario.commands(world));
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  for (const event of events) await expect(page.locator("#events")).toContainText(event.type);
  await expect(page.locator("#gate")).toContainText(`${world.gateCooldownTicks} ticks closed`);
});

test("fixed gate and escape scenarios complete in the lab", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=gate-stranding");
  await expect(page.locator("#badge")).toHaveText("Regression check");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#actors")).toContainText("543.75");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#actors")).toContainText("531.25");
  await expect(page.locator("#overlap")).toHaveText("No wall overlap");
  await page.getByLabel("Scenario", { exact: true }).selectOption("riftwing-pit-01");
  await page.getByRole("button", { name: "+600", exact: true }).click();
  await expect(page.locator("#events")).toContainText("riftwing-escaped");
  await page.getByLabel("Scenario", { exact: true }).selectOption("riftwing-rings-02");
  await expect(page.locator("#overlap")).toHaveText("No wall overlap");
});

test("manual direction branches a recorded replay and run can be paused", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=narrow-opening");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#actors")).toContainText("74.00");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByLabel("Gold movement").selectOption("south");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#time")).toHaveText("2 / 2");
  await page.getByLabel("Gold movement").selectOption("east");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#actors")).toContainText("86.50");
  await expect(page.locator("#overlap")).toHaveText("No wall overlap");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.locator("#tick")).not.toContainText("Tick 12 ·");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
});

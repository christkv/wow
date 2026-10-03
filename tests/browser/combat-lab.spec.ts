import { expect, test } from "@playwright/test";

test("a delayed dodge distinguishes previous and balanced timing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/collision-lab.html?scenario=combat-duel&profile=legacy");
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("Gold: hit · 2 lives");
  await page.getByLabel("Combat profile", { exact: true }).selectOption("balanced");
  await expect(page.locator("#tick")).toContainText("Tick 0");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("1 charging · 0 shots");
  await expect(page.locator("#events")).toContainText("enemy-windup");
  await page.screenshot({ path: test.info().outputPath("combat-warning.png"), fullPage: true });
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("Gold: alive · 3 lives");
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("61");
  await expect(page.locator("#hash")).toHaveText(hash!);
  expect(errors).toEqual([]);
});

test("the combat lab shows a buffered press releasing on wall impact", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=combat-long-shot&profile=balanced");
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("queued");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#events")).toContainText("133: shot (gold)");
  await expect(page.locator("#combat-status")).toContainText("1 shots");
});

test("response controls reset a comparison and crossfire reserves two charges", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=combat-crossfire");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("2 charging");
  await page.getByLabel("Dodge response (ms)").fill("400");
  await page.getByLabel("Dodge response (ms)").press("Tab");
  await expect(page.locator("#time")).toHaveText("0 / 0");
  await page.getByLabel("Scenario", { exact: true }).selectOption("combat-succession");
  await page.getByRole("button", { name: "Fire once", exact: true }).click();
  await expect(page.locator("#events")).toContainText("shot (gold)");
});

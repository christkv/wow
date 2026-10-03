import { expect, test } from "@playwright/test";

test("boots and starts a solo dungeon with keyboard control", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game canvas")).toBeVisible();
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
  await page.waitForTimeout(1_200);
  await expect(page.locator("#status")).toContainText("CLEAR THE DUNGEON");
});

test("pauses and restarts without leaving the canvas", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game canvas")).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
  await page.keyboard.press("Escape");
  await expect(page.locator("#status")).toContainText("PAUSED");
  await page.keyboard.press("Escape");
  await expect(page.locator("#status")).not.toContainText("PAUSED");
  await page.keyboard.press("r");
  await expect(page.locator("#status")).toContainText("Dungeon 1");
});

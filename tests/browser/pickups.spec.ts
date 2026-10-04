import { expect, test } from "@playwright/test";

test("mystery box, arrival warning, and brute timer replay deterministically", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/collision-lab.html?scenario=pickup-brute");
  await expect(page.locator("#pickup-status")).toContainText("MYSTERY BOX · REWARD OR MONSTER?");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("BRUTE INCOMING");
  await page.screenshot({ path: test.info().outputPath("brute-arrival.png"), fullPage: true });
  await page.getByRole("button", { name: "+60", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("BRUTE 3/3 HP · 12s");
  await expect(page.locator("#overlap")).toHaveText("No wall overlap");
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("61");
  await expect(page.locator("#hash")).toHaveText(hash!);
  expect(errors).toEqual([]);
});

test("bomb controls consume the charge and preserve the covered enemy", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-bomb");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("GOLD BOMB READY 10s · E / PAD B");
  await page.getByRole("button", { name: "Detonate bomb", exact: true }).click();
  await expect(page.locator("#events")).toContainText("bomb (gold)");
  await expect(page.locator("#combat-status")).toContainText("2 enemies");
  await expect(page.locator("#pickup-status")).not.toContainText("BOMB READY");
  await page.screenshot({ path: test.info().outputPath("bomb-cover.png"), fullPage: true });
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("2");
  await expect(page.locator("#hash")).toHaveText(hash!);
});

test("twin shot and longer cursed rewards are exposed in the lab", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-twin");
  await page.getByRole("button", { name: "Fire once", exact: true }).click();
  await page.getByRole("button", { name: "Fire once", exact: true }).click();
  await expect(page.locator("#combat-status")).toContainText("2 shots");
  await expect(page.locator("#pickup-status")).toContainText("GOLD TWIN SHOT 8s");
  await page.getByLabel("Scenario", { exact: true }).selectOption("pickup-cursed-reward");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("GOLD PIERCING 12s");
});

test("keyboard and controller bomb bindings emit a single press edge", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-bomb");
  const result = await page.evaluate(async () => {
    const path = "/src/input/browser-input.ts";
    const { BrowserInput } = await import(/* @vite-ignore */ path);
    const input = new BrowserInput();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftRight" }));
    const keyboard = input.commands("alliance"), held = input.commands("alliance");
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ShiftRight" }));
    const original = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 1, touched: false, value: i === 1 ? 1 : 0 }));
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [{ index: 0, connected: true, axes: [0, 0], buttons }] });
    const pad = input.commands("alliance"), padHeld = input.commands("alliance");
    if (original) Object.defineProperty(navigator, "getGamepads", original);
    else Reflect.deleteProperty(navigator, "getGamepads");
    input.destroy();
    return { keyboard, held, pad, padHeld };
  });
  expect(result.keyboard.gold.bomb).toBe(true); expect(result.keyboard.cyan.bomb).toBe(true);
  expect(result.held.gold.bomb).toBe(false); expect(result.held.cyan.bomb).toBe(false);
  expect(result.pad.gold.bomb).toBe(true); expect(result.padHeld.gold.bomb).toBe(false);
});

test("production boxes appear without a countdown and persist while paused", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Choose a game mode");
  await page.keyboard.press("4");
  await expect(page.locator("#status")).toContainText("MYSTERY BOX · REWARD OR MONSTER?", { timeout: 15000 });
  await page.keyboard.press("Escape");
  await expect(page.locator("#status")).toContainText("PAUSED");
  const paused = await page.locator("#status").textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator("#status")).toHaveText(paused!);
  await page.screenshot({ path: test.info().outputPath("game-pickup.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.locator("#status")).not.toContainText("PAUSED");
});

test("an uncollected box remains after its former timeout without showing a countdown", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-random");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#pickup-status")).toHaveText("MYSTERY BOX · REWARD OR MONSTER?");
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "+600", exact: true }).click();
  await expect(page.locator("#pickup-status")).toHaveText("MYSTERY BOX · REWARD OR MONSTER?");
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("1201");
  await expect(page.locator("#hash")).toHaveText(hash!);
});

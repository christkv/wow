import { expect, test } from "@playwright/test";

for (const weapon of ["crossfire", "burst", "ricochet"]) {
  test(`${weapon} can be collected, fired, paused, and replayed in the lab`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(`/collision-lab.html?scenario=pickup-${weapon}`);
    await page.getByRole("button", { name: "Fire once", exact: true }).click();
    await expect(page.locator("#pickup-status")).toContainText(`GOLD ${weapon.toUpperCase()} 8s`);
    await page.getByRole("button", { name: "+10", exact: true }).click();
    await page.getByRole("button", { name: "+1 tick", exact: true }).click();
    await page.getByRole("button", { name: "+1 tick", exact: true }).click();
    await expect(page.locator("#combat-status")).toContainText(`${weapon === "crossfire" ? 4 : weapon === "burst" ? 3 : 1} shots`);
    if (weapon === "ricochet") await expect(page.locator("#events")).toContainText("wall-impact");
    const hash = await page.locator("#hash").textContent();
    const status = await page.locator("#pickup-status").textContent();
    await page.waitForTimeout(200);
    await expect(page.locator("#hash")).toHaveText(hash!);
    await expect(page.locator("#pickup-status")).toHaveText(status!);
    await page.screenshot({ path: test.info().outputPath(`${weapon}.png`), fullPage: true });
    await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
    await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("13");
    await expect(page.locator("#hash")).toHaveText(hash!);
    expect(errors).toEqual([]);
  });
}

test("friendly-fire lab compares a lethal ally shot with safe co-op", async ({ page }) => {
  for (const enabled of [true, false]) {
    await page.goto(`/collision-lab.html?scenario=friendly-fire-${enabled ? "on" : "off"}`);
    await page.getByRole("button", { name: "Fire once", exact: true }).click();
    await page.getByRole("button", { name: "+10", exact: true }).click();
    if (enabled) {
      await expect(page.locator("#events")).toContainText("friendly-fire (cyan)");
      await expect(page.locator("#particle-status")).not.toHaveText("Particles: 0");
    } else await expect(page.locator("#events")).not.toContainText("friendly-fire");
  }
});

test("double speed and rapid fire are available in the lab", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-speed");
  await page.getByRole("button", { name: "+1 tick", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("GOLD DOUBLE SPEED 8s");
  await page.getByLabel("Scenario", { exact: true }).selectOption("pickup-rapid");
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await expect(page.locator("#pickup-status")).toContainText("GOLD RAPID FIRE 8s");
  await expect(page.locator("#combat-status")).toContainText("2 shots");
  const hash = await page.locator("#hash").textContent();
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("0");
  await page.getByRole("slider", { name: "Replay recorded ticks" }).fill("10");
  await expect(page.locator("#hash")).toHaveText(hash!);
});

test("keyboard and controller distinguish held rapid fire from a normal fire press", async ({ page }) => {
  await page.goto("/collision-lab.html?scenario=pickup-rapid");
  const result = await page.evaluate(async () => {
    const path = "/src/input/browser-input.ts";
    const { BrowserInput } = await import(/* @vite-ignore */ path);
    const input = new BrowserInput();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyF" }));
    const press = input.commands("alliance"), held = input.commands("alliance");
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyF" }));
    const release = input.commands("alliance");
    const original = Object.getOwnPropertyDescriptor(navigator, "getGamepads");
    const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, touched: false, value: i === 0 ? 1 : 0 }));
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [{ index: 0, connected: true, axes: [0, 0], buttons }] });
    const padPress = input.commands("alliance"), padHeld = input.commands("alliance");
    buttons[0]!.pressed = false;
    const padRelease = input.commands("alliance");
    if (original) Object.defineProperty(navigator, "getGamepads", original); else Reflect.deleteProperty(navigator, "getGamepads");
    input.destroy(); return { press, held, release, padPress, padHeld, padRelease };
  });
  for (const press of [result.press, result.padPress]) expect(press.gold).toMatchObject({ fire: true, fireHeld: true });
  for (const held of [result.held, result.padHeld]) expect(held.gold).toMatchObject({ fire: false, fireHeld: true });
  for (const release of [result.release, result.padRelease]) expect(release.gold).toMatchObject({ fire: false, fireHeld: false });
});

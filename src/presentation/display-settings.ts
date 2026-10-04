import type { GameSettings } from "../persistence/settings";

export function applyDisplaySettings(settings: GameSettings): void {
  const game = document.getElementById("game");
  if (game) game.dataset.crt = settings.crtScanlines ? "on" : "off";
}

/** Align the non-interactive CRT overlay with the fitted canvas, including letterboxing. */
export function installDisplayEffects(container: HTMLElement): () => void {
  let frame = 0;
  const layout = (): void => {
    const canvas = container.querySelector("canvas");
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect(), parent = container.getBoundingClientRect();
    container.style.setProperty("--screen-left", `${bounds.left - parent.left}px`);
    container.style.setProperty("--screen-top", `${bounds.top - parent.top}px`);
    container.style.setProperty("--screen-width", `${bounds.width}px`);
    container.style.setProperty("--screen-height", `${bounds.height}px`);
  };
  const schedule = (): void => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); };
  const resize = new ResizeObserver(schedule);
  resize.observe(container);
  const observeCanvas = (): void => {
    const canvas = container.querySelector("canvas");
    if (canvas) { resize.observe(canvas); schedule(); }
  };
  const children = new MutationObserver(observeCanvas);
  children.observe(container, { childList: true });
  observeCanvas();
  window.addEventListener("resize", schedule);
  document.addEventListener("fullscreenchange", schedule);
  return () => {
    cancelAnimationFrame(frame); resize.disconnect(); children.disconnect();
    window.removeEventListener("resize", schedule);
    document.removeEventListener("fullscreenchange", schedule);
  };
}

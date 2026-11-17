import type { Voice } from "@/lib/content-keys";
import type { PlayerCtx } from "./types";

export type SceneSky = "eve" | "night" | undefined;

export function setSky(sc: HTMLElement, sky?: string) {
  sc.classList.remove("eve", "night");
  if (sky) sc.classList.add(sky);
}

export function showBubble(sc: HTMLElement, text: string, x: number) {
  const b = sc.querySelector<HTMLElement>(".bubble");
  if (!b) return;
  b.textContent = text;
  b.hidden = false;
  const W = sc.clientWidth;
  const w = b.offsetWidth;
  const cx = (W * x) / 400;
  const left = Math.max(8, Math.min(cx - w / 2, W - w - 14));
  b.style.left = left + "px";
  b.style.setProperty("--tail", Math.max(14, Math.min(cx - left - 8, w - 34)) + "px");
  b.classList.remove("pop");
  void b.offsetWidth;
  b.classList.add("pop");
}

export function hideBubble(sc: HTMLElement | null) {
  const b = sc?.querySelector<HTMLElement>(".bubble");
  if (b) b.hidden = true;
}

export const actorEl = (sc: HTMLElement, who: string) => sc.querySelector<HTMLElement>(`.char[data-who="${who}"]`);

/** Nhân vật nói một câu: hiện bong bóng, mở miệng, phát tiếng, rồi thôi. */
export async function actorLine(ctx: PlayerCtx, sc: HTMLElement, who: string, slug: string, voice: Voice) {
  const ch = actorEl(sc, who);
  if (ch) {
    showBubble(sc, ctx.textOf(slug), Number(ch.dataset.x));
    ch.classList.add("talking");
  }
  await ctx.say(slug, voice);
  ch?.classList.remove("talking");
}

export function setMood(el: Element | null, mood: string) {
  if (el instanceof HTMLElement) el.dataset.mood = mood;
}

export function restartAnim(el: Element, cls: string) {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

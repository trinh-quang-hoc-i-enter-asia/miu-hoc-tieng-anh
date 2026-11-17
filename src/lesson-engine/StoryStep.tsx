"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StoryStep as Story } from "@/lib/lesson-schema";
import type { PlayerCtx } from "./types";
import { wait } from "./types";
import { bg, cat, pup, propSvg, ICONS } from "./art";
import { actorLine, hideBubble, setMood, setSky } from "./scene";
import { sfx, preload } from "./audio";
import { collectPhraseSlugs } from "@/lib/phrase-refs";

/** Bước 1: xem tình huống. Cảnh minh họa 2–4 khung, bé chạm để sang khung tiếp theo. */
export function StoryStep({ step, ctx, onDone }: { step: Story; ctx: PlayerCtx; onDone: () => void }) {
  const scRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [hint, setHint] = useState(false);
  const frameRef = useRef(0);

  const svg = useMemo(() => {
    const props = step.props.map((p) => `<g data-prop="${p.id}">${propSvg(p.kind)}</g>`).join("");
    const actors = step.actors
      .map((a) => {
        const look = { x: a.x, y: a.y, s: a.s, flip: a.flip, who: a.id, fur: a.fur, ear: a.ear, shirt: a.shirt };
        return a.kind === "cat" ? cat(look) : pup(look);
      })
      .join("");
    return `<svg viewBox="0 0 400 300" role="img" aria-label="${step.aria.replace(/"/g, "&quot;")}">${bg()}${props}${actors}</svg><div class="bubble" hidden></div>`;
  }, [step]);

  const voiceOf = (who: string) => step.actors.find((a) => a.id === who)?.voice ?? "miu";

  async function play(id: number, again: boolean) {
    const sc = scRef.current;
    if (!sc) return;
    const f = step.frames[frameRef.current];
    setSky(sc, f.sky);
    sc.querySelectorAll<HTMLElement>(".char").forEach((c) => {
      c.classList.toggle("waving", f.pose === "wave");
      c.classList.toggle("hi", f.pose === "hi");
      c.classList.remove("talking");
      setMood(c, f.mood?.[c.dataset.who ?? ""] ?? "neutral");
    });
    sc.querySelectorAll<HTMLElement>("[data-prop]").forEach((g) => {
      g.style.display = f.show?.includes(g.dataset.prop ?? "") ? "" : "none";
    });
    hideBubble(sc);
    setHint(false);
    await wait(again ? 80 : 300);
    if (!ctx.alive(id)) return;
    setCaption(ctx.textOf(f.vi));
    if (!again) {
      await ctx.say(f.vi, "guide");
      if (!ctx.alive(id)) return;
    }
    for (const l of f.lines) {
      await actorLine(ctx, sc, l.who, l.phrase, voiceOf(l.who));
      if (!ctx.alive(id)) return;
      await wait(350);
      if (!ctx.alive(id)) return;
    }
    setHint(true);
  }

  useEffect(() => {
    const id = ctx.newRun();
    frameRef.current = 0;
    void preload(ctx.pack, collectPhraseSlugs(step)).then(() => {
      if (ctx.alive(id)) void play(id, false);
    });
    return () => {
      ctx.newRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function next() {
    sfx.tap();
    frameRef.current += 1;
    if (frameRef.current >= step.frames.length) {
      onDone();
      return;
    }
    void play(ctx.newRun(), false);
  }

  function onSceneClick(e: React.MouseEvent) {
    const ch = (e.target as HTMLElement).closest<HTMLElement>(".char");
    if (!ch || !scRef.current) return;
    const who = ch.dataset.who ?? "";
    const line = step.frames[frameRef.current].lines.find((l) => l.who === who);
    if (!line) return;
    ctx.newRun();
    void actorLine(ctx, scRef.current, who, line.phrase, voiceOf(who));
  }

  return (
    <>
      <div ref={scRef} className="scene" onClick={onSceneClick} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="caption" aria-live="polite">{caption}</p>
      <div className="controls">
        <button className="big ghost" aria-label="Nghe lại" onClick={() => void play(ctx.newRun(), true)} dangerouslySetInnerHTML={{ __html: ICONS.sound }} />
        <button className={`big${hint ? " hint" : ""}`} aria-label="Sang cảnh tiếp theo" onClick={next} dangerouslySetInnerHTML={{ __html: ICONS.next }} />
      </div>
    </>
  );
}


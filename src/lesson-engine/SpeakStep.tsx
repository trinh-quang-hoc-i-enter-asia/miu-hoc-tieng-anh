"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeakStep as Speak } from "@/lib/lesson-schema";
import { UI } from "@/lib/instructions";
import type { PlayerCtx } from "./types";
import { wait } from "./types";
import { bg, cat, ICONS } from "./art";
import { actorLine, hideBubble, setMood } from "./scene";
import { sfx, preload, ensureMic, record, playBlob, releaseMic } from "./audio";
import { collectPhraseSlugs } from "@/lib/phrase-refs";

/** Bước 3: Miu nói mẫu, bé nói theo và nghe lại giọng mình (nếu thiết bị cho thu âm). */
export function SpeakStep({ step, ctx, onDone }: { step: Speak; ctx: PlayerCtx; onDone: () => void }) {
  const scRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [hint, setHint] = useState(false);
  const [rec, setRec] = useState(false);
  const [noMic, setNoMic] = useState(false);
  const roundRef = useRef(0);
  const lockedRef = useRef(true);

  const svg = useMemo(
    () =>
      `<svg viewBox="0 0 400 300" role="img" aria-label="Mèo Miu nói mẫu">${bg()}${cat({ x: 200, y: 292, s: 1.45 })}</svg><div class="bubble" hidden></div>`,
    [],
  );

  const tell = async (slug: string) => {
    setCaption(ctx.textOf(slug));
    await ctx.say(slug, "guide");
  };

  async function round(id: number) {
    const it = step.items[roundRef.current];
    const sc = scRef.current;
    if (!sc) return;
    lockedRef.current = true;
    setHint(false);
    setRec(false);
    hideBubble(sc);
    setMood(sc.querySelector(".char"), it.mood ?? "neutral");
    await wait(250);
    if (!ctx.alive(id)) return;
    await tell(roundRef.current === 0 ? UI.sayIntro : UI.sayNext);
    if (!ctx.alive(id)) return;
    await actorLine(ctx, sc, "miu", it.phrase, "miu");
    if (!ctx.alive(id)) return;
    lockedRef.current = false;
    setHint(true);
    await tell(UI.sayTurn);
  }

  useEffect(() => {
    const id = ctx.newRun();
    roundRef.current = 0;
    void preload(ctx.pack, collectPhraseSlugs(step)).then(() => {
      if (ctx.alive(id)) void round(id);
    });
    return () => {
      ctx.newRun();
      releaseMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function replay() {
    if (rec) return;
    const sc = scRef.current;
    if (!sc) return;
    const id = ctx.newRun();
    await actorLine(ctx, sc, "miu", step.items[roundRef.current].phrase, "miu");
    if (!ctx.alive(id)) return;
    lockedRef.current = false;
    setHint(true);
  }

  async function micTurn() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    const id = ctx.newRun();
    const it = step.items[roundRef.current];
    const sc = scRef.current!;
    setHint(false);
    const ok = await ensureMic();
    if (!ctx.alive(id)) return;
    if (!ok) setNoMic(true);
    setRec(true);
    sfx.tap();
    setCaption(ok ? "Miu đang nghe con nói…" : "Con nói to lên nào!");
    let blob: Blob | null = null;
    if (ok) blob = await record(3200);
    else await wait(3200);
    setRec(false);
    if (!ctx.alive(id)) return;
    let heard = false;
    if (blob) {
      setCaption("Nghe lại giọng con nhé!");
      await wait(250);
      heard = await playBlob(blob);
      if (!ctx.alive(id)) return;
    }
    if (!heard) {
      setCaption("Nghe Miu nói lại nhé!");
      await actorLine(ctx, sc, "miu", it.phrase, "miu");
      if (!ctx.alive(id)) return;
    }
    sfx.ok();
    ctx.addStar();
    ctx.emit("spoken", { stepType: "speak", phraseSlug: it.phrase });
    await wait(300);
    if (!ctx.alive(id)) return;
    await tell(ctx.praise());
    if (!ctx.alive(id)) return;
    roundRef.current += 1;
    if (roundRef.current >= step.items.length) {
      onDone();
      return;
    }
    void round(id);
  }

  return (
    <>
      <div ref={scRef} className="scene" style={{ ["--reserve" as string]: "330px" }}
        onClick={() => void replay()} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="caption" aria-live="polite">{caption}</p>
      {noMic && (
        <p className="note">Thiết bị chưa cho phép thu âm, nên bé chỉ nói theo Miu chứ chưa nghe lại được giọng mình.</p>
      )}
      <div className="controls">
        <button className="big ghost" aria-label="Nghe Miu nói lại" onClick={() => void replay()} dangerouslySetInnerHTML={{ __html: ICONS.sound }} />
        <button
          className={`big${hint ? " hint" : ""}${rec ? " rec" : ""}`}
          aria-label="Đến lượt bé nói"
          onClick={() => void micTurn()}
          dangerouslySetInnerHTML={{ __html: ICONS.mic }}
        />
      </div>
    </>
  );
}

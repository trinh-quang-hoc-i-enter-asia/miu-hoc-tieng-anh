"use client";
import { useEffect, useRef, useState } from "react";
import type { ListenStep as Listen } from "@/lib/lesson-schema";
import { PIC_LABELS, type PicKey } from "@/lib/content-keys";
import { UI } from "@/lib/instructions";
import type { PlayerCtx } from "./types";
import { wait } from "./types";
import { picSvg, ICONS } from "./art";
import { sfx, preload } from "./audio";
import { collectPhraseSlugs } from "@/lib/phrase-refs";

/** Bước 2: nghe một câu rồi chạm vào hình đúng. Chọn sai thì thẻ lắc và câu được đọc lại. */
export function ListenStep({ step, ctx, onDone }: { step: Listen; ctx: PlayerCtx; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const [caption, setCaption] = useState("");
  const [mark, setMark] = useState<{ opt: string; kind: "right" | "wrong"; n: number } | null>(null);
  const lockedRef = useRef(true);
  const roundRef = useRef(0);

  const tell = async (slug: string) => {
    setCaption(ctx.textOf(slug));
    await ctx.say(slug, "guide");
  };

  async function start(id: number, first: boolean) {
    const r = step.rounds[roundRef.current];
    setMark(null);
    lockedRef.current = false;
    await wait(200);
    if (!ctx.alive(id)) return;
    if (first) {
      await tell(UI.tipListen);
      if (!ctx.alive(id)) return;
    } else setCaption(ctx.textOf(UI.tipListen));
    await ctx.say(r.phrase, r.voice);
  }

  useEffect(() => {
    const id = ctx.newRun();
    roundRef.current = 0;
    void preload(ctx.pack, collectPhraseSlugs(step)).then(() => {
      if (ctx.alive(id)) void start(id, true);
    });
    return () => {
      ctx.newRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(opt: PicKey) {
    if (lockedRef.current) return;
    const r = step.rounds[roundRef.current];
    const id = ctx.newRun();
    if (opt !== r.answer) {
      sfx.no();
      ctx.emit("answer_wrong", { stepType: "listen", phraseSlug: r.phrase });
      setMark((m) => ({ opt, kind: "wrong", n: (m?.n ?? 0) + 1 }));
      await wait(550);
      if (!ctx.alive(id)) return;
      setCaption(ctx.textOf(UI.listenAgain));
      await ctx.say(r.phrase, r.voice);
      return;
    }
    lockedRef.current = true;
    setMark({ opt, kind: "right", n: 0 });
    sfx.ok();
    ctx.addStar();
    ctx.emit("answer_correct", { stepType: "listen", phraseSlug: r.phrase });
    await wait(350);
    if (!ctx.alive(id)) return;
    await tell(ctx.praise());
    if (!ctx.alive(id)) return;
    await wait(250);
    if (!ctx.alive(id)) return;
    roundRef.current += 1;
    if (roundRef.current >= step.rounds.length) {
      onDone();
      return;
    }
    setRound(roundRef.current);
    void start(id, false);
  }

  const r = step.rounds[round];
  return (
    <>
      <div className="listen">
        <button
          className="big"
          aria-label="Nghe lại câu"
          onClick={() => {
            // Đang chấm đúng thì bỏ qua để không cắt ngang lời khen và vòng kế tiếp.
            if (lockedRef.current) return;
            ctx.newRun();
            void ctx.say(r.phrase, r.voice);
          }}
          dangerouslySetInnerHTML={{ __html: ICONS.sound }}
        />
      </div>
      <p className="caption" aria-live="polite">{caption}</p>
      <div className="choices">
        {r.options.map((o) => (
          <button
            key={`${round}-${o}`}
            className={`card${mark?.opt === o ? ` ${mark.kind}` : ""}`}
            aria-label={PIC_LABELS[o]}
            onClick={() => void pick(o)}
            dangerouslySetInnerHTML={{ __html: picSvg(o) }}
          />
        ))}
      </div>
    </>
  );
}

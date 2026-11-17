"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameStep as Game } from "@/lib/lesson-schema";
import { PIC_LABELS, type PicKey } from "@/lib/content-keys";
import { UI } from "@/lib/instructions";
import type { PlayerCtx } from "./types";
import { wait } from "./types";
import { bg, house, cat, pup, ball, bowl, pillow, picSvg } from "./art";
import { actorEl, actorLine, hideBubble, setMood, setSky } from "./scene";
import { sfx, preload } from "./audio";
import { collectPhraseSlugs } from "@/lib/phrase-refs";

type Props = { step: Game; ctx: PlayerCtx; onDone: () => void };

/** Bước 4: trò chơi. Mỗi kiểu trò chơi là một thành phần riêng, chọn theo `kind` của bước. */
export function GameStep(props: Props) {
  return props.step.kind === "greet" ? <GreetGame {...props} step={props.step} /> : <GiveGame {...props} step={props.step} />;
}

type Mark = { opt: string; kind: "right" | "wrong"; n: number } | null;

// ---------- Trò "Bạn đến thì chào, bạn về thì tạm biệt" ----------
function GreetGame({ step, ctx, onDone }: Props & { step: Extract<Game, { kind: "greet" }> }) {
  const scRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [mark, setMark] = useState<Mark>(null);
  const roundRef = useRef(0);
  const lockedRef = useRef(true);

  const svg = useMemo(
    () => `<svg viewBox="0 0 400 300" role="img" aria-label="Miu đứng trước nhà, các bạn đến chơi rồi ra về">
      ${bg()}${house()}${cat({ x: 174, y: 268, s: 0.9 })}
      <g class="walker" data-f="a">${pup({ x: 270, y: 268, s: 0.9, flip: true, who: "a" })}</g>
      <g class="walker" data-f="b">${pup({ x: 346, y: 268, s: 0.9, flip: true, who: "b", fur: "#DDD6CE", ear: "#77706B", shirt: "#F27BA5" })}</g>
    </svg><div class="bubble" hidden></div>`,
    [],
  );

  const tell = async (slug: string) => {
    setCaption(ctx.textOf(slug));
    await ctx.say(slug, "guide");
  };

  async function start(id: number) {
    const sc = scRef.current;
    if (!sc) return;
    const g = step.rounds[roundRef.current];
    const w = sc.querySelector<HTMLElement>(`.walker[data-f="${g.f}"]`)!;
    const ch = w.querySelector<HTMLElement>(".char")!;
    lockedRef.current = true;
    hideBubble(sc);
    setCaption("");
    setMark(null);
    setSky(sc, g.t === "out" ? "eve" : undefined);
    await wait(250);
    if (!ctx.alive(id)) return;
    if (g.t === "in") {
      w.classList.add("here");
      ch.classList.add("waving");
      await wait(1000);
    } else {
      ch.classList.add("waving");
      await wait(800);
    }
    if (!ctx.alive(id)) return;
    lockedRef.current = false;
    await tell(g.t === "in" ? step.promptIn : step.promptOut);
  }

  useEffect(() => {
    const id = ctx.newRun();
    roundRef.current = 0;
    void preload(ctx.pack, collectPhraseSlugs(step)).then(() => {
      if (ctx.alive(id)) void start(id);
    });
    return () => {
      ctx.newRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(opt: "hello" | "bye") {
    if (lockedRef.current) return;
    const sc = scRef.current!;
    const g = step.rounds[roundRef.current];
    const want = g.t === "in" ? "hello" : "bye";
    const phrase = want === "hello" ? step.hello : step.bye;
    const id = ctx.newRun();
    if (opt !== want) {
      sfx.no();
      ctx.emit("answer_wrong", { stepType: "game", phraseSlug: phrase });
      setMark((m) => ({ opt, kind: "wrong", n: (m?.n ?? 0) + 1 }));
      await wait(450);
      if (!ctx.alive(id)) return;
      await tell(UI.tryAgain);
      return;
    }
    lockedRef.current = true;
    setMark({ opt, kind: "right", n: 0 });
    sfx.ok();
    ctx.addStar();
    ctx.emit("answer_correct", { stepType: "game", phraseSlug: phrase });
    const miu = actorEl(sc, "miu")!;
    const w = sc.querySelector<HTMLElement>(`.walker[data-f="${g.f}"]`)!;
    const ch = w.querySelector<HTMLElement>(".char")!;
    miu.classList.add("waving");
    await wait(400);
    if (!ctx.alive(id)) return;
    await actorLine(ctx, sc, "miu", phrase, "miu");
    if (!ctx.alive(id)) return;
    await wait(200);
    if (!ctx.alive(id)) return;
    await actorLine(ctx, sc, g.f, phrase, g.f === "a" ? "ben" : "friend");
    if (!ctx.alive(id)) return;
    miu.classList.remove("waving");
    ch.classList.remove("waving");
    hideBubble(sc);
    setMark(null);
    if (g.t === "out") {
      w.classList.remove("here");
      await wait(900);
    } else await wait(400);
    if (!ctx.alive(id)) return;
    roundRef.current += 1;
    if (roundRef.current >= step.rounds.length) {
      onDone();
      return;
    }
    void start(id);
  }

  const cards: [PicKey & ("hello" | "bye"), string][] = [
    ["hello", "Chào bạn: Hello"],
    ["bye", "Tạm biệt bạn: Goodbye"],
  ];
  return (
    <>
      <div ref={scRef} className="scene" style={{ ["--reserve" as string]: "400px" }} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="caption" aria-live="polite">{caption}</p>
      <div className="choices small">
        {cards.map(([k, label]) => (
          <button
            key={k}
            className={`card${mark?.opt === k ? ` ${mark.kind}` : ""}`}
            aria-label={label}
            onClick={() => void pick(k)}
            dangerouslySetInnerHTML={{ __html: picSvg(k) }}
          />
        ))}
      </div>
    </>
  );
}

// ---------- Trò "Miu cần gì thì đưa cho Miu" ----------
const GIFTS: Record<string, string> = {
  fish: bowl(312, 262, 1.5, true),
  pillow: pillow(314, 262, 1.5),
  ball: ball(312, 256, 1.7),
};

function GiveGame({ step, ctx, onDone }: Props & { step: Extract<Game, { kind: "give" }> }) {
  const scRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [mark, setMark] = useState<Mark>(null);
  const roundRef = useRef(0);
  const lockedRef = useRef(true);

  const svg = useMemo(
    () => `<svg viewBox="0 0 400 300" role="img" aria-label="Mèo Miu đang cần một thứ">
      ${bg()}
      ${Object.entries(GIFTS).map(([k, g]) => `<g class="gift" data-gift="${k}">${g}</g>`).join("")}
      ${cat({ x: 176, y: 288, s: 1.25 })}
    </svg><div class="bubble" hidden></div>`,
    [],
  );

  const tell = async (slug: string) => {
    setCaption(ctx.textOf(slug));
    await ctx.say(slug, "guide");
  };

  async function start(id: number) {
    const sc = scRef.current;
    if (!sc) return;
    const r = step.rounds[roundRef.current];
    const miu = actorEl(sc, "miu")!;
    lockedRef.current = true;
    hideBubble(sc);
    setCaption("");
    setMark(null);
    setSky(sc, undefined);
    sc.querySelectorAll(".gift").forEach((g) => g.classList.remove("on"));
    miu.classList.remove("waving");
    setMood(miu, r.mood);
    await wait(300);
    if (!ctx.alive(id)) return;
    if (roundRef.current === 0) {
      await tell(step.intro);
      if (!ctx.alive(id)) return;
    }
    setCaption("Miu cần gì nhỉ?");
    lockedRef.current = false;
    await actorLine(ctx, sc, "miu", r.say, "miu");
  }

  useEffect(() => {
    const id = ctx.newRun();
    roundRef.current = 0;
    void preload(ctx.pack, collectPhraseSlugs(step)).then(() => {
      if (ctx.alive(id)) void start(id);
    });
    return () => {
      ctx.newRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(opt: "fish" | "pillow" | "ball") {
    if (lockedRef.current) return;
    const sc = scRef.current!;
    const r = step.rounds[roundRef.current];
    const id = ctx.newRun();
    const miu = actorEl(sc, "miu")!;
    if (opt !== r.need) {
      sfx.no();
      ctx.emit("answer_wrong", { stepType: "game", phraseSlug: r.say });
      setMark((m) => ({ opt, kind: "wrong", n: (m?.n ?? 0) + 1 }));
      await wait(450);
      if (!ctx.alive(id)) return;
      setCaption(ctx.textOf(UI.listenAgain));
      await actorLine(ctx, sc, "miu", r.say, "miu");
      return;
    }
    lockedRef.current = true;
    setMark({ opt, kind: "right", n: 0 });
    sfx.ok();
    ctx.addStar();
    ctx.emit("answer_correct", { stepType: "game", phraseSlug: r.say });
    hideBubble(sc);
    sc.querySelector(`.gift[data-gift="${opt}"]`)?.classList.add("on");
    if (opt === "pillow") {
      setSky(sc, "night");
      setMood(miu, "sleepy");
    } else {
      setMood(miu, "happy");
      if (opt === "ball") miu.classList.add("waving");
    }
    await wait(700);
    if (!ctx.alive(id)) return;
    await tell(ctx.praise());
    if (!ctx.alive(id)) return;
    await wait(700);
    if (!ctx.alive(id)) return;
    setMark(null);
    roundRef.current += 1;
    if (roundRef.current >= step.rounds.length) {
      onDone();
      return;
    }
    void start(id);
  }

  const items: ("fish" | "pillow" | "ball")[] = ["fish", "pillow", "ball"];
  return (
    <>
      <div
        ref={scRef}
        className="scene"
        style={{ ["--reserve" as string]: "380px" }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".char") && !lockedRef.current) {
            ctx.newRun();
            void actorLine(ctx, scRef.current!, "miu", step.rounds[roundRef.current].say, "miu");
          }
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="caption" aria-live="polite">{caption}</p>
      <div className="choices three">
        {items.map((k) => (
          <button
            key={k}
            className={`card${mark?.opt === k ? ` ${mark.kind}` : ""}`}
            aria-label={PIC_LABELS[`item-${k}` as PicKey]}
            onClick={() => void pick(k)}
            dangerouslySetInnerHTML={{ __html: picSvg(`item-${k}`) }}
          />
        ))}
      </div>
    </>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { RewardStep as Reward } from "@/lib/lesson-schema";
import type { PlayerCtx } from "./types";
import { wait } from "./types";
import { badgeSvg, ICONS } from "./art";
import { sfx } from "./audio";

const COLORS = ["#FFCB3C", "#FF5A4E", "#3DBE8B", "#4C8DF6", "#F27BA5", "#FFFDF6"];

/** Bước 5: huy hiệu, số sao, giấy màu rơi, rồi chọn học lại, về bản đồ hoặc học bài kế tiếp. */
export function RewardStep({
  step, ctx, onAgain, homeHref, nextHref, nextLabel,
}: {
  step: Reward;
  ctx: PlayerCtx;
  onAgain: () => void;
  homeHref: string;
  nextHref?: string;
  nextLabel?: string;
}) {
  const [caption, setCaption] = useState(ctx.textOf(step.done));
  const stars = ctx.getStars();
  const confetti = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.round(Math.random() * 96),
        color: COLORS[i % COLORS.length],
        delay: (Math.random() * 0.7).toFixed(2),
      })),
    [],
  );

  useEffect(() => {
    const id = ctx.newRun();
    void (async () => {
      sfx.win();
      await wait(700);
      if (!ctx.alive(id)) return;
      setCaption(ctx.textOf(step.done));
      await ctx.say(step.done, "guide");
      if (!ctx.alive(id)) return;
      await ctx.say(step.bye, "miu");
    })();
    return () => {
      ctx.newRun();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <i key={i} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }} />
        ))}
      </div>
      <div className="badge" dangerouslySetInnerHTML={{ __html: badgeSvg(step.badge) }} />
      <p className="caption" aria-live="polite">{caption}</p>
      <p className="count" aria-label={`${stars} ngôi sao`}>
        <span dangerouslySetInnerHTML={{ __html: ICONS.star }} style={{ display: "contents" }} />
        <span>{stars}</span>
      </p>
      <div className="controls">
        <button className="big ghost" aria-label="Học lại bài này" onClick={onAgain} dangerouslySetInnerHTML={{ __html: ICONS.again }} />
        <Link className="big ghost" href={homeHref} aria-label="Về bản đồ" dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        {nextHref && (
          <Link className="big hint" href={nextHref} aria-label={`Học bài tiếp theo: ${nextLabel ?? ""}`} dangerouslySetInnerHTML={{ __html: ICONS.next }} />
        )}
      </div>
    </>
  );
}

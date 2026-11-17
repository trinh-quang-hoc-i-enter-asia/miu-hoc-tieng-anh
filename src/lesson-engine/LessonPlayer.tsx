"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LessonPack } from "@/lib/pack-types";
import type { Voice } from "@/lib/content-keys";
import { UI } from "@/lib/instructions";
import type { StoryStep as StoryCfg, ListenStep as ListenCfg, SpeakStep as SpeakCfg, GameStep as GameCfg, RewardStep as RewardCfg } from "@/lib/lesson-schema";
import type { EventKind, PlayerCtx } from "./types";
import { bg, cat, ICONS } from "./art";
import { playPhrase, stopAudio, unlockAudio, hasSpeech, sfx } from "./audio";
import { enqueue, flush, startAutoFlush, uuid } from "./sync";
import { StoryStep } from "./StoryStep";
import { ListenStep } from "./ListenStep";
import { SpeakStep } from "./SpeakStep";
import { GameStep } from "./GameStep";
import { RewardStep } from "./RewardStep";

type Props = {
  pack: LessonPack;
  /** Không có childId nghĩa là xem trước: không ghi tiến độ. */
  childId?: string;
  startStep?: number;
  homeHref: string;
  nextHref?: string;
  nextLabel?: string;
  preview?: boolean;
};

const STEP_NAMES = ["Xem tình huống", "Nghe và chạm", "Nói theo", "Trò chơi", "Phần thưởng"];

export function LessonPlayer({ pack, childId, startStep = 0, homeHref, nextHref, nextLabel, preview }: Props) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(startStep);
  const [runKey, setRunKey] = useState(0);
  const [stars, setStars] = useState(0);

  const runRef = useRef(0);
  const starsRef = useRef(0);
  const praiseRef = useRef(0);
  const stepStartRef = useRef({ activeMs: 0, since: 0 });

  useEffect(() => {
    if (childId) startAutoFlush();
  }, [childId]);

  // Thời gian học chỉ tính lúc trang đang hiện, tối đa 10 phút một bước.
  useEffect(() => {
    const onVis = () => {
      const s = stepStartRef.current;
      if (document.hidden && s.since) {
        s.activeMs += Date.now() - s.since;
        s.since = 0;
      } else if (!document.hidden && !s.since) s.since = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const emit = useCallback(
    (kind: EventKind, extra: { stepType?: string; phraseSlug?: string; payload?: Record<string, number | boolean> } = {}) => {
      if (!childId) return;
      const ev = {
        id: uuid(),
        lessonId: pack.lesson.id,
        lessonVersion: pack.lesson.version,
        kind,
        stepType: extra.stepType,
        phraseSlug: extra.phraseSlug,
        occurredAt: new Date().toISOString(),
        payload: extra.payload,
      };
      void enqueue(childId, ev).then(() => {
        if (kind === "step_complete" || kind === "lesson_complete") void flush();
      });
    },
    [childId, pack.lesson.id, pack.lesson.version],
  );

  const ctx = useMemo<PlayerCtx>(
    () => ({
      pack,
      newRun() {
        stopAudio();
        runRef.current += 1;
        return runRef.current;
      },
      alive: (id) => id === runRef.current,
      say: (slug, voice: Voice = "guide") => playPhrase(pack, slug, voice),
      textOf: (slug) => pack.phrases[slug]?.text ?? "",
      praise() {
        const slug = UI.praise[praiseRef.current % UI.praise.length];
        praiseRef.current += 1;
        return slug;
      },
      addStar() {
        starsRef.current += 1;
        setStars(starsRef.current);
      },
      getStars: () => starsRef.current,
      emit,
    }),
    [pack, emit],
  );

  function beginStep(i: number) {
    stepStartRef.current = { activeMs: 0, since: Date.now() };
    setStep(i);
  }

  function start() {
    unlockAudio();
    sfx.tap();
    stepStartRef.current = { activeMs: 0, since: Date.now() };
    emit("lesson_start", { payload: { resumed: startStep > 0 } });
    setStarted(true);
  }

  function done(i: number) {
    const s = stepStartRef.current;
    const ms = s.activeMs + (s.since ? Date.now() - s.since : 0);
    emit("step_complete", {
      stepType: pack.steps[i].type,
      payload: { stepIndex: i, seconds: Math.min(600, Math.round(ms / 1000)), stars: starsRef.current },
    });
    if (i + 1 === pack.steps.length - 1) emit("lesson_complete", { payload: { stars: starsRef.current } });
    beginStep(i + 1);
  }

  function again() {
    ctx.newRun();
    starsRef.current = 0;
    setStars(0);
    praiseRef.current = 0;
    setRunKey((k) => k + 1);
    emit("lesson_start", { payload: { resumed: false } });
    beginStep(0);
  }

  function jump(i: number) {
    if (!preview) return;
    ctx.newRun();
    sfx.tap();
    beginStep(i);
  }

  const s = pack.steps[step];
  const key = `${runKey}-${step}`;

  return (
    <div className="kid-app">
      <header className="bar">
        <Link className="iconbtn" href={homeHref} aria-label="Về bản đồ" onClick={() => ctx.newRun()} dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        <nav className="steps" aria-label="Các bước của bài học">
          {STEP_NAMES.map((name, n) => (
            <button
              key={name}
              className={n < step ? "done" : n === step ? "now" : ""}
              aria-label={`Bước ${n + 1}: ${name}`}
              aria-current={n === step ? "step" : undefined}
              disabled={!preview}
              onClick={() => jump(n)}
            />
          ))}
        </nav>
        <div className={`stars${stars ? "" : ""}`} aria-label="Số sao của bé">
          <span dangerouslySetInnerHTML={{ __html: ICONS.star }} style={{ display: "contents" }} />
          <b>{stars}</b>
        </div>
      </header>

      <main className="kid-stage">
        {!started ? (
          <StartScreen pack={pack} onStart={start} />
        ) : s.type === "story" ? (
          <StoryStep key={key} step={s as StoryCfg} ctx={ctx} onDone={() => done(0)} />
        ) : s.type === "listen" ? (
          <ListenStep key={key} step={s as ListenCfg} ctx={ctx} onDone={() => done(1)} />
        ) : s.type === "speak" ? (
          <SpeakStep key={key} step={s as SpeakCfg} ctx={ctx} onDone={() => done(2)} />
        ) : s.type === "game" ? (
          <GameStep key={key} step={s as GameCfg} ctx={ctx} onDone={() => done(3)} />
        ) : (
          <RewardStep
            key={key}
            step={s as RewardCfg}
            ctx={ctx}
            onAgain={again}
            homeHref={homeHref}
            nextHref={nextHref}
            nextLabel={nextLabel}
          />
        )}
      </main>
    </div>
  );
}

/** Màn hình đầu bài: một lần chạm của bé để trình duyệt cho phép phát tiếng. */
function StartScreen({ pack, onStart }: { pack: LessonPack; onStart: () => void }) {
  // Chỉ biết thiết bị có giọng đọc hay không sau khi trang chạy trong trình duyệt; kiểm tra lúc dựng HTML trên
  // máy chủ sẽ không khớp lúc hiển thị và gây lỗi hydration.
  const [speech, setSpeech] = useState(true);
  useEffect(() => setSpeech(hasSpeech()), []);
  const svg = useMemo(
    () => `<svg viewBox="0 0 400 300" role="img" aria-label="Mèo Miu vẫy tay chào">${bg()}${cat({ x: 200, y: 292, s: 1.45, cls: "waving" })}</svg>`,
    [],
  );
  return (
    <>
      <div className="hero">
        <h1>Bài: {pack.lesson.title}</h1>
        <p>{pack.lesson.topicTitle}</p>
      </div>
      <div className="scene" style={{ ["--reserve" as string]: "400px" }} dangerouslySetInnerHTML={{ __html: svg }} />
      {!speech && (
        <p className="note">Thiết bị này không có giọng đọc dự phòng. Hãy mở bằng Chrome hoặc Safari để nghe được tiếng.</p>
      )}
      <div className="controls">
        <button className="big start hint" aria-label="Bắt đầu học" onClick={onStart}
          dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>` }} />
      </div>
    </>
  );
}

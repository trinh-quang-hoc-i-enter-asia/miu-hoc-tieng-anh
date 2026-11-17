"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LessonPack } from "@/lib/pack-types";
import { LessonPlayer } from "@/lesson-engine/LessonPlayer";
import { ICONS } from "@/lesson-engine/art";

type Props = {
  packUrl: string;
  childId: string;
  startStep: number;
  homeHref: string;
  nextHref?: string;
  nextLabel?: string;
};

/** Tải gói bài (tệp JSON có số phiên bản nên trình duyệt lưu đệm lâu dài) rồi chạy bài. */
export function LessonLoader({ packUrl, childId, startStep, homeHref, nextHref, nextLabel }: Props) {
  const [pack, setPack] = useState<LessonPack | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetch(packUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: LessonPack) => !cancelled && setPack(p))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [packUrl, attempt]);

  if (pack) {
    return (
      <LessonPlayer pack={pack} childId={childId} startStep={startStep} homeHref={homeHref} nextHref={nextHref} nextLabel={nextLabel} />
    );
  }

  return (
    <div className="kid-app">
      <header className="bar">
        <Link className="iconbtn" href={homeHref} aria-label="Về bản đồ" dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        <span />
        <span className="spacer" />
      </header>
      <main className="kid-stage center">
        {failed ? (
          <>
            <p className="caption">Chưa tải được bài. Bố mẹ kiểm tra mạng rồi chạm nút này nhé.</p>
            <button className="big" aria-label="Thử lại" onClick={() => setAttempt((n) => n + 1)} dangerouslySetInnerHTML={{ __html: ICONS.again }} />
          </>
        ) : (
          <p className="caption">Đang chuẩn bị bài…</p>
        )}
      </main>
    </div>
  );
}

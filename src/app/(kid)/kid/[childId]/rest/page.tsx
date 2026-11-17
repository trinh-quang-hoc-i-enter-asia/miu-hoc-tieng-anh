import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { bg, cat, ICONS } from "@/lesson-engine/art";

/** Hết thời gian học hôm nay: Miu chào tạm biệt. App không ngắt giữa bài, chỉ dừng ở đây. */
export default async function RestPage({ params }: { params: Promise<{ childId: string }> }) {
  const parent = await requireParentPage();
  const { childId } = await params;
  await getOwnedChild(parent.id, childId).catch(() => notFound());
  const svg = `<svg viewBox="0 0 400 300" role="img" aria-label="Mèo Miu buồn ngủ">${bg()}${cat({ x: 200, y: 292, s: 1.45, mood: "sleepy" })}</svg>`;
  return (
    <div className="kid-app">
      <header className="bar">
        <Link className="iconbtn" href="/" aria-label="Về màn hình chọn bé" dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        <span />
        <span className="spacer" />
      </header>
      <main className="kid-stage">
        <div className="scene night rest" style={{ ["--reserve" as string]: "330px" }} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="caption">Hôm nay con học đủ rồi. Hẹn mai gặp lại nhé!</p>
      </main>
    </div>
  );
}

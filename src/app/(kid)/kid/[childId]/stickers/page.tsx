import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParentPage } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { getChildState } from "@/lib/learning";
import { db } from "@/lib/db";
import { picSvg, ICONS } from "@/lesson-engine/art";

/** Bộ sưu tập nhãn dán: nhãn đã nhận hiện màu, nhãn chưa nhận là ô trống. */
export default async function StickersPage({ params }: { params: Promise<{ childId: string }> }) {
  const parent = await requireParentPage();
  const { childId } = await params;
  const child = await getOwnedChild(parent.id, childId).catch(() => notFound());
  const [state, all] = await Promise.all([
    getChildState(child.id),
    db.sticker.findMany({ where: { lesson: { status: "published" } }, orderBy: { lesson: { position: "asc" } } }),
  ]);
  const earned = new Set(state.stickers.map((s) => s.id));

  return (
    <div className="kid-app">
      <header className="bar">
        <Link className="iconbtn" href={`/kid/${child.id}`} aria-label="Về bản đồ" dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        <span />
        <div className="stars">
          <span dangerouslySetInnerHTML={{ __html: ICONS.star }} style={{ display: "contents" }} />
          <b>{state.stickers.length}</b>
        </div>
      </header>
      <main className="kid-stage">
        <div className="hero">
          <h1>Nhãn dán của {state.child.nickname}</h1>
        </div>
        <div className="sticker-grid">
          {all.map((s) =>
            earned.has(s.id) ? (
              <div key={s.id} className="sticker">
                <span className="card" style={{ aspectRatio: "1" }} dangerouslySetInnerHTML={{ __html: picSvg(s.artKey) }} />
                <span>{s.nameVi}</span>
              </div>
            ) : (
              <div key={s.id} className="sticker empty" aria-label="Nhãn dán chưa nhận">
                <span className="card" style={{ aspectRatio: "1" }} dangerouslySetInnerHTML={{ __html: ICONS.lock }} />
              </div>
            ),
          )}
        </div>
      </main>
    </div>
  );
}

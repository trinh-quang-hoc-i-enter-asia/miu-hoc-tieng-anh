import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParentPage } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { getCatalog, getChildState } from "@/lib/learning";
import { buildMap } from "@/lib/map";
import { picSvg, ICONS } from "@/lesson-engine/art";
import { notFound } from "next/navigation";

/** Bản đồ chủ đề: các chủ đề hiện bằng hình, bài tiếp theo được làm nổi bật. */
export default async function MapPage({ params }: { params: Promise<{ childId: string }> }) {
  const parent = await requireParentPage();
  const { childId } = await params;
  const child = await getOwnedChild(parent.id, childId).catch(() => notFound());
  const [catalog, state] = await Promise.all([getCatalog(), getChildState(child.id)]);
  if (state.today.limitReached) redirect(`/kid/${child.id}/rest`);

  const topics = buildMap(catalog, state);
  const open = topics.filter((t) => t.status !== "soon");
  const soon = topics.filter((t) => t.status === "soon");

  return (
    <div className="kid-app">
      <header className="bar">
        <Link className="iconbtn" href="/" aria-label="Đổi bé khác" dangerouslySetInnerHTML={{ __html: ICONS.home }} />
        <Link className="iconbtn" href={`/kid/${child.id}/stickers`} aria-label="Bộ sưu tập nhãn dán" dangerouslySetInnerHTML={{ __html: ICONS.stickers }} />
        <div className="stars" aria-label={`${state.totalStars} ngôi sao`}>
          <span dangerouslySetInnerHTML={{ __html: ICONS.star }} style={{ display: "contents" }} />
          <b>{state.totalStars}</b>
        </div>
      </header>
      <main className="kid-stage">
        <div className="hero">
          <h1>Chào {state.child.nickname}!</h1>
          <p>Chạm vào một bài để học</p>
        </div>
        <div className="tiles">
          {open.map((t) => {
            const lesson = t.lessons[0];
            const locked = t.status === "locked";
            const body = (
              <>
                <span className={`card${locked ? " locked" : ""}${t.status === "next" ? " hint" : ""}`} style={{ aspectRatio: "1", display: "block" }}
                  dangerouslySetInnerHTML={{ __html: picSvg(t.artKey) }} />
                <b>{t.title}</b>
                <small>
                  {locked ? (
                    <span dangerouslySetInnerHTML={{ __html: ICONS.lock }} style={{ display: "contents" }} />
                  ) : t.stars > 0 ? (
                    <>
                      <span dangerouslySetInnerHTML={{ __html: ICONS.star }} style={{ display: "contents" }} />
                      {t.stars} sao
                    </>
                  ) : null}
                </small>
              </>
            );
            return locked ? (
              <div key={t.id} className="tile" aria-label={`${t.title} (chưa mở)`}>{body}</div>
            ) : (
              <Link key={t.id} href={`/kid/${child.id}/lesson/${lesson.slug}`} className="tile" aria-label={`Bài ${t.title}`}>
                {body}
              </Link>
            );
          })}
        </div>
        {soon.length > 0 && (
          <>
            <p className="note">Các bài sắp có</p>
            <div className="soon">
              {soon.map((t) => (
                <div key={t.id}>
                  <span dangerouslySetInnerHTML={{ __html: ICONS.lock }} style={{ display: "contents" }} />
                  <span>{t.title}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

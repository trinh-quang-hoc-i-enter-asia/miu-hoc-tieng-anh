import Link from "next/link";
import { requireParentGate } from "@/lib/guard";
import { db } from "@/lib/db";
import { getChildReport, getChildState } from "@/lib/learning";
import { avatarSvg } from "@/lesson-engine/art";

export const dynamic = "force-dynamic";

const dayLabel = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);

export default async function ParentHome() {
  const parent = await requireParentGate("/parent");
  const children = await db.child.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: "asc" } });
  const data = await Promise.all(
    children.map(async (c) => ({ c, state: await getChildState(c.id), report: await getChildReport(c.id) })),
  );

  return (
    <main>
      <div className="topbar">
        <h1>Tổng quan</h1>
        <Link className="btn primary" href="/parent/children/new">+ Thêm bé</Link>
      </div>

      {data.length === 0 && <p className="muted">Chưa có hồ sơ bé nào. Hãy thêm bé để bắt đầu.</p>}

      <div className="grid">
        {data.map(({ c, state, report }) => {
          const max = Math.max(5, ...report.days.map((d) => d.minutes));
          const minutesToday = Math.round(state.today.secondsLearned / 60);
          return (
            <section key={c.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <span className="avatar" dangerouslySetInnerHTML={{ __html: avatarSvg(c.avatarKey) }} />
                  <div>
                    <h2 style={{ margin: 0 }}>{c.nickname}</h2>
                    <span className="muted">Sinh năm {c.birthYear}</span>
                  </div>
                </div>
                <Link className="btn" href={`/parent/children/${c.id}`}>Sửa hồ sơ</Link>
              </div>

              <p>
                Hôm nay: <b>{minutesToday} phút</b>
                {state.today.limitMinutes != null ? ` / giới hạn ${state.today.limitMinutes} phút` : " (không giới hạn)"}
                {state.today.limitReached && <span className="pill" style={{ marginLeft: 8 }}>Đã hết giờ học hôm nay</span>}
              </p>

              <h2 style={{ fontSize: "1.05rem" }}>Phút học 7 ngày gần nhất</h2>
              <div className="bars" aria-label="Biểu đồ phút học theo ngày">
                {report.days.map((d) => (
                  <div key={d.day} title={`${d.minutes} phút`}>
                    <i style={{ height: `${(d.minutes / max) * 70}px` }} />
                    <span>{dayLabel(d.day)}</span>
                  </div>
                ))}
              </div>

              <h2 style={{ fontSize: "1.05rem" }}>Bài đã xong ({report.completedLessons.length})</h2>
              {report.completedLessons.length === 0 ? (
                <p className="muted">Chưa xong bài nào.</p>
              ) : (
                <p>{report.completedLessons.map((l) => `${l.title} (${l.stars} sao)`).join(" · ")}</p>
              )}

              <h2 style={{ fontSize: "1.05rem" }}>Câu bé đã học ({report.learnedPhrases.length})</h2>
              {report.learnedPhrases.length === 0 ? (
                <p className="muted">Chưa có câu nào.</p>
              ) : (
                <table>
                  <thead><tr><th>Câu</th><th>Chọn đúng</th><th>Chọn sai</th><th>Nói theo</th></tr></thead>
                  <tbody>
                    {report.learnedPhrases.map((p) => (
                      <tr key={p.text}><td>{p.text}</td><td>{p.correct}</td><td>{p.wrong}</td><td>{p.spoken}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

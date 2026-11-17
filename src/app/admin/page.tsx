import Link from "next/link";
import { requireStaffPage } from "@/lib/staff-auth";
import { db } from "@/lib/db";
import { NewLessonForm } from "./NewLessonForm";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireStaffPage("/admin");
  const topics = await db.topic.findMany({
    orderBy: { position: "asc" },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  const allLessons = topics.flatMap((t) => t.lessons.map((l) => ({ id: l.id, title: l.titleVi })));

  return (
    <main>
      <h1>Soạn bài học</h1>
      <p className="muted">Bài mới là bản nháp, bé không thấy cho tới khi bạn bấm Xuất bản.</p>

      <div className="grid">
        {topics.map((t) => (
          <section key={t.id} className="card">
            <h2 style={{ marginTop: 0 }}>{t.position}. {t.titleVi}</h2>
            {t.lessons.length === 0 ? (
              <p className="muted">Chưa có bài nào.</p>
            ) : (
              <table>
                <thead><tr><th>Bài</th><th>Trạng thái</th><th>Phiên bản</th><th /></tr></thead>
                <tbody>
                  {t.lessons.map((l) => {
                    const changed = !l.publishedAt || l.draftUpdatedAt > l.publishedAt;
                    return (
                      <tr key={l.id}>
                        <td>{l.titleVi}</td>
                        <td>
                          {l.status === "published" ? <span className="pill live">Đã xuất bản</span> : <span className="pill">Nháp</span>}
                          {l.status === "published" && changed && <span className="pill" style={{ marginLeft: 6 }}>Nháp đã sửa</span>}
                        </td>
                        <td>{l.version || "—"}</td>
                        <td><Link className="btn" href={`/admin/lessons/${l.id}`}>Mở</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <h2>Tạo bài mới</h2>
      <NewLessonForm topics={topics.map((t) => ({ id: t.id, title: t.titleVi }))} lessons={allLessons} />
    </main>
  );
}

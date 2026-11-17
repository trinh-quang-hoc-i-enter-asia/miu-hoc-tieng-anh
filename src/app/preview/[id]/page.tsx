import Link from "next/link";
import { requireStaffPage } from "@/lib/staff-auth";
import { buildPack } from "@/lib/publish";
import { LessonPlayer } from "@/lesson-engine/LessonPlayer";
import "../../kid.css";

export const dynamic = "force-dynamic";

/** Xem trước bài nháp đúng như bé sẽ thấy. Không ghi tiến độ; bấm vào 5 chấm để nhảy bước. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaffPage(`/preview/${id}`);
  const built = await buildPack(id, 0);

  if (!built.ok) {
    return (
      <div className="ui">
        <h1>Chưa xem trước được</h1>
        <p className="muted">Bản nháp còn lỗi cấu hình:</p>
        <ul>
          {built.issues.map((i, n) => <li key={n}>Bước {i.step + 1} {i.path}: {i.message}</li>)}
          {built.missingPhrases.map((s) => <li key={s}>Câu chưa tồn tại: {s}</li>)}
        </ul>
        <Link className="btn" href={`/admin/lessons/${id}`}>← Quay lại soạn bài</Link>
      </div>
    );
  }
  return (
    <div className="kid">
      <LessonPlayer pack={built.pack} homeHref={`/admin/lessons/${id}`} preview />
    </div>
  );
}

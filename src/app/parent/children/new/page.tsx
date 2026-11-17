import { requireParentGate } from "@/lib/guard";
import { ChildForm } from "../../ChildForm";

export const dynamic = "force-dynamic";

export default async function NewChild() {
  await requireParentGate("/parent/children/new");
  const now = new Date().getFullYear();
  const years = Array.from({ length: 13 }, (_, i) => now - i);
  return (
    <main>
      <h1>Thêm bé</h1>
      <p className="muted">App chỉ lưu tên gọi, năm sinh và ảnh đại diện chọn từ bộ có sẵn.</p>
      <ChildForm initial={{ nickname: "", birthYear: now - 5, avatarKey: "miu", dailyLimitMinutes: null }} years={years} />
    </main>
  );
}

import { notFound } from "next/navigation";
import { requireParentGate } from "@/lib/guard";
import { getOwnedChild } from "@/lib/children";
import { ChildForm } from "../../ChildForm";

export const dynamic = "force-dynamic";

export default async function EditChild({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parent = await requireParentGate(`/parent/children/${id}`);
  const c = await getOwnedChild(parent.id, id).catch(() => notFound());
  const now = new Date().getFullYear();
  const years = Array.from({ length: 13 }, (_, i) => now - i);
  return (
    <main>
      <h1>Sửa hồ sơ của {c.nickname}</h1>
      <ChildForm
        initial={{ id: c.id, nickname: c.nickname, birthYear: c.birthYear, avatarKey: c.avatarKey, dailyLimitMinutes: c.dailyLimitMinutes }}
        years={years}
      />
    </main>
  );
}

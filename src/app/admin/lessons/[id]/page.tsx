import { requireStaffPage } from "@/lib/staff-auth";
import { getLessonDetail } from "@/lib/admin";
import { notFound } from "next/navigation";
import { LessonEditor } from "./LessonEditor";

export const dynamic = "force-dynamic";

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaffPage(`/admin/lessons/${id}`);
  const detail = await getLessonDetail(id).catch(() => notFound());
  return <LessonEditor detail={detail} />;
}

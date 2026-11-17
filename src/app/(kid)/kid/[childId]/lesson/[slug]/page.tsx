import { notFound, redirect } from "next/navigation";
import { requireParentPage } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { getCatalog, getChildState } from "@/lib/learning";
import { nextLesson } from "@/lib/map";
import { LessonLoader } from "./LessonLoader";

export default async function LessonPage({ params }: { params: Promise<{ childId: string; slug: string }> }) {
  const parent = await requireParentPage();
  const { childId, slug } = await params;
  const child = await getOwnedChild(parent.id, childId).catch(() => notFound());
  const [catalog, state] = await Promise.all([getCatalog(), getChildState(child.id)]);
  if (state.today.limitReached) redirect(`/kid/${child.id}/rest`);

  const lesson = catalog.flatMap((t) => t.lessons).find((l) => l.slug === slug);
  if (!lesson) notFound();

  // Bài đang học dở thì vào lại đúng bước đã xong gần nhất (tối đa bước 4, trước phần thưởng).
  const p = state.lessons[lesson.id];
  const startStep = p && p.status === "in_progress" ? Math.min(Math.max(p.lastStep, 0), 3) : 0;
  const next = nextLesson(catalog, lesson.id);

  return (
    <LessonLoader
      key={lesson.id}
      packUrl={lesson.packUrl}
      childId={child.id}
      startStep={startStep}
      homeHref={`/kid/${child.id}`}
      nextHref={next ? `/kid/${child.id}/lesson/${next.slug}` : undefined}
      nextLabel={next?.title}
    />
  );
}

import { db } from "./db";
import { notFound } from "./api";
import { collectPhraseSlugs } from "./phrase-refs";
import { STEP_TYPES } from "./config";

/** Dữ liệu cho trang soạn bài: bài, 5 bước, các câu bài đang dùng kèm giọng đã có tiếng. */
export async function getLessonDetail(id: string) {
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { topic: true, steps: { orderBy: { position: "asc" } } },
  });
  if (!lesson) throw notFound("Không tìm thấy bài học");

  const used = new Set(collectPhraseSlugs(lesson.steps.map((s) => s.config)));
  const ui = await db.phrase.findMany({ where: { slug: { startsWith: "ui-" } }, select: { slug: true } });
  ui.forEach((p) => used.add(p.slug));

  const rows = await db.phrase.findMany({
    where: { slug: { in: [...used] } },
    include: { audio: { select: { voice: true } } },
    orderBy: { slug: "asc" },
  });
  const known = new Set(rows.map((r) => r.slug));

  return {
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.titleVi,
      topicTitle: lesson.topic.titleVi,
      status: lesson.status,
      version: lesson.version,
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      draftChanged: !lesson.publishedAt || lesson.draftUpdatedAt > lesson.publishedAt,
    },
    steps: STEP_TYPES.map((type, position) => {
      const s = lesson.steps.find((x) => x.position === position);
      return { position, type, config: s?.config ?? null };
    }),
    phrases: rows.map((r) => ({
      slug: r.slug,
      kind: r.kind as "en" | "vi",
      text: (r.kind === "en" ? r.textEn : r.textVi) ?? "",
      voices: r.audio.map((a) => a.voice).sort(),
      shared: r.slug.startsWith("ui-"),
    })),
    missingSlugs: [...used].filter((s) => !known.has(s)),
  };
}

export type LessonDetail = Awaited<ReturnType<typeof getLessonDetail>>;

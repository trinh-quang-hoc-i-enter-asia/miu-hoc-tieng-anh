import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readJson, ApiError, notFound } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { db } from "@/lib/db";

export const GET = route(async () => {
  await requireStaffApi();
  const topics = await db.topic.findMany({
    orderBy: { position: "asc" },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id, slug: t.slug, title: t.titleVi, position: t.position, status: t.status,
      lessons: t.lessons.map((l) => ({
        id: l.id, slug: l.slug, title: l.titleVi, position: l.position, status: l.status, version: l.version,
        draftChanged: !l.publishedAt || l.draftUpdatedAt > l.publishedAt,
      })),
    })),
  });
});

const createBody = z.strictObject({
  topicId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Mã bài chỉ gồm chữ thường, số và dấu gạch ngang").max(60),
  title: z.string().trim().min(1).max(80),
  cloneFromId: z.string().uuid(),
});

/** Tạo bài mới ở trạng thái nháp bằng cách nhân bản 5 bước của một bài có sẵn rồi sửa. */
export const POST = route(async (req: Request) => {
  await requireStaffApi();
  const body = createBody.parse(await readJson(req));
  const [topic, source] = await Promise.all([
    db.topic.findUnique({ where: { id: body.topicId } }),
    db.lesson.findUnique({ where: { id: body.cloneFromId }, include: { steps: true } }),
  ]);
  if (!topic || !source) throw notFound("Không tìm thấy chủ đề hoặc bài mẫu");
  if (await db.lesson.findUnique({ where: { slug: body.slug } })) throw new ApiError(409, "Mã bài này đã có", "slug_taken");

  const position = (await db.lesson.count({ where: { topicId: topic.id } })) + 1;
  const lesson = await db.lesson.create({
    data: {
      slug: body.slug,
      titleVi: body.title,
      topicId: topic.id,
      position,
      steps: { create: source.steps.map((s) => ({ position: s.position, type: s.type, config: s.config as object })) },
    },
  });
  return NextResponse.json({ id: lesson.id }, { status: 201 });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readJson, badRequest, notFound } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { db } from "@/lib/db";
import { validateStepConfig } from "@/lib/lesson-schema";
import { STEP_TYPES } from "@/lib/config";

const body = z.strictObject({ config: z.unknown() });

/** Lưu cấu hình một bước của bản nháp. Cấu hình sai lược đồ bị từ chối, bản đang xuất bản không bị ảnh hưởng. */
export const PUT = route(async (req: Request, { params }: { params: Promise<{ id: string; position: string }> }) => {
  await requireStaffApi();
  const { id, position: pos } = await params;
  const position = Number(pos);
  if (!Number.isInteger(position) || position < 0 || position >= STEP_TYPES.length) throw badRequest("Vị trí bước không hợp lệ");
  const { config } = body.parse(await readJson(req));

  const issues = validateStepConfig(position, config);
  if (issues.length) return NextResponse.json({ error: "Cấu hình chưa hợp lệ", code: "invalid", fields: issues }, { status: 400 });

  const lesson = await db.lesson.findUnique({ where: { id } });
  if (!lesson) throw notFound("Không tìm thấy bài học");
  await db.$transaction([
    db.lessonStep.upsert({
      where: { lessonId_position: { lessonId: id, position } },
      create: { lessonId: id, position, type: STEP_TYPES[position], config: config as object },
      update: { config: config as object },
    }),
    db.lesson.update({ where: { id }, data: { draftUpdatedAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true });
});

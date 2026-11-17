import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readJson, notFound } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { db } from "@/lib/db";
import { PIC_KEYS } from "@/lib/content-keys";

export const GET = route(async () => {
  await requireStaffApi();
  const topics = await db.topic.findMany({ orderBy: { position: "asc" } });
  return NextResponse.json({
    topics: topics.map((t) => ({ id: t.id, slug: t.slug, title: t.titleVi, position: t.position, artKey: t.artKey, status: t.status })),
  });
});

const patchBody = z.strictObject({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(60).optional(),
  position: z.number().int().min(1).max(100).optional(),
  artKey: z.enum(PIC_KEYS).optional(),
});

export const PATCH = route(async (req: Request) => {
  await requireStaffApi();
  const { id, title, position, artKey } = patchBody.parse(await readJson(req));
  if (!(await db.topic.findUnique({ where: { id } }))) throw notFound("Không tìm thấy chủ đề");
  const t = await db.topic.update({
    where: { id },
    data: { ...(title && { titleVi: title }), ...(position && { position }), ...(artKey && { artKey }) },
  });
  return NextResponse.json({ id: t.id });
});

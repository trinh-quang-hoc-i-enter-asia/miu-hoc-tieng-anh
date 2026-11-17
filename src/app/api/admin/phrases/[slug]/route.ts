import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readJson, badRequest } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { db } from "@/lib/db";

const body = z.strictObject({
  kind: z.enum(["en", "vi"]),
  text: z.string().trim().min(1).max(300),
});

/** Thêm hoặc sửa một câu. Sửa chữ của câu đã có tiếng thì tiếng cũ không còn khớp: phải thu lại. */
export const PUT = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  await requireStaffApi();
  const { slug } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw badRequest("Mã câu chỉ gồm chữ thường, số và dấu gạch ngang");
  const { kind, text } = body.parse(await readJson(req));
  const data = kind === "en" ? { kind, textEn: text, textVi: null } : { kind, textVi: text, textEn: null };
  const phrase = await db.phrase.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  return NextResponse.json({ slug: phrase.slug });
});

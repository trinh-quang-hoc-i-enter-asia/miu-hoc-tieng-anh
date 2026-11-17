import { NextResponse } from "next/server";
import { route, readJson, badRequest } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { requireGateApi } from "@/lib/gate-api";
import { db } from "@/lib/db";
import { getOwnedChild, validBirthYear, childInput } from "@/lib/children";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const parent = await requireParentApi();
  await requireGateApi(parent.id);
  const { id } = await params;
  const child = await getOwnedChild(parent.id, id);
  const data = childInput.partial().parse(await readJson(req));
  if (data.birthYear !== undefined && !validBirthYear(data.birthYear)) throw badRequest("Năm sinh không hợp lệ cho bé dưới 12 tuổi");
  const updated = await db.child.update({
    where: { id: child.id },
    data: {
      ...(data.nickname !== undefined && { nickname: data.nickname }),
      ...(data.birthYear !== undefined && { birthYear: data.birthYear }),
      ...(data.avatarKey !== undefined && { avatarKey: data.avatarKey }),
      ...(data.dailyLimitMinutes !== undefined && { dailyLimitMinutes: data.dailyLimitMinutes }),
    },
  });
  return NextResponse.json({
    child: {
      id: updated.id,
      nickname: updated.nickname,
      birthYear: updated.birthYear,
      avatarKey: updated.avatarKey,
      dailyLimitMinutes: updated.dailyLimitMinutes,
    },
  });
});

/** Xóa hồ sơ bé và toàn bộ tiến độ của bé (xóa dây chuyền trong database). */
export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const parent = await requireParentApi();
  await requireGateApi(parent.id);
  const { id } = await params;
  const child = await getOwnedChild(parent.id, id);
  await db.child.delete({ where: { id: child.id } });
  return NextResponse.json({ ok: true });
});

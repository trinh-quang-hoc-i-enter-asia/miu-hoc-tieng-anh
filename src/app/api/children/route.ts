import { NextResponse } from "next/server";
import { route, readJson, badRequest } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { requireGateApi } from "@/lib/gate-api";
import { db } from "@/lib/db";
import { childInput, validBirthYear } from "@/lib/children";

const publicChild = (c: { id: string; nickname: string; birthYear: number; avatarKey: string; dailyLimitMinutes: number | null }) => ({
  id: c.id,
  nickname: c.nickname,
  birthYear: c.birthYear,
  avatarKey: c.avatarKey,
  dailyLimitMinutes: c.dailyLimitMinutes,
});

export const GET = route(async () => {
  const parent = await requireParentApi();
  const children = await db.child.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ children: children.map(publicChild) });
});

export const POST = route(async (req: Request) => {
  const parent = await requireParentApi();
  await requireGateApi(parent.id);
  const data = childInput.parse(await readJson(req));
  if (!validBirthYear(data.birthYear)) throw badRequest("Năm sinh không hợp lệ cho bé dưới 12 tuổi");
  const child = await db.child.create({
    data: {
      parentId: parent.id,
      nickname: data.nickname,
      birthYear: data.birthYear,
      avatarKey: data.avatarKey,
      dailyLimitMinutes: data.dailyLimitMinutes ?? null,
    },
  });
  return NextResponse.json({ child: publicChild(child) }, { status: 201 });
});

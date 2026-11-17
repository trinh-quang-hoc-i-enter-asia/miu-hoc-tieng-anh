import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readJson, ApiError } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { checkAnswer, openGate } from "@/lib/gate";

const body = z.strictObject({ token: z.string().max(200), answer: z.number().int() });

export const POST = route(async (req: Request) => {
  const parent = await requireParentApi();
  const { token, answer } = body.parse(await readJson(req));
  if (!checkAnswer(token, answer)) throw new ApiError(400, "Chưa đúng, thử lại nhé", "bad_answer");
  await openGate(parent.id);
  return NextResponse.json({ ok: true });
});

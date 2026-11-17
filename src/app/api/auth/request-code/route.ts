import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/api";
import { requestLoginCode, requestCodeBody } from "@/lib/auth";

export const POST = route(async (req: Request) => {
  const { email } = requestCodeBody.parse(await readJson(req));
  await requestLoginCode(email);
  // Luôn trả cùng một kết quả, dù email có đăng ký hay không.
  return NextResponse.json({ ok: true });
});

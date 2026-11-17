import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/api";
import { verifyLoginCode, setSessionCookie, verifyCodeBody } from "@/lib/auth";

export const POST = route(async (req: Request) => {
  const { email, code } = verifyCodeBody.parse(await readJson(req));
  const token = await verifyLoginCode(email, code);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
});

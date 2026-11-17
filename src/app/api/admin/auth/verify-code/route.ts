import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/api";
import { verifyCodeBody } from "@/lib/auth";
import { verifyStaffLoginCode, setStaffSessionCookie } from "@/lib/staff-auth";

export const POST = route(async (req: Request) => {
  const { email, code } = verifyCodeBody.parse(await readJson(req));
  const token = await verifyStaffLoginCode(email, code);
  await setStaffSessionCookie(token);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/api";
import { requestCodeBody } from "@/lib/auth";
import { requestStaffLoginCode } from "@/lib/staff-auth";

export const POST = route(async (req: Request) => {
  const { email } = requestCodeBody.parse(await readJson(req));
  await requestStaffLoginCode(email);
  // Luôn trả cùng một kết quả, dù email có trong bảng staff hay không.
  return NextResponse.json({ ok: true });
});

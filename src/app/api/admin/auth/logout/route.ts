import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { staffLogout } from "@/lib/staff-auth";

export const POST = route(async () => {
  await staffLogout();
  return NextResponse.json({ ok: true });
});

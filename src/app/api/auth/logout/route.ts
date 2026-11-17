import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { logout } from "@/lib/auth";
import { closeGate } from "@/lib/gate";

export const POST = route(async () => {
  await logout();
  await closeGate();
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { newChallenge } from "@/lib/gate";

export const POST = route(async () => {
  await requireParentApi();
  return NextResponse.json(newChallenge());
});

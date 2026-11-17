import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { getCatalog } from "@/lib/learning";

export const GET = route(async () => {
  await requireParentApi();
  return NextResponse.json({ topics: await getCatalog() });
});

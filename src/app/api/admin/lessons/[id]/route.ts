import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { getLessonDetail } from "@/lib/admin";

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireStaffApi();
  return NextResponse.json(await getLessonDetail((await params).id));
});

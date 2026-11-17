import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { publishLesson } from "@/lib/publish";

export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireStaffApi();
  const result = await publishLesson((await params).id);
  return NextResponse.json(result);
});

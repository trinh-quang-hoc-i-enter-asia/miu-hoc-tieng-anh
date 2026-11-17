import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { getChildState } from "@/lib/learning";

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const parent = await requireParentApi();
  const child = await getOwnedChild(parent.id, (await params).id);
  return NextResponse.json(await getChildState(child.id));
});

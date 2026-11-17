import { NextResponse } from "next/server";
import { route, readJson } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { getOwnedChild } from "@/lib/children";
import { applyEvents } from "@/lib/events";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const parent = await requireParentApi();
  const child = await getOwnedChild(parent.id, (await params).id);
  const result = await applyEvents(child.id, await readJson(req));
  return NextResponse.json(result);
});

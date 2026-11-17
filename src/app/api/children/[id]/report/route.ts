import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireParentApi } from "@/lib/auth";
import { requireGateApi } from "@/lib/gate-api";
import { getOwnedChild } from "@/lib/children";
import { getChildReport } from "@/lib/learning";

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const parent = await requireParentApi();
  await requireGateApi(parent.id);
  const child = await getOwnedChild(parent.id, (await params).id);
  return NextResponse.json(await getChildReport(child.id));
});

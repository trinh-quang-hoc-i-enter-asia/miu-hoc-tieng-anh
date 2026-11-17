import { requireParentPage } from "@/lib/auth";
import { safeNext } from "@/lib/guard";
import { GateForm } from "./GateForm";

export const dynamic = "force-dynamic";

export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireParentPage();
  const { next } = await searchParams;
  return (
    <main className="ui">
      <h1>Dành cho bố mẹ</h1>
      <p className="muted">Để bé không vô tình vào đây, hãy giải phép tính nhỏ này.</p>
      <GateForm next={safeNext(next, "/parent")} />
    </main>
  );
}

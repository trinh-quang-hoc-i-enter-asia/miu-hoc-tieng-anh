import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/staff-auth";
import { safeNext } from "@/lib/guard";
import { LoginForm } from "@/app/login/LoginForm";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/admin");
  if (await currentStaff()) redirect(next);
  return (
    <main>
      <h1>Đăng nhập khu soạn bài</h1>
      <p className="muted">Dành cho người soạn nội dung. Tài khoản này tách riêng với tài khoản phụ huynh.</p>
      <LoginForm apiBase="/api/admin/auth" emailLabel="Email người soạn bài" next={next} />
    </main>
  );
}

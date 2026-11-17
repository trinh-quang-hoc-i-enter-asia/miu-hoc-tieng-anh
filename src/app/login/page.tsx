import { redirect } from "next/navigation";
import { currentParent } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentParent()) redirect("/");
  return (
    <main className="ui">
      <h1>Miu học tiếng Anh</h1>
      <p className="muted">Phụ huynh đăng nhập một lần trên thiết bị này, sau đó bé chỉ việc chạm vào ảnh của mình.</p>
      <LoginForm apiBase="/api/auth" emailLabel="Email phụ huynh" next="/" />
    </main>
  );
}

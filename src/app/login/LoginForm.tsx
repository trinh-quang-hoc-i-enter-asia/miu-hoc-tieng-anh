"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.fields?.[0]?.message || data.error || "Có lỗi xảy ra");
  return data;
}

/**
 * Đăng nhập bằng email + mã 6 số. Dùng chung cho phụ huynh (/login) và người soạn bài (/admin/login);
 * hai bên khác nhau ở bộ API và trang chuyển tới sau khi đăng nhập.
 */
export function LoginForm({ apiBase, emailLabel, next }: { apiBase: string; emailLabel: string; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      {!sent ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await post(`${apiBase}/request-code`, { email });
              setSent(true);
            });
          }}
        >
          <label htmlFor="email">{emailLabel}</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="row" style={{ marginTop: 16 }}>
            <button className="btn primary" disabled={busy}>Gửi mã đăng nhập</button>
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await post(`${apiBase}/verify-code`, { email, code });
              router.replace(next);
              router.refresh();
            });
          }}
        >
          <p>Mã gồm 6 chữ số đã được tạo cho <b>{email}</b>.</p>
          <p className="muted">Đợt dùng trong nhà chưa gửi email: mã hiện trong cửa sổ dòng lệnh đang chạy <code>npm run dev</code>.</p>
          <label htmlFor="code">Mã đăng nhập</label>
          <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          <p className="row" style={{ marginTop: 16 }}>
            <button className="btn primary" disabled={busy}>Đăng nhập</button>
            <button type="button" className="btn" onClick={() => { setSent(false); setCode(""); }}>Đổi email</button>
          </p>
        </form>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

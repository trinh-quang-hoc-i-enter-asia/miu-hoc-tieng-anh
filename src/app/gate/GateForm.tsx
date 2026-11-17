"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function GateForm({ next }: { next: string }) {
  const router = useRouter();
  const [q, setQ] = useState<{ a: number; b: number; token: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    const res = await fetch("/api/gate/challenge", { method: "POST" });
    if (res.status === 401) return router.replace("/login");
    const data = await res.json();
    // Bỏ kết quả cũ nếu đã có yêu cầu mới hơn, để câu hỏi hiện ra luôn khớp câu hỏi đã ký.
    if (mine === latest.current) {
      setQ(data);
      setAnswer("");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q) return;
    setError("");
    const res = await fetch("/api/gate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: q.token, answer: Number(answer) }),
    });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || "Có lỗi xảy ra");
    void load();
  }

  return (
    <form className="card" style={{ maxWidth: 420 }} onSubmit={submit}>
      <label htmlFor="ans">{q ? `${q.a} + ${q.b} = ?` : "Đang tạo câu hỏi…"}</label>
      <input id="ans" className="input" inputMode="numeric" autoFocus required value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <p className="row" style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={!q}>Vào</button>
        <button type="button" className="btn" onClick={() => router.replace("/")}>Quay lại</button>
      </p>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "./admin-fetch";

export function NewLessonForm({ topics, lessons }: { topics: { id: string; title: string }[]; lessons: { id: string; title: string }[] }) {
  const router = useRouter();
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [cloneFromId, setCloneFromId] = useState(lessons[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await adminFetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, slug, title, cloneFromId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.fields?.[0]?.message || data.error || "Có lỗi xảy ra");
    router.push(`/admin/lessons/${data.id}`);
  }

  if (lessons.length === 0) return <p className="muted">Cần có ít nhất một bài làm mẫu để nhân bản.</p>;
  return (
    <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
      <label htmlFor="t">Chủ đề</label>
      <select id="t" className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
        {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
      <label htmlFor="ti">Tên bài</label>
      <input id="ti" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor="sl">Mã bài (chữ thường, số, dấu gạch ngang)</label>
      <input id="sl" className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <label htmlFor="cl">Nhân bản 5 bước từ bài</label>
      <select id="cl" className="input" value={cloneFromId} onChange={(e) => setCloneFromId(e.target.value)}>
        {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
      </select>
      <p className="row" style={{ marginTop: 16 }}><button className="btn primary" disabled={busy}>Tạo bản nháp</button></p>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

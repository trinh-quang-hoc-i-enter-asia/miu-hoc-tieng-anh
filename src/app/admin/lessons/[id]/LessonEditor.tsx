"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonDetail } from "@/lib/admin";
import { VOICES } from "@/lib/content-keys";
import { adminFetch } from "../../admin-fetch";

type Msg = { kind: "ok" | "error"; text: string; items?: string[] } | null;

const STEP_NAMES = ["1. Xem tình huống", "2. Nghe và chạm", "3. Nói theo", "4. Trò chơi", "5. Phần thưởng"];
const VOICE_NAMES: Record<string, string> = { miu: "Miu", ben: "Ben", friend: "Bạn phụ", guide: "Hướng dẫn (tiếng Việt)" };

function Message({ m }: { m: Msg }) {
  if (!m) return null;
  return (
    <div role={m.kind === "error" ? "alert" : "status"}>
      <p className={m.kind === "error" ? "error" : "ok"}>{m.text}</p>
      {m.items && <ul>{m.items.map((i) => <li key={i}>{i}</li>)}</ul>}
    </div>
  );
}

export function LessonEditor({ detail }: { detail: LessonDetail }) {
  const router = useRouter();
  const { lesson } = detail;
  const [drafts, setDrafts] = useState(detail.steps.map((s) => JSON.stringify(s.config, null, 2)));
  const [stepMsg, setStepMsg] = useState<Record<number, Msg>>({});
  const [publishMsg, setPublishMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  async function api(url: string, init: RequestInit) {
    const res = await adminFetch(url, init);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function saveStep(position: number) {
    let config: unknown;
    try {
      config = JSON.parse(drafts[position]);
    } catch {
      return setStepMsg((m) => ({ ...m, [position]: { kind: "error", text: "Nội dung không phải JSON hợp lệ" } }));
    }
    const { ok, data } = await api(`/api/admin/lessons/${lesson.id}/steps/${position}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }),
    });
    setStepMsg((m) => ({
      ...m,
      [position]: ok
        ? { kind: "ok", text: "Đã lưu vào bản nháp" }
        : { kind: "error", text: data.error || "Không lưu được", items: data.fields?.map((f: { path: string; message: string }) => `${f.path || "(bước)"}: ${f.message}`) },
    }));
    if (ok) router.refresh();
  }

  async function publish() {
    setBusy(true);
    setPublishMsg(null);
    const { ok, data } = await api(`/api/admin/lessons/${lesson.id}/publish`, { method: "POST" });
    setBusy(false);
    if (ok) {
      setPublishMsg({
        kind: "ok",
        text: `Đã xuất bản phiên bản ${data.version}.`,
        items: data.missingAudio?.length ? [`Còn ${data.missingAudio.length} câu chưa có tệp tiếng (bé nghe giọng dự phòng của trình duyệt): ${data.missingAudio.join(", ")}`] : undefined,
      });
      router.refresh();
    } else {
      const d = data.detail || {};
      setPublishMsg({
        kind: "error",
        text: data.error || "Không xuất bản được",
        items: [
          ...(d.issues ?? []).map((i: { step: number; path: string; message: string }) => `Bước ${i.step + 1} ${i.path}: ${i.message}`),
          ...(d.missingPhrases ?? []).map((s: string) => `Câu chưa tồn tại: ${s}`),
          ...(d.missingAudio ?? []).map((s: string) => `Chưa có tệp tiếng: ${s}`),
        ],
      });
    }
  }

  return (
    <main>
      <div className="topbar">
        <div>
          <h1 style={{ marginBottom: 0 }}>{lesson.title}</h1>
          <span className="muted">Chủ đề {lesson.topicTitle} · mã {lesson.slug}</span>
        </div>
        <div className="row">
          <Link className="btn" href={`/preview/${lesson.id}`} target="_blank">Xem trước</Link>
          <button className="btn primary" disabled={busy} onClick={publish}>Xuất bản</button>
        </div>
      </div>

      <p>
        {lesson.status === "published" ? <span className="pill live">Đã xuất bản, phiên bản {lesson.version}</span> : <span className="pill">Nháp, chưa xuất bản</span>}
        {lesson.status === "published" && lesson.draftChanged && <span className="pill" style={{ marginLeft: 6 }}>Bản nháp đã sửa sau lần xuất bản</span>}
      </p>
      <Message m={publishMsg} />
      {detail.missingSlugs.length > 0 && (
        <p className="error">Các bước đang trỏ tới câu chưa tồn tại: {detail.missingSlugs.join(", ")}. Hãy thêm ở mục Câu bên dưới.</p>
      )}

      <h2>Năm bước của bài</h2>
      {detail.steps.map((s, i) => (
        <details key={s.position} className="card" style={{ marginBottom: 10 }} open={i === 0}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>{STEP_NAMES[i]}</summary>
          <textarea
            className="input"
            aria-label={`Cấu hình ${STEP_NAMES[i]}`}
            spellCheck={false}
            value={drafts[i]}
            onChange={(e) => setDrafts((d) => d.map((x, j) => (j === i ? e.target.value : x)))}
            style={{ marginTop: 10, minHeight: 240 }}
          />
          <p className="row"><button className="btn" onClick={() => void saveStep(i)}>Lưu bước này</button></p>
          <Message m={stepMsg[i] ?? null} />
        </details>
      ))}

      <h2>Câu và tiếng</h2>
      <p className="muted">Tệp tiếng gốc là WAV không nén, 48 kHz, 16 bit, một kênh. Câu bắt đầu bằng ui- là lời hướng dẫn dùng chung cho mọi bài.</p>
      <PhraseTable detail={detail} onChanged={() => router.refresh()} />
    </main>
  );
}

function PhraseTable({ detail, onChanged }: { detail: LessonDetail; onChanged: () => void }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newKind, setNewKind] = useState<"en" | "vi">("en");
  const [newText, setNewText] = useState("");

  async function savePhrase(slug: string, kind: "en" | "vi", text: string) {
    const res = await adminFetch(`/api/admin/phrases/${slug}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, text }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? { kind: "ok", text: `Đã lưu câu ${slug}` } : { kind: "error", text: data.fields?.[0]?.message || data.error || "Không lưu được" });
    if (res.ok) onChanged();
  }

  async function upload(slug: string, voice: string, file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("phraseSlug", slug);
    form.set("voice", voice);
    form.set("file", file);
    const res = await adminFetch("/api/admin/assets/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setMsg(
      res.ok
        ? { kind: "ok", text: `Đã tải tệp tiếng cho ${slug} (${VOICE_NAMES[voice]}), dài ${(data.durationMs / 1000).toFixed(1)} giây.${data.converted ? "" : " Máy chủ chưa có ffmpeg nên chưa tạo bản MP3/AAC, bé sẽ nghe thẳng tệp WAV."}` }
        : { kind: "error", text: data.error || "Không tải lên được" },
    );
    if (res.ok) onChanged();
  }

  return (
    <>
      <Message m={msg} />
      <table>
        <thead><tr><th>Mã</th><th>Nội dung</th><th>Đã có tiếng</th><th>Tải tệp WAV</th></tr></thead>
        <tbody>
          {detail.phrases.map((p) => <PhraseRow key={p.slug + p.text} p={p} onSave={savePhrase} onUpload={upload} />)}
        </tbody>
      </table>

      <h2 style={{ fontSize: "1.1rem" }}>Thêm câu mới</h2>
      <form
        className="card"
        style={{ maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          void savePhrase(newSlug, newKind, newText).then(() => { setNewSlug(""); setNewText(""); });
        }}
      >
        <label htmlFor="ns">Mã câu</label>
        <input id="ns" className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
        <label htmlFor="nk">Loại</label>
        <select id="nk" className="input" value={newKind} onChange={(e) => setNewKind(e.target.value as "en" | "vi")}>
          <option value="en">Câu tiếng Anh cần dạy</option>
          <option value="vi">Lời hướng dẫn tiếng Việt</option>
        </select>
        <label htmlFor="nt">Nội dung</label>
        <input id="nt" className="input" required value={newText} onChange={(e) => setNewText(e.target.value)} />
        <p className="row" style={{ marginTop: 16 }}><button className="btn">Thêm câu</button></p>
      </form>
    </>
  );
}

function PhraseRow({
  p, onSave, onUpload,
}: {
  p: LessonDetail["phrases"][number];
  onSave: (slug: string, kind: "en" | "vi", text: string) => Promise<void>;
  onUpload: (slug: string, voice: string, file: File | undefined) => Promise<void>;
}) {
  const [text, setText] = useState(p.text);
  const [voice, setVoice] = useState(p.kind === "vi" ? "guide" : "miu");
  const voices = p.kind === "vi" ? ["guide"] : VOICES.filter((v) => v !== "guide");
  return (
    <tr>
      <td><code>{p.slug}</code></td>
      <td>
        <div className="row">
          <input className="input" style={{ maxWidth: 260 }} aria-label={`Nội dung câu ${p.slug}`} value={text} onChange={(e) => setText(e.target.value)} />
          {text !== p.text && <button className="btn" onClick={() => void onSave(p.slug, p.kind, text)}>Lưu</button>}
        </div>
      </td>
      <td>{p.voices.length ? p.voices.map((v) => <span key={v} className="pill live" style={{ marginRight: 4 }}>{VOICE_NAMES[v]}</span>) : <span className="muted">Chưa có</span>}</td>
      <td>
        <div className="row">
          <select className="input" style={{ maxWidth: 150 }} aria-label="Giọng" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map((v) => <option key={v} value={v}>{VOICE_NAMES[v]}</option>)}
          </select>
          <input type="file" accept=".wav,audio/wav" aria-label={`Tệp WAV cho ${p.slug}`} onChange={(e) => { void onUpload(p.slug, voice, e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </td>
    </tr>
  );
}

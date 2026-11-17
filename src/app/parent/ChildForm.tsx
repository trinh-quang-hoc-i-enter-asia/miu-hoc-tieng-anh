"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_KEYS } from "@/lib/avatars";
import { avatarSvg } from "@/lesson-engine/art";

type Initial = { id?: string; nickname: string; birthYear: number; avatarKey: string; dailyLimitMinutes: number | null };

export function ChildForm({ initial, years }: { initial: Initial; years: number[] }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname);
  const [birthYear, setBirthYear] = useState(initial.birthYear);
  const [avatarKey, setAvatarKey] = useState(initial.avatarKey);
  const [limit, setLimit] = useState(initial.dailyLimitMinutes == null ? "" : String(initial.dailyLimitMinutes));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      nickname,
      birthYear,
      avatarKey,
      dailyLimitMinutes: limit.trim() === "" ? null : Number(limit),
    };
    const res = await fetch(initial.id ? `/api/children/${initial.id}` : "/api/children", {
      method: initial.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (res.status === 403) return router.replace(`/gate?next=${encodeURIComponent(location.pathname)}`);
      return setError(data.fields?.[0]?.message || data.error || "Có lỗi xảy ra");
    }
    router.replace("/parent");
    router.refresh();
  }

  async function remove() {
    if (!initial.id) return;
    if (!confirm(`Xóa hồ sơ của ${initial.nickname} và toàn bộ tiến độ học? Việc này không hoàn tác được.`)) return;
    const res = await fetch(`/api/children/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/parent");
      router.refresh();
    } else if (res.status === 403) router.replace(`/gate?next=${encodeURIComponent(location.pathname)}`);
    else setError("Không xóa được, thử lại nhé");
  }

  return (
    <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
      <label htmlFor="nick">Tên gọi ở nhà (bắt buộc)</label>
      <input id="nick" className="input" required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />

      <label htmlFor="year">Năm sinh (bắt buộc)</label>
      <select id="year" className="input" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>

      <label>Ảnh đại diện</label>
      <div className="avatars" role="radiogroup" aria-label="Ảnh đại diện">
        {AVATAR_KEYS.map((k) => (
          <label key={k} style={{ position: "relative" }}>
            <input type="radio" name="avatar" value={k} checked={avatarKey === k} onChange={() => setAvatarKey(k)} />
            <span className="avatar" style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: avatarSvg(k) }} />
          </label>
        ))}
      </div>

      <label htmlFor="limit">Giới hạn thời gian học mỗi ngày, tính bằng phút (không bắt buộc)</label>
      <input id="limit" className="input" inputMode="numeric" placeholder="Để trống là không giới hạn" value={limit} onChange={(e) => setLimit(e.target.value)} />

      <p className="row" style={{ marginTop: 18 }}>
        <button className="btn primary" disabled={busy}>{initial.id ? "Lưu" : "Tạo hồ sơ"}</button>
        {initial.id && <button type="button" className="btn danger" onClick={remove}>Xóa hồ sơ</button>}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

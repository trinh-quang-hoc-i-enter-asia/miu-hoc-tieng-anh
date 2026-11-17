"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsActions() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setError("");
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      router.replace("/login");
      router.refresh();
    } else if (res.status === 403) router.replace("/gate?next=/parent/settings");
    else setError("Không xóa được, thử lại nhé");
  }

  return (
    <>
      <p><button className="btn" onClick={logout}>Đăng xuất</button></p>
      <h2>Xóa tài khoản</h2>
      <p className="muted">Xóa toàn bộ hồ sơ bé, tiến độ học và phiên đăng nhập. Dữ liệu bị xóa thật và không khôi phục được.</p>
      <label htmlFor="del">Gõ XÓA để xác nhận</label>
      <input id="del" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      <p><button className="btn danger" disabled={confirmText.trim().toUpperCase() !== "XÓA"} onClick={deleteAccount}>Xóa tài khoản và dữ liệu</button></p>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}

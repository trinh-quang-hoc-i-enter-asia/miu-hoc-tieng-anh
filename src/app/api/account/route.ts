import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { requireParentApi, clearSessionCookie } from "@/lib/auth";
import { requireGateApi } from "@/lib/gate-api";
import { closeGate } from "@/lib/gate";
import { db } from "@/lib/db";

/**
 * Xóa tài khoản và mọi dữ liệu liên quan: hồ sơ bé, tiến độ, phiên đăng nhập, mã đăng nhập.
 * Dữ liệu bị xóa thật khỏi database ngay trong yêu cầu này.
 * Tài khoản soạn bài (bảng staff) là tài khoản riêng nên không bị xóa theo, dù trùng email.
 */
export const DELETE = route(async () => {
  const parent = await requireParentApi();
  await requireGateApi(parent.id);
  await db.$transaction([
    db.loginCode.deleteMany({ where: { email: parent.email, purpose: "parent" } }),
    db.parent.delete({ where: { id: parent.id } }), // children và sessions xóa dây chuyền
  ]);
  await clearSessionCookie();
  await closeGate();
  return NextResponse.json({ ok: true });
});

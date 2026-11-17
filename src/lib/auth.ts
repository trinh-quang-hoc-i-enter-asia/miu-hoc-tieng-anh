import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { sha256, hmac, safeEqual, newToken } from "./crypto";
import { deliverLoginCode } from "./mail";
import { ApiError, unauthorized, badRequest } from "./api";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  LOGIN_CODE_MINUTES,
  LOGIN_CODE_MAX_ATTEMPTS,
  LOGIN_CODE_MAX_PER_WINDOW,
} from "./config";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Body của hai bước đăng nhập, dùng chung cho phụ huynh và khu soạn bài. */
export const requestCodeBody = z.strictObject({ email: z.string().trim().email().max(200) });
export const verifyCodeBody = z.strictObject({
  email: z.string().trim().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Mã gồm 6 chữ số"),
});

/** "parent" = đăng nhập phụ huynh; "staff" = đăng nhập khu soạn bài. Mã của bên này không dùng được cho bên kia. */
export type LoginPurpose = "parent" | "staff";

const codeHash = (purpose: LoginPurpose, email: string, code: string) => hmac(`login:${purpose}:${email}:${code}`);

/** Tạo và gửi mã đăng nhập. Gọi sau khi đã biết email có tài khoản. */
export async function issueLoginCode(email: string, purpose: LoginPurpose): Promise<void> {
  const since = new Date(Date.now() - LOGIN_CODE_MINUTES * 60_000);
  const recent = await db.loginCode.count({ where: { email, purpose, createdAt: { gte: since } } });
  if (recent >= LOGIN_CODE_MAX_PER_WINDOW) {
    throw new ApiError(429, "Yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.", "rate_limited");
  }

  const fixed = process.env.NODE_ENV !== "production" ? process.env.MIU_DEV_FIXED_CODE : undefined;
  const code = fixed && /^\d{6}$/.test(fixed) ? fixed : String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.create({
    data: {
      email,
      purpose,
      codeHash: codeHash(purpose, email, code),
      expiresAt: new Date(Date.now() + LOGIN_CODE_MINUTES * 60_000),
    },
  });
  await deliverLoginCode(email, code, purpose);
}

/** Kiểm tra mã mới nhất của email cho đúng mục đích; đúng thì đánh dấu đã dùng, sai thì ném lỗi. */
export async function consumeLoginCode(email: string, code: string, purpose: LoginPurpose): Promise<void> {
  const invalid = new ApiError(400, "Mã không đúng hoặc đã hết hạn", "bad_code");

  const row = await db.loginCode.findFirst({
    where: { email, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= LOGIN_CODE_MAX_ATTEMPTS) throw invalid;

  if (!safeEqual(row.codeHash, codeHash(purpose, email, code))) {
    await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw invalid;
  }
  await db.loginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
}

/** Phiên tự gia hạn khi lần dùng gần nhất đã cách hơn 1 ngày. */
export const shouldRefreshSession = (lastSeenAt: Date, now: number) => now - lastSeenAt.getTime() > 86_400_000;

export async function setCookie(name: string, token: string, days: number) {
  (await cookies()).set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86_400,
  });
}

/**
 * Tạo và gửi mã đăng nhập phụ huynh. Luôn trả kết quả giống nhau dù email có tồn tại hay không,
 * để không lộ email nào đã đăng ký.
 */
export async function requestLoginCode(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const parent = await db.parent.findUnique({ where: { email } });
  if (!parent || parent.deletedAt) return;
  await issueLoginCode(email, "parent");
}

/** Kiểm tra mã; đúng thì tạo phiên phụ huynh và trả mã phiên (token) để đặt vào cookie. */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  await consumeLoginCode(email, rawCode.trim(), "parent");

  const parent = await db.parent.findUnique({ where: { email } });
  if (!parent || parent.deletedAt) throw new ApiError(400, "Mã không đúng hoặc đã hết hạn", "bad_code");

  const token = newToken();
  await db.session.create({
    data: {
      parentId: parent.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  await setCookie(SESSION_COOKIE, token, SESSION_DAYS);
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Phụ huynh của phiên hiện tại, hoặc null. Tự gia hạn phiên nếu đã qua hơn 1 ngày. */
export async function currentParent() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { parent: true },
  });
  if (!session || session.expiresAt < new Date() || session.parent.deletedAt) return null;

  const now = Date.now();
  if (shouldRefreshSession(session.lastSeenAt, now)) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_DAYS * 86_400_000) },
    });
  }
  return session.parent;
}

export async function logout() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  await clearSessionCookie();
}

/** Dùng trong route API: ném lỗi 401 nếu chưa đăng nhập. */
export async function requireParentApi() {
  const parent = await currentParent();
  if (!parent) throw unauthorized();
  return parent;
}

/** Dùng trong trang: chuyển tới /login nếu chưa đăng nhập. */
export async function requireParentPage() {
  const parent = await currentParent();
  if (!parent) redirect("/login");
  return parent;
}

export { badRequest };

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sha256, newToken } from "./crypto";
import { ApiError, unauthorized } from "./api";
import { normalizeEmail, issueLoginCode, consumeLoginCode, setCookie, shouldRefreshSession } from "./auth";
import { STAFF_SESSION_COOKIE, STAFF_SESSION_DAYS } from "./config";

/**
 * Tài khoản người soạn nội dung: email trong bảng staff, đăng nhập ở /admin/login.
 * Tách hẳn khỏi tài khoản phụ huynh: phiên riêng, cookie riêng, không cần qua cổng phụ huynh.
 */

/** Tạo và gửi mã. Email không có trong bảng staff thì im lặng, để không lộ ai là người soạn. */
export async function requestStaffLoginCode(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!(await db.staff.findUnique({ where: { email } }))) return;
  await issueLoginCode(email, "staff");
}

/** Kiểm tra mã; đúng thì tạo phiên người soạn và trả token để đặt vào cookie. */
export async function verifyStaffLoginCode(rawEmail: string, rawCode: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  await consumeLoginCode(email, rawCode.trim(), "staff");

  const staff = await db.staff.findUnique({ where: { email } });
  if (!staff) throw new ApiError(400, "Mã không đúng hoặc đã hết hạn", "bad_code");

  const token = newToken();
  await db.staffSession.create({
    data: {
      staffId: staff.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + STAFF_SESSION_DAYS * 86_400_000),
    },
  });
  return token;
}

export async function setStaffSessionCookie(token: string) {
  await setCookie(STAFF_SESSION_COOKIE, token, STAFF_SESSION_DAYS);
}

export async function clearStaffSessionCookie() {
  (await cookies()).delete(STAFF_SESSION_COOKIE);
}

/** Người soạn của phiên hiện tại, hoặc null. Tự gia hạn phiên nếu đã qua hơn 1 ngày. */
export async function currentStaff() {
  const token = (await cookies()).get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.staffSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { staff: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const now = Date.now();
  if (shouldRefreshSession(session.lastSeenAt, now)) {
    await db.staffSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + STAFF_SESSION_DAYS * 86_400_000) },
    });
  }
  return session.staff;
}

export async function staffLogout() {
  const token = (await cookies()).get(STAFF_SESSION_COOKIE)?.value;
  if (token) await db.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
  await clearStaffSessionCookie();
}

/** Trang quản trị: chưa đăng nhập khu soạn bài thì chuyển tới /admin/login, rồi quay lại đúng trang. */
export async function requireStaffPage(returnTo: string) {
  const staff = await currentStaff();
  if (!staff) redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`);
  return staff;
}

/** API quản trị: ném lỗi 401 nếu chưa đăng nhập khu soạn bài. */
export async function requireStaffApi() {
  const staff = await currentStaff();
  if (!staff) throw unauthorized("Chưa đăng nhập khu soạn bài");
  return staff;
}

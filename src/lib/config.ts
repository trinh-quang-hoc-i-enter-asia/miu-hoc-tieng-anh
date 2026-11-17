// Các hằng số cấu hình dùng chung.

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

/** Phiên đăng nhập sống 90 ngày, tự gia hạn mỗi khi mở app (đề xuất trong tài liệu thiết kế). */
export const SESSION_DAYS = 90;

export const SESSION_COOKIE = "miu_session";

/** Phiên của người soạn nội dung: tách khỏi phiên phụ huynh, ngắn hơn vì có quyền xuất bản. */
export const STAFF_SESSION_COOKIE = "miu_staff_session";
export const STAFF_SESSION_DAYS = 30;
export const GATE_COOKIE = "miu_gate";
export const GATE_MINUTES = 10;

export const LOGIN_CODE_MINUTES = 10;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_MAX_PER_WINDOW = 5;

/** Bài học luôn có đúng 5 bước theo thứ tự này. */
export const STEP_TYPES = ["story", "listen", "speak", "game", "reward"] as const;
export type StepType = (typeof STEP_TYPES)[number];

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET phải có ít nhất 16 ký tự (xem .env.example)");
  return s;
}

import type { LoginPurpose } from "./auth";

/**
 * Gửi mã đăng nhập cho phụ huynh hoặc người soạn nội dung.
 *
 * Đợt dùng trong nhà chưa có dịch vụ email, nên mã được in ra cửa sổ dòng lệnh
 * đang chạy `npm run dev`. Khi mở cho gia đình khác, thay hàm này bằng một dịch vụ
 * gửi email thật (Resend, Postmark, SES...). Không nơi nào khác cần đổi.
 */
export async function deliverLoginCode(email: string, code: string, purpose: LoginPurpose): Promise<void> {
  const where = purpose === "staff" ? "khu soạn bài" : "phụ huynh";
  console.log(`\n[MIU] Mã đăng nhập ${where} cho ${email}: ${code}\n`);
}

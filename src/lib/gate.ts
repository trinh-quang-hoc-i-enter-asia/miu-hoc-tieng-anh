import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { hmac, safeEqual } from "./crypto";
import { GATE_COOKIE, GATE_MINUTES } from "./config";

/**
 * Cổng phụ huynh: một phép cộng mà bé 4–6 tuổi chưa làm được.
 * Câu hỏi được ký bằng HMAC nên trình duyệt không tự sửa được đáp án.
 */
export function newChallenge(): { a: number; b: number; token: string } {
  const a = randomInt(12, 30);
  const b = randomInt(3, 10);
  const exp = Date.now() + 5 * 60_000;
  return { a, b, token: `${a}.${b}.${exp}.${hmac(`gate-q:${a}:${b}:${exp}`)}` };
}

export function checkAnswer(token: string, answer: number): boolean {
  const [a, b, exp, sig] = token.split(".");
  if (!a || !b || !exp || !sig) return false;
  if (!safeEqual(sig, hmac(`gate-q:${a}:${b}:${exp}`))) return false;
  if (Number(exp) < Date.now()) return false;
  return Number(a) + Number(b) === answer;
}

export async function openGate(parentId: string) {
  const exp = Date.now() + GATE_MINUTES * 60_000;
  (await cookies()).set(GATE_COOKIE, `${exp}.${hmac(`gate-open:${parentId}:${exp}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_MINUTES * 60,
  });
}

export async function isGateOpen(parentId: string): Promise<boolean> {
  const v = (await cookies()).get(GATE_COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(`gate-open:${parentId}:${exp}`));
}

export async function closeGate() {
  (await cookies()).delete(GATE_COOKIE);
}

/** Trang phụ huynh/quản trị: chưa qua cổng thì đưa tới màn hình cổng, rồi quay lại đúng trang. */
export async function requireGatePage(parentId: string, returnTo: string) {
  if (!(await isGateOpen(parentId))) redirect(`/gate?next=${encodeURIComponent(returnTo)}`);
}

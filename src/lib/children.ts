import { z } from "zod";
import { db } from "./db";
import { notFound } from "./api";

export { AVATAR_KEYS, type AvatarKey } from "./avatars";
import { AVATAR_KEYS } from "./avatars";

/** Chỉ trả hồ sơ bé nếu thuộc đúng phụ huynh đang đăng nhập; ngược lại 404. */
export async function getOwnedChild(parentId: string, childId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(childId)) throw notFound();
  const child = await db.child.findFirst({ where: { id: childId, parentId } });
  if (!child) throw notFound();
  return child;
}

export function validBirthYear(y: number, now = new Date()): boolean {
  const cur = now.getFullYear();
  return Number.isInteger(y) && y >= cur - 12 && y <= cur;
}

/** Dữ liệu phụ huynh nhập khi tạo hoặc sửa hồ sơ bé. */
export const childInput = z.strictObject({
  nickname: z.string().trim().min(1, "Hãy nhập tên gọi").max(20, "Tên gọi tối đa 20 ký tự"),
  birthYear: z.number().int(),
  avatarKey: z.enum(AVATAR_KEYS).default("miu"),
  dailyLimitMinutes: z.number().int().min(5).max(240).nullable().optional(),
});


// Khóa ảnh đại diện, dùng được cả ở trình duyệt (khác với children.ts có truy cập database).
export const AVATAR_KEYS = ["miu", "ben", "kem", "xam", "den", "nau"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

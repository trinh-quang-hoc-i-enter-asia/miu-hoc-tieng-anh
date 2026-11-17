// Các khóa hình và nhân vật mà nội dung bài học được phép dùng.
// Thư viện hình thật nằm ở src/lesson-engine/art.ts; trang quản trị và bộ kiểm tra
// dữ liệu dùng danh sách này để từ chối cấu hình trỏ tới hình không tồn tại.

export const MOODS = ["neutral", "happy", "hungry", "sleepy"] as const;
export type Mood = (typeof MOODS)[number];

export const VOICES = ["miu", "ben", "friend", "guide"] as const;
export type Voice = (typeof VOICES)[number];

export const ACTOR_KINDS = ["cat", "pup"] as const;
export const PROP_KINDS = ["balloons", "bowls"] as const;

export const PIC_KEYS = [
  "hello", "bye", "miu", "ben", "happy", "hungry", "sleepy",
  "item-fish", "item-pillow", "item-ball",
] as const;
export type PicKey = (typeof PIC_KEYS)[number];

export const PIC_LABELS: Record<PicKey, string> = {
  hello: "Hai bạn gặp nhau",
  bye: "Hai bạn tạm biệt nhau",
  miu: "Mèo Miu",
  ben: "Cún Ben",
  happy: "Miu vui",
  hungry: "Miu đói",
  sleepy: "Miu buồn ngủ",
  "item-fish": "Cá cho Miu ăn",
  "item-pillow": "Gối cho Miu ngủ",
  "item-ball": "Bóng để chơi",
};

export const SKY_KEYS = ["eve", "night"] as const;
export const NEEDS = ["fish", "pillow", "ball"] as const;

/** Giọng đọc dự phòng (giọng máy của trình duyệt) cao hay thấp theo từng nhân vật. */
export const VOICE_PITCH: Record<Voice, number> = { miu: 1.35, ben: 0.8, friend: 1.1, guide: 1 };

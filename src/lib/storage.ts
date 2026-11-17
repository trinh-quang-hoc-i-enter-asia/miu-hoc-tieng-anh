import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Kho tệp: hình, tiếng và gói bài học.
 *
 * Hiện dùng thư mục trên đĩa (STORAGE_DIR). Khi chuyển sang Cloudflare R2, viết
 * thêm một bản của ba hàm put/get/exists dùng API S3 và đổi ở đây; phần còn lại
 * của app chỉ gọi qua các hàm này.
 */
const ROOT = () => path.resolve(process.env.STORAGE_DIR || "./storage");

function safeKey(key: string): string {
  const clean = path.posix.normalize(key).replace(/^\/+/, "");
  if (!clean || clean.startsWith("..") || clean.includes("\0")) throw new Error(`Khóa tệp không hợp lệ: ${key}`);
  return clean;
}

export async function put(key: string, data: Buffer | string): Promise<void> {
  const file = path.join(ROOT(), safeKey(key));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function get(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(ROOT(), safeKey(key)));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function exists(key: string): Promise<boolean> {
  try {
    await fs.access(path.join(ROOT(), safeKey(key)));
    return true;
  } catch {
    return false;
  }
}

const TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
export const contentTypeFor = (key: string) => TYPES[path.extname(key).toLowerCase()] || "application/octet-stream";

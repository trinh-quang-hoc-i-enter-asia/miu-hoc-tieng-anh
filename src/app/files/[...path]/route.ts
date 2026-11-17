import { route, notFound } from "@/lib/api";
import * as storage from "@/lib/storage";

/**
 * Phát tệp trong kho (gói bài, tiếng). Tệp có số phiên bản hoặc mã riêng nên lưu đệm vô hạn.
 * Khi chuyển sang Cloudflare R2 phía sau CDN, đường dẫn /files/... trỏ thẳng tới CDN và route này
 * chỉ còn dùng khi phát triển.
 */
export const GET = route(async (_req: Request, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const key = path.join("/");
  if (!/^(lessons|audio)\//.test(key)) throw notFound();
  let data: Buffer | null;
  try {
    data = await storage.get(key);
  } catch {
    throw notFound();
  }
  if (!data) throw notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": storage.contentTypeFor(key),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

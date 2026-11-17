import { requireParentPage } from "./auth";
import { requireGatePage } from "./gate";

/** Trang phụ huynh: phải đăng nhập và đã qua cổng phụ huynh. */
export async function requireParentGate(path: string) {
  const parent = await requireParentPage();
  await requireGatePage(parent.id, path);
  return parent;
}

/** Chỉ cho quay về đường dẫn trong app, tránh chuyển hướng ra ngoài. */
export function safeNext(next: string | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

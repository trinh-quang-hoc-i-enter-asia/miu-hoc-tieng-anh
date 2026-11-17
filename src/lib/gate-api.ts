import { forbidden } from "./api";
import { isGateOpen } from "./gate";

/** Việc chỉ phụ huynh được làm: phải đã qua cổng phụ huynh trong 10 phút gần đây. */
export async function requireGateApi(parentId: string) {
  if (!(await isGateOpen(parentId))) throw forbidden("Cần qua cổng phụ huynh trước");
}

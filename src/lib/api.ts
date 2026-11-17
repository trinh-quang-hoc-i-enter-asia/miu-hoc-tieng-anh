import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (msg = "Không tìm thấy") => new ApiError(404, msg, "not_found");
export const unauthorized = (msg = "Chưa đăng nhập") => new ApiError(401, msg, "unauthorized");
export const forbidden = (msg = "Không có quyền") => new ApiError(403, msg, "forbidden");
export const badRequest = (msg: string) => new ApiError(400, msg, "bad_request");

/** Bọc một route handler: lỗi đã biết trả JSON gọn, lỗi lạ trả 500 và ghi log. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message, code: e.code, detail: e.detail }, { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Dữ liệu không hợp lệ",
            code: "invalid",
            fields: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 },
        );
      }
      console.error("[api] lỗi không lường trước:", e);
      return NextResponse.json({ error: "Lỗi máy chủ", code: "server" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Nội dung gửi lên không phải JSON");
  }
}

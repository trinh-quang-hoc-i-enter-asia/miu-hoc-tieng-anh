// Tên các trường trong cấu hình bước chứa mã câu. Không phụ thuộc Zod nên dùng được ở trình duyệt.
const PHRASE_KEYS = new Set(["phrase", "vi", "say", "intro", "hello", "bye", "promptIn", "promptOut", "done"]);

/** Gom mọi mã câu mà các bước đang tham chiếu. */
export function collectPhraseSlugs(steps: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (PHRASE_KEYS.has(k) && typeof val === "string") found.add(val);
        else walk(val);
      }
    }
  };
  walk(steps);
  return [...found];
}

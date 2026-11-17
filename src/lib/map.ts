import type { CatalogTopic, ChildState } from "./learning";

export type MapTopic = CatalogTopic & {
  /** done = đã học xong; next = bài nên học tiếp; open = mở nhưng chưa phải bài tiếp; locked = chờ chủ đề trước; soon = chưa có bài. */
  status: "done" | "next" | "open" | "locked" | "soon";
  stars: number;
};

/**
 * Quy tắc mở khóa: chủ đề sau mở khi mọi bài của chủ đề có bài liền trước đã học xong.
 * Chủ đề chưa có bài nào xuất bản hiện là "sắp có".
 */
export function buildMap(topics: CatalogTopic[], state: ChildState): MapTopic[] {
  const done = (lessonId: string) => state.lessons[lessonId]?.status === "completed";
  let previousComplete = true;
  let nextAssigned = false;
  return topics.map((t) => {
    if (t.lessons.length === 0) return { ...t, status: "soon", stars: 0 };
    const complete = t.lessons.every((l) => done(l.id));
    const unlocked = previousComplete;
    const stars = t.lessons.reduce((n, l) => n + (state.lessons[l.id]?.bestStars ?? 0), 0);
    let status: MapTopic["status"];
    if (!unlocked) status = "locked";
    else if (complete) status = "done";
    else if (!nextAssigned) {
      status = "next";
      nextAssigned = true;
    } else status = "open";
    previousComplete = previousComplete && complete;
    return { ...t, status, stars };
  });
}

/** Bài tiếp theo sau một bài cho trước, theo thứ tự chủ đề rồi bài. */
export function nextLesson(topics: CatalogTopic[], lessonId: string) {
  const flat = topics.flatMap((t) => t.lessons);
  const i = flat.findIndex((l) => l.id === lessonId);
  return i >= 0 && i + 1 < flat.length ? flat[i + 1] : null;
}

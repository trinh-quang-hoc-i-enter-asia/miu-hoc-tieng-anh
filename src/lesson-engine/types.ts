import type { Voice } from "@/lib/content-keys";
import type { LessonPack } from "@/lib/pack-types";

export type EventKind =
  | "lesson_start"
  | "step_complete"
  | "answer_correct"
  | "answer_wrong"
  | "spoken"
  | "lesson_complete";

/** Những gì mỗi bước được phép gọi từ máy chạy bài. */
export type PlayerCtx = {
  pack: LessonPack;
  /** Hủy mọi luồng đang chạy trong bước và dừng tiếng; trả về mã lần chạy mới. */
  newRun(): number;
  alive(id: number): boolean;
  say(slug: string, voice?: Voice): Promise<void>;
  textOf(slug: string): string;
  /** Mã câu khen kế tiếp, xoay vòng. */
  praise(): string;
  addStar(): void;
  getStars(): number;
  emit(kind: EventKind, extra?: { stepType?: string; phraseSlug?: string; payload?: Record<string, number | boolean> }): void;
};

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

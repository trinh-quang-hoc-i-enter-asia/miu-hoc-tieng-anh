import type { AnyStep } from "./lesson-schema";
import type { Voice } from "./content-keys";

export type PackAudio = { src: string; type: string };

export type PackPhrase = {
  text: string;
  lang: "en" | "vi";
  /** Tệp tiếng theo từng giọng; thiếu thì máy chạy bài dùng giọng dự phòng của trình duyệt. */
  audio?: Partial<Record<Voice, PackAudio[]>>;
};

/** Gói bài học: một tệp JSON chứa đủ 5 bước, các câu và đường dẫn tiếng. */
export type LessonPack = {
  lesson: {
    id: string;
    slug: string;
    title: string;
    version: number;
    topicSlug: string;
    topicTitle: string;
  };
  sticker: { id: string | null; name: string; artKey: string };
  phrases: Record<string, PackPhrase>;
  steps: AnyStep[];
};

export const packKey = (lessonId: string, version: number) => `lessons/${lessonId}/v${version}.json`;
export const packUrl = (lessonId: string, version: number) => `/files/${packKey(lessonId, version)}`;

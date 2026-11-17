import { db } from "./db";
import { ApiError, notFound } from "./api";
import * as storage from "./storage";
import { validateSteps, collectPhraseSlugs, type StepIssue } from "./lesson-schema";
import { packKey, type LessonPack, type PackPhrase, type PackAudio } from "./pack-types";
import type { Voice } from "./content-keys";

const AUDIO_TYPES: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav" };

/** Đường dẫn các tệp tiếng có thể phát được cho một tệp WAV gốc (ưu tiên MP3 và AAC đã chuyển). */
async function audioSources(storageKey: string): Promise<PackAudio[]> {
  const base = storageKey.replace(/\.wav$/i, "");
  const out: PackAudio[] = [];
  for (const ext of ["mp3", "m4a"]) {
    if (await storage.exists(`${base}.${ext}`)) out.push({ src: `/files/${base}.${ext}`, type: AUDIO_TYPES[ext] });
  }
  if (out.length === 0) out.push({ src: `/files/${storageKey}`, type: AUDIO_TYPES.wav });
  return out;
}

export type BuildResult =
  | { ok: true; pack: LessonPack; missingAudio: string[] }
  | { ok: false; issues: StepIssue[]; missingPhrases: string[] };

/** Dựng gói bài từ bản nháp trong database. Dùng cho cả xuất bản lẫn xem trước. */
export async function buildPack(lessonId: string, version: number): Promise<BuildResult> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { steps: { orderBy: { position: "asc" } }, topic: true, sticker: true },
  });
  if (!lesson) throw notFound("Không tìm thấy bài học");

  const { issues, steps } = validateSteps(lesson.steps.map((s) => ({ type: s.type, config: s.config })));
  if (issues.length) return { ok: false, issues, missingPhrases: [] };

  const wanted = new Set(collectPhraseSlugs(steps));
  const ui = await db.phrase.findMany({ where: { slug: { startsWith: "ui-" } }, select: { slug: true } });
  ui.forEach((p) => wanted.add(p.slug));

  const rows = await db.phrase.findMany({
    where: { slug: { in: [...wanted] } },
    include: { audio: { include: { asset: true } } },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const missingPhrases = [...wanted].filter((s) => !bySlug.has(s));
  if (missingPhrases.length) return { ok: false, issues: [], missingPhrases };

  const phrases: Record<string, PackPhrase> = {};
  const missingAudio: string[] = [];
  for (const slug of [...wanted].sort()) {
    const r = bySlug.get(slug)!;
    const lang = r.kind === "en" ? "en" : "vi";
    const text = (lang === "en" ? r.textEn : r.textVi) ?? "";
    const audio: PackPhrase["audio"] = {};
    for (const a of r.audio) audio[a.voice as Voice] = await audioSources(a.asset.storageKey);
    if (r.audio.length === 0) missingAudio.push(slug);
    phrases[slug] = Object.keys(audio).length ? { text, lang, audio } : { text, lang };
  }

  const reward = steps.find((s) => s.type === "reward");
  const pack: LessonPack = {
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.titleVi,
      version,
      topicSlug: lesson.topic.slug,
      topicTitle: lesson.topic.titleVi,
    },
    sticker: {
      id: lesson.sticker?.id ?? null,
      name: lesson.sticker?.nameVi ?? `Nhãn dán ${lesson.titleVi}`,
      artKey: lesson.sticker?.artKey ?? (reward && reward.type === "reward" ? reward.badge : "miu"),
    },
    phrases,
    steps,
  };
  return { ok: true, pack, missingAudio };
}

export class PublishBlocked extends ApiError {
  constructor(message: string, detail: { issues?: StepIssue[]; missingPhrases?: string[]; missingAudio?: string[] }) {
    super(422, message, "publish_blocked", detail);
  }
}

/**
 * Xuất bản một bài: kiểm tra, tăng phiên bản, ghi gói bài vào kho tệp, cập nhật database.
 * Bài chưa có đủ tệp tiếng bị chặn, trừ khi MIU_ALLOW_MISSING_AUDIO=1 (chỉ để phát triển).
 */
export async function publishLesson(lessonId: string): Promise<{ version: number; missingAudio: string[] }> {
  const current = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!current) throw notFound("Không tìm thấy bài học");
  const version = current.version + 1;

  const built = await buildPack(lessonId, version);
  if (!built.ok) {
    throw new PublishBlocked(
      built.missingPhrases.length
        ? `Bài trỏ tới câu chưa tồn tại: ${built.missingPhrases.join(", ")}`
        : "Cấu hình các bước chưa hợp lệ",
      { issues: built.issues, missingPhrases: built.missingPhrases },
    );
  }
  const allowMissing = process.env.MIU_ALLOW_MISSING_AUDIO === "1";
  if (built.missingAudio.length && !allowMissing) {
    throw new PublishBlocked(`Còn ${built.missingAudio.length} câu chưa có tệp tiếng`, {
      missingAudio: built.missingAudio,
    });
  }

  await storage.put(packKey(lessonId, version), JSON.stringify(built.pack));

  const slugs = Object.keys(built.pack.phrases).filter((s) => !s.startsWith("ui-"));
  const phraseRows = await db.phrase.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });

  await db.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: lessonId },
      data: { status: "published", version, publishedAt: new Date() },
    });
    await tx.lessonPhrase.deleteMany({ where: { lessonId } });
    await tx.lessonPhrase.createMany({
      data: phraseRows.map((p, i) => ({ lessonId, phraseId: p.id, position: i })),
    });
    await tx.sticker.upsert({
      where: { lessonId },
      create: { lessonId, nameVi: built.pack.sticker.name, artKey: built.pack.sticker.artKey },
      update: { artKey: built.pack.sticker.artKey },
    });
    await tx.topic.update({ where: { id: current.topicId }, data: { status: "published" } });
  });

  return { version, missingAudio: built.missingAudio };
}

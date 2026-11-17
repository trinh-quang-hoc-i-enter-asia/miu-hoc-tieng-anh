import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { badRequest } from "./api";
import { dayKey, dayToDate } from "./time";

export const EVENT_KINDS = [
  "lesson_start",
  "step_complete",
  "answer_correct",
  "answer_wrong",
  "spoken",
  "lesson_complete",
] as const;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const eventSchema = z.strictObject({
  id: uuid,
  lessonId: uuid,
  lessonVersion: z.number().int().min(0).max(10_000),
  kind: z.enum(EVENT_KINDS),
  stepType: z.string().max(20).optional(),
  phraseSlug: z.string().max(80).optional(),
  occurredAt: z.string().datetime(),
  // Số giây, số sao, chỉ số bước. Chỉ nhận số nhỏ để tránh dữ liệu rác.
  payload: z
    .strictObject({
      seconds: z.number().int().min(0).max(1800).optional(),
      stars: z.number().int().min(0).max(60).optional(),
      stepIndex: z.number().int().min(0).max(4).optional(),
      resumed: z.boolean().optional(),
    })
    .optional(),
});

export const eventBatchSchema = z.strictObject({
  events: z.array(eventSchema).min(1).max(200),
});
export type ClientEvent = z.infer<typeof eventSchema>;

export type ApplyResult = { received: number; accepted: number; duplicates: number };

/**
 * Nhận một lô sự kiện học của bé.
 *
 * - Sự kiện trùng mã bị bỏ qua, nên trình duyệt gửi lại bao nhiêu lần cũng an toàn.
 * - Ghi sự kiện và cập nhật các bảng tổng hợp trong cùng một giao dịch.
 * - Bảng tổng hợp chỉ tính các sự kiện mới, theo thứ tự thời gian xảy ra.
 */
export async function applyEvents(childId: string, input: unknown): Promise<ApplyResult> {
  const { events } = eventBatchSchema.parse(input);

  const lessonIds = [...new Set(events.map((e) => e.lessonId))];
  const lessons = await db.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, sticker: { select: { id: true } } },
  });
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  if (lessonMap.size !== lessonIds.length) throw badRequest("Có sự kiện thuộc bài học không tồn tại");

  const slugs = [...new Set(events.map((e) => e.phraseSlug).filter((s): s is string => !!s))];
  const phrases = slugs.length
    ? await db.phrase.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : [];
  const phraseMap = new Map(phrases.map((p) => [p.slug, p.id]));
  for (const s of slugs) if (!phraseMap.has(s)) throw badRequest(`Câu không tồn tại: ${s}`);

  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  return db.$transaction(async (tx) => {
    let accepted = 0;
    for (const e of sorted) {
      const phraseId = e.phraseSlug ? phraseMap.get(e.phraseSlug)! : null;
      const occurredAt = new Date(e.occurredAt);

      // Thêm nếu chưa có mã này; RETURNING cho biết sự kiện có thật sự mới hay không.
      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO activity_events
          (id, child_id, lesson_id, lesson_version, step_type, phrase_id, kind, payload, occurred_at)
        VALUES
          (${e.id}::uuid, ${childId}::uuid, ${e.lessonId}::uuid, ${e.lessonVersion}, ${e.stepType ?? null},
           ${phraseId}::uuid, ${e.kind}, ${e.payload ? JSON.stringify(e.payload) : null}::jsonb, ${occurredAt})
        ON CONFLICT (id) DO NOTHING
        RETURNING id`;
      if (inserted.length === 0) continue;
      accepted++;

      await aggregate(tx, childId, e, phraseId, occurredAt, lessonMap.get(e.lessonId)!.sticker?.id ?? null);
    }
    return { received: events.length, accepted, duplicates: events.length - accepted };
  });
}

type Tx = Prisma.TransactionClient;

async function aggregate(
  tx: Tx,
  childId: string,
  e: ClientEvent,
  phraseId: string | null,
  at: Date,
  stickerId: string | null,
) {
  const day = dayToDate(dayKey(at));
  const p = e.payload ?? {};
  const progressKey = { childId_lessonId: { childId, lessonId: e.lessonId } };

  switch (e.kind) {
    case "lesson_start": {
      await tx.lessonProgress.upsert({
        where: progressKey,
        create: { childId, lessonId: e.lessonId, status: "in_progress", lastStep: 0 },
        update: {},
      });
      // Bài đang học dở chuyển sang "in_progress" nếu chưa từng xong.
      await tx.lessonProgress.updateMany({
        where: { childId, lessonId: e.lessonId, status: "not_started" },
        data: { status: "in_progress" },
      });
      break;
    }

    case "answer_correct":
    case "answer_wrong":
    case "spoken": {
      if (!phraseId) break;
      const field = e.kind === "answer_correct" ? "correctCount" : e.kind === "answer_wrong" ? "wrongCount" : "spokenCount";
      // Sai thì ôn lại sau 1 ngày; đúng hoặc nói theo thì sau 3 ngày.
      const next = new Date(at.getTime() + (e.kind === "answer_wrong" ? 1 : 3) * 86_400_000);
      await tx.phraseProgress.upsert({
        where: { childId_phraseId: { childId, phraseId } },
        create: { childId, phraseId, heardCount: 1, [field]: 1, lastSeenAt: at, nextReviewAt: next },
        update: { heardCount: { increment: 1 }, [field]: { increment: 1 }, lastSeenAt: at, nextReviewAt: next },
      });
      break;
    }

    case "step_complete": {
      const seconds = p.seconds ?? 0;
      if (seconds > 0) {
        await tx.dailyActivity.upsert({
          where: { childId_day: { childId, day } },
          create: { childId, day, secondsLearned: seconds },
          update: { secondsLearned: { increment: seconds } },
        });
      }
      // Ghi nhớ bước đã xong để lần sau vào lại đúng chỗ (bài chưa hoàn thành).
      if (p.stepIndex !== undefined) {
        await tx.lessonProgress.upsert({
          where: progressKey,
          create: { childId, lessonId: e.lessonId, status: "in_progress", lastStep: p.stepIndex + 1 },
          update: {},
        });
        await tx.lessonProgress.updateMany({
          where: { childId, lessonId: e.lessonId, status: { not: "completed" } },
          data: { status: "in_progress", lastStep: p.stepIndex + 1 },
        });
      }
      break;
    }

    case "lesson_complete": {
      const stars = p.stars ?? 0;
      const existing = await tx.lessonProgress.findUnique({ where: progressKey });
      await tx.lessonProgress.upsert({
        where: progressKey,
        create: {
          childId, lessonId: e.lessonId, status: "completed", lastStep: 0,
          bestStars: stars, timesCompleted: 1, firstCompletedAt: at,
        },
        update: {
          status: "completed",
          lastStep: 0,
          bestStars: Math.max(existing?.bestStars ?? 0, stars),
          timesCompleted: { increment: 1 },
          firstCompletedAt: existing?.firstCompletedAt ?? at,
        },
      });
      await tx.dailyActivity.upsert({
        where: { childId_day: { childId, day } },
        create: { childId, day, lessonsCompleted: 1, starsEarned: stars },
        update: { lessonsCompleted: { increment: 1 }, starsEarned: { increment: stars } },
      });
      if (stickerId) {
        await tx.childSticker.upsert({
          where: { childId_stickerId: { childId, stickerId } },
          create: { childId, stickerId, earnedAt: at },
          update: {},
        });
      }
      break;
    }
  }
}

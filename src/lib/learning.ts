import { db } from "./db";
import { dayKey, dayToDate, lastDays } from "./time";
import { packUrl } from "./pack-types";

/** Chủ đề và bài đã xuất bản, kèm đường dẫn gói bài (đã gắn số phiên bản). */
export async function getCatalog() {
  const topics = await db.topic.findMany({
    orderBy: { position: "asc" },
    include: {
      lessons: { where: { status: "published" }, orderBy: { position: "asc" } },
    },
  });
  return topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.titleVi,
    artKey: t.artKey,
    position: t.position,
    lessons: t.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.titleVi,
      version: l.version,
      packUrl: packUrl(l.id, l.version),
    })),
  }));
}

export type CatalogTopic = Awaited<ReturnType<typeof getCatalog>>[number];

/** Tiến độ của một bé: từng bài, nhãn dán đã có, thời gian học hôm nay và giới hạn. */
export async function getChildState(childId: string) {
  const child = await db.child.findUniqueOrThrow({ where: { id: childId } });
  const today = dayKey();
  const [progress, stickers, daily, stars] = await Promise.all([
    db.lessonProgress.findMany({ where: { childId } }),
    db.childSticker.findMany({ where: { childId }, include: { sticker: true }, orderBy: { earnedAt: "asc" } }),
    db.dailyActivity.findUnique({ where: { childId_day: { childId, day: dayToDate(today) } } }),
    db.lessonProgress.aggregate({ where: { childId }, _sum: { bestStars: true } }),
  ]);

  const secondsToday = daily?.secondsLearned ?? 0;
  const limit = child.dailyLimitMinutes;
  return {
    child: {
      id: child.id,
      nickname: child.nickname,
      avatarKey: child.avatarKey,
      dailyLimitMinutes: limit,
    },
    today: {
      day: today,
      secondsLearned: secondsToday,
      limitMinutes: limit,
      limitReached: limit != null && secondsToday >= limit * 60,
    },
    totalStars: stars._sum.bestStars ?? 0,
    lessons: Object.fromEntries(
      progress.map((p) => [
        p.lessonId,
        { status: p.status, lastStep: p.lastStep, bestStars: p.bestStars, timesCompleted: p.timesCompleted },
      ]),
    ),
    stickers: stickers.map((s) => ({
      id: s.stickerId,
      name: s.sticker.nameVi,
      artKey: s.sticker.artKey,
      earnedAt: s.earnedAt.toISOString(),
    })),
  };
}

export type ChildState = Awaited<ReturnType<typeof getChildState>>;

/** Báo cáo cho phụ huynh: 7 ngày gần nhất, bài đã xong, số câu đã học. */
export async function getChildReport(childId: string) {
  const days = lastDays(7);
  const [daily, progress, phrases] = await Promise.all([
    db.dailyActivity.findMany({
      where: { childId, day: { gte: dayToDate(days[0]), lte: dayToDate(days[6]) } },
    }),
    db.lessonProgress.findMany({
      where: { childId, status: "completed" },
      include: { lesson: { select: { titleVi: true, topic: { select: { titleVi: true } } } } },
      orderBy: { firstCompletedAt: "asc" },
    }),
    db.phraseProgress.findMany({
      where: { childId, OR: [{ correctCount: { gt: 0 } }, { spokenCount: { gt: 0 } }] },
      include: { phrase: { select: { textEn: true, slug: true } } },
    }),
  ]);
  const byDay = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
  return {
    days: days.map((d) => ({
      day: d,
      minutes: Math.round(((byDay.get(d)?.secondsLearned ?? 0) / 60) * 10) / 10,
      lessonsCompleted: byDay.get(d)?.lessonsCompleted ?? 0,
      stars: byDay.get(d)?.starsEarned ?? 0,
    })),
    completedLessons: progress.map((p) => ({
      title: p.lesson.titleVi,
      topic: p.lesson.topic.titleVi,
      stars: p.bestStars,
      times: p.timesCompleted,
    })),
    learnedPhrases: phrases
      .filter((p) => p.phrase.textEn)
      .map((p) => ({
        text: p.phrase.textEn!,
        correct: p.correctCount,
        wrong: p.wrongCount,
        spoken: p.spokenCount,
      })),
  };
}

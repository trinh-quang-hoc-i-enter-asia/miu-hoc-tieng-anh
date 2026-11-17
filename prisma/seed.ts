import "dotenv/config";
import { db } from "../src/lib/db";
import { publishLesson } from "../src/lib/publish";
import { UI_PHRASES } from "../src/lib/instructions";

/**
 * Dữ liệu mẫu cho đợt dùng trong nhà:
 *  - một tài khoản phụ huynh tạo sẵn (cũng là người soạn nội dung) và một hồ sơ bé;
 *  - 8 chủ đề; 2 bài đầu (Chào hỏi, Cảm xúc) đã xuất bản, 6 bài còn lại chờ soạn;
 *  - các lời hướng dẫn tiếng Việt dùng chung.
 *
 * Chạy lại nhiều lần an toàn: chỉ thêm cái còn thiếu, không ghi đè nội dung đã sửa.
 */

const TOPICS = [
  { slug: "chao-hoi", title: "Chào hỏi", art: "hello" },
  { slug: "cam-xuc", title: "Cảm xúc", art: "happy" },
  { slug: "gia-dinh", title: "Gia đình", art: "miu" },
  { slug: "an-uong", title: "Ăn uống", art: "item-fish" },
  { slug: "lich-su", title: "Lịch sự", art: "hello" },
  { slug: "do-choi", title: "Đồ chơi và màu sắc", art: "item-ball" },
  { slug: "sinh-hoat", title: "Sinh hoạt hàng ngày", art: "sleepy" },
  { slug: "con-vat", title: "Con vật", art: "ben" },
];

const EN_PHRASES: Record<string, string> = {
  hello: "Hello!",
  goodbye: "Goodbye!",
  "whats-your-name": "What’s your name?",
  "im-miu": "I’m Miu.",
  "im-ben": "I’m Ben.",
  "im-happy": "I’m happy.",
  "im-hungry": "I’m hungry.",
  "im-sleepy": "I’m sleepy.",
};

const VI_PHRASES: Record<string, string> = {
  "chao-hoi-s1": "Miu gặp một bạn mới ở công viên.",
  "chao-hoi-s2": "Bạn hỏi tên của Miu.",
  "chao-hoi-s3": "Đến lượt Miu hỏi tên bạn.",
  "chao-hoi-s4": "Trời tối rồi. Hai bạn tạm biệt nhau.",
  "chao-hoi-greet-in": "Bạn đến chơi! Miu nói gì nhỉ?",
  "chao-hoi-greet-out": "Bạn về nhà rồi. Miu nói gì nhỉ?",
  "chao-hoi-done": "Hoan hô! Con học xong bài Chào hỏi rồi!",
  "cam-xuc-s1": "Hai bạn có bóng bay. Vui quá!",
  "cam-xuc-s2": "Đến trưa rồi. Bụng hai bạn kêu ọc ọc.",
  "cam-xuc-s3": "Trời tối rồi. Hai bạn ngáp dài.",
  "cam-xuc-give-intro": "Miu đói thì cho Miu ăn cá. Miu buồn ngủ thì đưa gối. Miu vui thì chơi bóng nhé!",
  "cam-xuc-done": "Hoan hô! Con học xong bài Cảm xúc rồi!",
};

const miu = { id: "miu", kind: "cat", voice: "miu", x: 118, y: 268, s: 1.05 } as const;
const ben = { id: "ben", kind: "pup", voice: "ben", x: 288, y: 268, s: 1.05, flip: true } as const;

const LESSONS = [
  {
    slug: "chao-hoi",
    topic: "chao-hoi",
    title: "Chào hỏi",
    steps: [
      {
        type: "story",
        config: {
          type: "story",
          aria: "Mèo Miu và cún Ben gặp nhau ở công viên",
          actors: [miu, ben],
          props: [],
          frames: [
            { vi: "chao-hoi-s1", pose: "wave", lines: [{ who: "miu", phrase: "hello" }, { who: "ben", phrase: "hello" }] },
            { vi: "chao-hoi-s2", lines: [{ who: "ben", phrase: "whats-your-name" }, { who: "miu", phrase: "im-miu" }] },
            { vi: "chao-hoi-s3", lines: [{ who: "miu", phrase: "whats-your-name" }, { who: "ben", phrase: "im-ben" }] },
            { vi: "chao-hoi-s4", pose: "wave", sky: "eve", lines: [{ who: "miu", phrase: "goodbye" }, { who: "ben", phrase: "goodbye" }] },
          ],
        },
      },
      {
        type: "listen",
        config: {
          type: "listen",
          rounds: [
            { phrase: "hello", voice: "miu", options: ["hello", "bye"], answer: "hello" },
            { phrase: "goodbye", voice: "ben", options: ["hello", "bye"], answer: "bye" },
            { phrase: "im-miu", voice: "miu", options: ["ben", "miu"], answer: "miu" },
            { phrase: "im-ben", voice: "ben", options: ["ben", "miu"], answer: "ben" },
          ],
        },
      },
      {
        type: "speak",
        config: {
          type: "speak",
          items: [{ phrase: "hello" }, { phrase: "whats-your-name" }, { phrase: "im-miu" }, { phrase: "goodbye" }],
        },
      },
      {
        type: "game",
        config: {
          type: "game",
          kind: "greet",
          hello: "hello",
          bye: "goodbye",
          promptIn: "chao-hoi-greet-in",
          promptOut: "chao-hoi-greet-out",
          rounds: [
            { t: "in", f: "a" }, { t: "out", f: "a" }, { t: "in", f: "b" },
            { t: "in", f: "a" }, { t: "out", f: "b" }, { t: "out", f: "a" },
          ],
        },
      },
      { type: "reward", config: { type: "reward", badge: "miu", done: "chao-hoi-done", bye: "goodbye" } },
    ],
  },
  {
    slug: "cam-xuc",
    topic: "cam-xuc",
    title: "Cảm xúc",
    steps: [
      {
        type: "story",
        config: {
          type: "story",
          aria: "Một ngày của mèo Miu và cún Ben: vui, đói, rồi buồn ngủ",
          actors: [miu, ben],
          props: [{ id: "balloons", kind: "balloons" }, { id: "bowls", kind: "bowls" }],
          frames: [
            {
              vi: "cam-xuc-s1", pose: "hi", mood: { miu: "happy", ben: "happy" }, show: ["balloons"],
              lines: [{ who: "miu", phrase: "im-happy" }, { who: "ben", phrase: "im-happy" }],
            },
            {
              vi: "cam-xuc-s2", mood: { miu: "hungry", ben: "hungry" }, show: ["bowls"],
              lines: [{ who: "ben", phrase: "im-hungry" }, { who: "miu", phrase: "im-hungry" }],
            },
            {
              vi: "cam-xuc-s3", sky: "night", mood: { miu: "sleepy", ben: "sleepy" },
              lines: [{ who: "miu", phrase: "im-sleepy" }, { who: "ben", phrase: "im-sleepy" }],
            },
          ],
        },
      },
      {
        type: "listen",
        config: {
          type: "listen",
          rounds: [
            { phrase: "im-happy", voice: "miu", options: ["happy", "sleepy"], answer: "happy" },
            { phrase: "im-hungry", voice: "miu", options: ["happy", "hungry"], answer: "hungry" },
            { phrase: "im-sleepy", voice: "miu", options: ["sleepy", "hungry"], answer: "sleepy" },
            { phrase: "im-hungry", voice: "ben", options: ["hungry", "sleepy"], answer: "hungry" },
          ],
        },
      },
      {
        type: "speak",
        config: {
          type: "speak",
          items: [
            { phrase: "im-happy", mood: "happy" },
            { phrase: "im-hungry", mood: "hungry" },
            { phrase: "im-sleepy", mood: "sleepy" },
          ],
        },
      },
      {
        type: "game",
        config: {
          type: "game",
          kind: "give",
          intro: "cam-xuc-give-intro",
          rounds: [
            { say: "im-hungry", need: "fish", mood: "hungry" },
            { say: "im-sleepy", need: "pillow", mood: "sleepy" },
            { say: "im-happy", need: "ball", mood: "happy" },
            { say: "im-sleepy", need: "pillow", mood: "neutral" },
            { say: "im-hungry", need: "fish", mood: "neutral" },
            { say: "im-happy", need: "ball", mood: "neutral" },
          ],
        },
      },
      { type: "reward", config: { type: "reward", badge: "happy", done: "cam-xuc-done", bye: "im-happy" } },
    ],
  },
];

async function main() {
  const email = (process.env.SEED_PARENT_EMAIL || "phuhuynh@miu.local").trim().toLowerCase();
  const staffEmail = (process.env.SEED_STAFF_EMAIL || email).trim().toLowerCase();

  // Tài khoản phụ huynh tạo sẵn.
  const parent = await db.parent.upsert({
    where: { email },
    create: { email, consentAt: new Date() },
    update: {},
  });
  // Tài khoản người soạn nội dung: tách riêng, đăng nhập ở /admin/login. Mặc định trùng email phụ huynh.
  await db.staff.upsert({ where: { email: staffEmail }, create: { email: staffEmail, role: "editor" }, update: {} });

  if ((await db.child.count({ where: { parentId: parent.id } })) === 0) {
    await db.child.create({
      data: { parentId: parent.id, nickname: "Bé", birthYear: new Date().getFullYear() - 5, avatarKey: "miu" },
    });
  }

  // Chủ đề.
  const topicIds = new Map<string, string>();
  for (const [i, t] of TOPICS.entries()) {
    const row = await db.topic.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, titleVi: t.title, position: i + 1, artKey: t.art },
      update: {},
    });
    topicIds.set(t.slug, row.id);
  }

  // Câu: tiếng Anh cần dạy và lời hướng dẫn tiếng Việt.
  for (const [slug, textEn] of Object.entries(EN_PHRASES)) {
    await db.phrase.upsert({ where: { slug }, create: { slug, kind: "en", textEn }, update: {} });
  }
  for (const [slug, textVi] of Object.entries({
    ...VI_PHRASES,
    ...Object.fromEntries(UI_PHRASES.map((p) => [p.slug, p.textVi])),
  })) {
    await db.phrase.upsert({ where: { slug }, create: { slug, kind: "vi", textVi }, update: {} });
  }

  // Bài học: chỉ tạo bài còn thiếu rồi xuất bản; bài đã có thì giữ nguyên.
  for (const [i, l] of LESSONS.entries()) {
    if (await db.lesson.findUnique({ where: { slug: l.slug } })) continue;
    const lesson = await db.lesson.create({
      data: {
        slug: l.slug,
        titleVi: l.title,
        position: i + 1,
        topicId: topicIds.get(l.topic)!,
        steps: { create: l.steps.map((s, pos) => ({ position: pos, type: s.type, config: s.config })) },
      },
    });
    const { version } = await publishLesson(lesson.id);
    console.log(`Đã xuất bản bài "${l.title}" (phiên bản ${version})`);
  }

  console.log(`Seed xong. Phụ huynh tạo sẵn: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

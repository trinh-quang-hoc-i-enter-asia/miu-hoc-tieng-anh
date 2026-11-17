/** Kiểm thử đơn vị: không cần database hay máy chủ. Chạy bằng: npx tsx --test tests/unit.test.ts */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseWav } from "../src/lib/wav";
import { validateSteps, validateStepConfig } from "../src/lib/lesson-schema";
import { collectPhraseSlugs } from "../src/lib/phrase-refs";
import { dayKey, lastDays, addDays } from "../src/lib/time";
import { buildMap, nextLesson } from "../src/lib/map";
import type { CatalogTopic, ChildState } from "../src/lib/learning";

/** Dựng một tệp WAV PCM trong bộ nhớ. */
function wav(opts: { rate?: number; channels?: number; bits?: number; format?: number; seconds?: number } = {}) {
  const { rate = 48000, channels = 1, bits = 16, format = 1, seconds = 0.5 } = opts;
  const dataSize = Math.round(rate * channels * (bits / 8) * seconds);
  const b = Buffer.alloc(44 + dataSize);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + dataSize, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(format, 20);
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * channels * (bits / 8), 28);
  b.writeUInt16LE(channels * (bits / 8), 32);
  b.writeUInt16LE(bits, 34);
  b.write("data", 36, "ascii");
  b.writeUInt32LE(dataSize, 40);
  return b;
}

const story = {
  type: "story", aria: "Cảnh thử",
  actors: [{ id: "miu", kind: "cat", voice: "miu", x: 100, y: 268 }],
  frames: [{ vi: "s1", lines: [{ who: "miu", phrase: "hello" }] }],
};
const listen = { type: "listen", rounds: [{ phrase: "hello", voice: "miu", options: ["hello", "bye"], answer: "hello" }] };
const speak = { type: "speak", items: [{ phrase: "hello" }] };
const game = { type: "game", kind: "give", intro: "gi", rounds: [{ say: "im-hungry", need: "fish", mood: "hungry" }] };
const reward = { type: "reward", badge: "miu", done: "done", bye: "goodbye" };
const full = () => [story, listen, speak, game, reward].map((c) => ({ type: c.type, config: structuredClone(c) }));

describe("tệp WAV gốc", () => {
  it("nhận WAV PCM 48 kHz 16 bit mono và tính đúng thời lượng", () => {
    const info = parseWav(wav({ seconds: 0.5 }));
    assert.deepEqual([info.sampleRate, info.channels, info.bits], [48000, 1, 16]);
    assert.equal(info.durationMs, 500);
  });
  it("từ chối sai tần số, hai kênh, 24 bit, không nén PCM, và tệp không phải WAV", () => {
    assert.throws(() => parseWav(wav({ rate: 44100 })), /48 kHz/);
    assert.throws(() => parseWav(wav({ channels: 2 })), /một kênh/);
    assert.throws(() => parseWav(wav({ bits: 24 })), /16 bit/);
    assert.throws(() => parseWav(wav({ format: 3 })), /PCM/);
    assert.throws(() => parseWav(Buffer.from("không phải WAV, chỉ là chữ thường thôi nhé, đủ dài hơn bốn mươi bốn byte")), /không phải tệp WAV/);
    assert.throws(() => parseWav(Buffer.alloc(10)), /không phải tệp WAV/);
  });
});

describe("lược đồ 5 bước của bài", () => {
  it("nhận bài đủ 5 bước đúng thứ tự", () => {
    const r = validateSteps(full());
    assert.deepEqual(r.issues, []);
    assert.equal(r.steps.length, 5);
  });
  it("báo lỗi khi thiếu bước hoặc sai thứ tự", () => {
    assert.ok(validateSteps(full().slice(0, 4)).issues.length > 0);
    const swapped = full();
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    assert.ok(validateSteps(swapped).issues.some((i) => /phải là "listen"/.test(i.message)));
  });
  it("từ chối khóa hình, giọng, nét mặt và trường lạ không có trong thư viện", () => {
    const bad = (mutate: (s: ReturnType<typeof full>) => void) => {
      const s = full();
      mutate(s);
      return validateSteps(s).issues.length > 0;
    };
    assert.ok(bad((s) => ((s[1].config as typeof listen).rounds[0].options[0] = "khong-co")));
    assert.ok(bad((s) => ((s[1].config as typeof listen).rounds[0].voice = "robot")));
    assert.ok(bad((s) => ((s[3].config as typeof game).rounds[0].mood = "gian")));
    assert.ok(bad((s) => ((s[4].config as Record<string, unknown>).thuoc_tinh_la = 1)));
    assert.ok(bad((s) => ((s[0].config as typeof story).frames[0].lines[0].phrase = "Có Dấu")));
  });
  it("kiểm tra riêng từng bước theo vị trí", () => {
    assert.deepEqual(validateStepConfig(1, listen), []);
    assert.ok(validateStepConfig(1, speak).length > 0);
    assert.ok(validateStepConfig(7, listen).length > 0);
  });
});

describe("gom mã câu", () => {
  it("lấy mọi mã câu được tham chiếu trong 5 bước", () => {
    const slugs = collectPhraseSlugs(full().map((s) => s.config)).sort();
    assert.deepEqual(slugs, ["done", "gi", "goodbye", "hello", "im-hungry", "s1"]);
  });
});

describe("ngày học theo múi giờ", () => {
  it("23:30 giờ UTC đã là ngày hôm sau ở Việt Nam", () => {
    const d = new Date("2026-11-16T18:30:00Z");
    assert.equal(dayKey(d, "Asia/Ho_Chi_Minh"), "2026-11-17");
    assert.equal(dayKey(d, "UTC"), "2026-11-16");
  });
  it("lastDays trả đúng 7 ngày liên tiếp, kết thúc hôm nay, qua ranh giới tháng", () => {
    assert.deepEqual(lastDays(7, "2026-12-02"), ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });
});

describe("bản đồ chủ đề", () => {
  const topic = (n: number, lessons: string[]): CatalogTopic => ({
    id: `t${n}`, slug: `t${n}`, title: `Chủ đề ${n}`, artKey: "hello", position: n,
    lessons: lessons.map((l) => ({ id: l, slug: l, title: l, version: 1, packUrl: `/files/${l}` })),
  });
  const state = (done: string[]): ChildState => ({
    child: { id: "c", nickname: "Bé", avatarKey: "miu", dailyLimitMinutes: null },
    today: { day: "2026-11-16", secondsLearned: 0, limitMinutes: null, limitReached: false },
    totalStars: 0,
    lessons: Object.fromEntries(done.map((l) => [l, { status: "completed", lastStep: 0, bestStars: 3, timesCompleted: 1 }])),
    stickers: [],
  });
  const topics = [topic(1, ["a"]), topic(2, ["b"]), topic(3, []), topic(4, ["c"])];

  it("chủ đề đầu là bài tiếp theo, các chủ đề sau bị khóa, chủ đề chưa có bài là sắp có", () => {
    assert.deepEqual(buildMap(topics, state([])).map((t) => t.status), ["next", "locked", "soon", "locked"]);
  });
  it("học xong chủ đề trước thì mở chủ đề sau", () => {
    assert.deepEqual(buildMap(topics, state(["a"])).map((t) => t.status), ["done", "next", "soon", "locked"]);
    assert.deepEqual(buildMap(topics, state(["a", "b"])).map((t) => t.status), ["done", "done", "soon", "next"]);
  });
  it("nextLesson theo thứ tự chủ đề rồi bài, bỏ qua chủ đề trống", () => {
    assert.equal(nextLesson(topics, "a")?.id, "b");
    assert.equal(nextLesson(topics, "b")?.id, "c");
    assert.equal(nextLesson(topics, "c"), null);
  });
});

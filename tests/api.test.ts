/**
 * Kiểm thử tích hợp: chạy với app đang chạy và database đã seed.
 *
 *   1. Đặt MIU_DEV_FIXED_CODE="246810" trong .env (chỉ để phát triển)
 *   2. npm run dev   (hoặc npm run build && npm start)
 *   3. BASE_URL=http://localhost:3000 npm test
 */
import "dotenv/config";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { publishLesson, PublishBlocked } from "../src/lib/publish";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = (process.env.SEED_PARENT_EMAIL || "phuhuynh@miu.local").toLowerCase();
const CODE = process.env.MIU_DEV_FIXED_CODE || "246810";

/** Máy khách nhỏ có giữ cookie, giống một trình duyệt. */
class Client {
  jar = new Map<string, string>();
  async req(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers = new Headers(init.headers);
    if (init.json !== undefined) headers.set("Content-Type", "application/json");
    if (this.jar.size) headers.set("Cookie", [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(BASE + path, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      redirect: "manual",
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i);
      const val = pair.slice(i + 1);
      if (!val || /max-age=0/i.test(c) || /expires=thu, 01 jan 1970/i.test(c)) this.jar.delete(name);
      else this.jar.set(name, val);
    }
    return res;
  }
  async json(path: string, init: RequestInit & { json?: unknown } = {}) {
    const res = await this.req(path, init);
    return { status: res.status, body: (await res.json().catch(() => null)) as any, res };
  }
}

async function login(c: Client) {
  await c.json("/api/auth/request-code", { method: "POST", json: { email: EMAIL } });
  return c.json("/api/auth/verify-code", { method: "POST", json: { email: EMAIL, code: CODE } });
}

/** Đăng nhập khu soạn bài: tài khoản và phiên riêng, tách khỏi phụ huynh. */
async function staffLogin(c: Client, email = EMAIL) {
  await c.json("/api/admin/auth/request-code", { method: "POST", json: { email } });
  return c.json("/api/admin/auth/verify-code", { method: "POST", json: { email, code: CODE } });
}

async function openGate(c: Client) {
  const ch = await c.json("/api/gate/challenge", { method: "POST" });
  assert.equal(ch.status, 200);
  return c.json("/api/gate/verify", { method: "POST", json: { token: ch.body.token, answer: ch.body.a + ch.body.b } });
}

describe("API Miu học tiếng Anh", () => {
  const c = new Client();
  let childId = "";
  let catalog: any;
  const createdParents: string[] = [];

  before(async () => {
    await db.loginCode.deleteMany({ where: { email: EMAIL } }); // tránh chạm giới hạn 5 mã mỗi 10 phút khi chạy lại
    const res = await fetch(BASE + "/login").catch(() => null);
    assert.ok(res && res.ok, `Không kết nối được ${BASE}. Hãy chạy app trước.`);
  });

  after(async () => {
    if (childId) await db.child.deleteMany({ where: { id: childId } });
    for (const id of createdParents) await db.parent.deleteMany({ where: { id } });
    await db.$disconnect();
  });

  it("chưa đăng nhập thì bị chặn", async () => {
    const anon = new Client();
    assert.equal((await anon.json("/api/children")).status, 401);
    assert.equal((await anon.json("/api/catalog")).status, 401);
    const root = await anon.req("/");
    assert.equal(root.status, 307);
    assert.match(root.headers.get("location") || "", /\/login$/);
  });

  it("email lạ nhận kết quả giống email thật (không lộ ai đã đăng ký)", async () => {
    const r = await new Client().json("/api/auth/request-code", { method: "POST", json: { email: "nguoila@example.com" } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
  });

  it("mã sai bị từ chối, mã đúng tạo phiên", async () => {
    await c.json("/api/auth/request-code", { method: "POST", json: { email: EMAIL } });
    const bad = await c.json("/api/auth/verify-code", { method: "POST", json: { email: EMAIL, code: "000000" } });
    assert.equal(bad.status, 400);
    const ok = await c.json("/api/auth/verify-code", { method: "POST", json: { email: EMAIL, code: CODE } });
    assert.equal(ok.status, 200);
    assert.ok(c.jar.has("miu_session"));
  });

  it("mã dùng rồi thì không dùng lại được", async () => {
    const r = await new Client().json("/api/auth/verify-code", { method: "POST", json: { email: EMAIL, code: CODE } });
    assert.equal(r.status, 400);
  });

  it("việc của phụ huynh cần qua cổng", async () => {
    const r = await c.json("/api/children", { method: "POST", json: { nickname: "Thử", birthYear: new Date().getFullYear() - 5 } });
    assert.equal(r.status, 403);
    const wrong = await c.json("/api/gate/verify", { method: "POST", json: { token: "1.2.3.4", answer: 3 } });
    assert.equal(wrong.status, 400);
  });

  it("qua cổng rồi tạo được hồ sơ bé; dữ liệu sai bị từ chối", async () => {
    assert.equal((await openGate(c)).status, 200);
    const year = new Date().getFullYear();
    assert.equal((await c.json("/api/children", { method: "POST", json: { nickname: "x".repeat(21), birthYear: year - 5 } })).status, 400);
    assert.equal((await c.json("/api/children", { method: "POST", json: { nickname: "Bé", birthYear: year - 30 } })).status, 400);
    assert.equal((await c.json("/api/children", { method: "POST", json: { nickname: "Bé", birthYear: year - 5, avatarKey: "khong-co" } })).status, 400);
    const ok = await c.json("/api/children", { method: "POST", json: { nickname: "Bé thử", birthYear: year - 5, avatarKey: "ben" } });
    assert.equal(ok.status, 201);
    childId = ok.body.child.id;
    assert.equal(ok.body.child.dailyLimitMinutes, null);
  });

  it("danh mục có 8 chủ đề, 2 chủ đề đã có bài; gói bài tải được và đủ 5 bước", async () => {
    const r = await c.json("/api/catalog");
    assert.equal(r.status, 200);
    catalog = r.body.topics;
    assert.equal(catalog.length, 8);
    const lessons = catalog.flatMap((t: any) => t.lessons);
    assert.ok(lessons.length >= 2);
    const pack = await (await c.req(lessons[0].packUrl)).json();
    assert.deepEqual(pack.steps.map((s: any) => s.type), ["story", "listen", "speak", "game", "reward"]);
    assert.ok(pack.phrases["ui-praise-1"], "gói bài kèm lời hướng dẫn dùng chung");
  });

  it("route tệp không cho đọc ra ngoài thư mục kho", async () => {
    for (const p of ["/files/..%2F..%2F.env", "/files/lessons/..%2F..%2F..%2F.env", "/files/secret.txt", "/files/lessons/khong-co.json"]) {
      // Máy chủ phát triển từ chối đường dẫn lạ bằng 400, máy chủ thật bằng 404; cả hai đều không trả tệp.
      const st = (await c.req(p)).status;
      assert.ok(st === 400 || st === 404, `${p} trả ${st}`);
    }
  });

  it("nhận lô sự kiện, chống trùng, tổng hợp tiến độ", async () => {
    const lesson = catalog.flatMap((t: any) => t.lessons)[0];
    const t0 = Date.now();
    const at = (s: number) => new Date(t0 + s * 1000).toISOString();
    const ev = (kind: string, s: number, extra: object = {}) => ({
      id: randomUUID(), lessonId: lesson.id, lessonVersion: lesson.version, kind, occurredAt: at(s), ...extra,
    });
    const events = [
      ev("lesson_start", 0, { payload: { resumed: false } }),
      ev("answer_correct", 5, { stepType: "listen", phraseSlug: "hello" }),
      ev("answer_wrong", 6, { stepType: "listen", phraseSlug: "goodbye" }),
      ev("answer_correct", 8, { stepType: "listen", phraseSlug: "goodbye" }),
      ev("spoken", 20, { stepType: "speak", phraseSlug: "hello" }),
      ev("step_complete", 30, { stepType: "story", payload: { stepIndex: 0, seconds: 40, stars: 0 } }),
      ev("step_complete", 60, { stepType: "listen", payload: { stepIndex: 1, seconds: 90, stars: 2 } }),
      ev("lesson_complete", 120, { payload: { stars: 7 } }),
    ];

    const first = await c.json(`/api/children/${childId}/events`, { method: "POST", json: { events } });
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { received: 8, accepted: 8, duplicates: 0 });

    // Gửi lại đúng lô đó (mất mạng, thử lại): không được cộng thêm gì.
    const again = await c.json(`/api/children/${childId}/events`, { method: "POST", json: { events } });
    assert.deepEqual(again.body, { received: 8, accepted: 0, duplicates: 8 });

    const state = await c.json(`/api/children/${childId}/state`);
    assert.equal(state.status, 200);
    const p = state.body.lessons[lesson.id];
    assert.equal(p.status, "completed");
    assert.equal(p.bestStars, 7);
    assert.equal(p.timesCompleted, 1);
    assert.equal(state.body.stickers.length, 1);
    assert.equal(state.body.today.secondsLearned, 130);
    assert.equal(state.body.totalStars, 7);

    const report = await c.json(`/api/children/${childId}/report`);
    assert.equal(report.status, 200);
    const today = report.body.days.at(-1);
    assert.equal(today.lessonsCompleted, 1);
    assert.equal(today.stars, 7);
    assert.equal(report.body.completedLessons.length, 1);
    const hello = report.body.learnedPhrases.find((x: any) => x.text === "Hello!");
    assert.deepEqual([hello.correct, hello.wrong, hello.spoken], [1, 0, 1]);
    const bye = report.body.learnedPhrases.find((x: any) => x.text === "Goodbye!");
    assert.deepEqual([bye.correct, bye.wrong], [1, 1]);

    // Học lại bài đó: số lần xong tăng, sao tốt nhất giữ mức cao nhất, nhãn dán không nhân đôi.
    const replay = [ev("lesson_start", 200), ev("lesson_complete", 300, { payload: { stars: 4 } })];
    await c.json(`/api/children/${childId}/events`, { method: "POST", json: { events: replay } });
    const s2 = (await c.json(`/api/children/${childId}/state`)).body;
    assert.equal(s2.lessons[lesson.id].timesCompleted, 2);
    assert.equal(s2.lessons[lesson.id].bestStars, 7);
    assert.equal(s2.stickers.length, 1);
  });

  it("sự kiện sai dữ liệu bị từ chối", async () => {
    const lesson = catalog.flatMap((t: any) => t.lessons)[0];
    const base = { id: randomUUID(), lessonId: lesson.id, lessonVersion: 1, kind: "lesson_start", occurredAt: new Date().toISOString() };
    const post = (e: object) => c.json(`/api/children/${childId}/events`, { method: "POST", json: { events: [e] } });
    assert.equal((await post({ ...base, kind: "xoa_het" })).status, 400);
    assert.equal((await post({ ...base, id: "khong-phai-uuid" })).status, 400);
    assert.equal((await post({ ...base, lessonId: randomUUID() })).status, 400);
    assert.equal((await post({ ...base, phraseSlug: "khong-ton-tai" })).status, 400);
    assert.equal((await post({ ...base, payload: { seconds: 999999 } })).status, 400);
    assert.equal((await c.json(`/api/children/${childId}/events`, { method: "POST", json: { events: [] } })).status, 400);
  });

  it("giới hạn thời gian: hết giờ thì bản đồ chuyển sang màn hình nghỉ", async () => {
    // Giới hạn tối thiểu là 5 phút, nên cho bé học thêm một bước dài 200 giây (tổng 330 giây) rồi đặt giới hạn 5 phút.
    assert.equal((await c.json(`/api/children/${childId}`, { method: "PATCH", json: { dailyLimitMinutes: 1 } })).status, 400);
    const lesson = catalog.flatMap((t: any) => t.lessons)[0];
    const extra = await c.json(`/api/children/${childId}/events`, {
      method: "POST",
      json: { events: [{ id: randomUUID(), lessonId: lesson.id, lessonVersion: lesson.version, kind: "step_complete",
        occurredAt: new Date().toISOString(), payload: { stepIndex: 1, seconds: 200, stars: 0 } }] },
    });
    assert.equal(extra.status, 200);
    const patch = await c.json(`/api/children/${childId}`, { method: "PATCH", json: { dailyLimitMinutes: 5 } });
    assert.equal(patch.status, 200);
    const state = (await c.json(`/api/children/${childId}/state`)).body;
    assert.equal(state.today.limitReached, true);
    const map = await c.req(`/kid/${childId}`);
    assert.equal(map.status, 307);
    assert.match(map.headers.get("location") || "", new RegExp(`/kid/${childId}/rest$`));
    // Bỏ giới hạn: vào lại được.
    await c.json(`/api/children/${childId}`, { method: "PATCH", json: { dailyLimitMinutes: null } });
    assert.equal((await c.req(`/kid/${childId}`)).status, 200);
  });

  it("phụ huynh khác không thấy hồ sơ của nhà này (404, không lộ sự tồn tại)", async () => {
    const other = await db.parent.create({ data: { email: `khac-${randomUUID()}@example.com` } });
    createdParents.push(other.id);
    const theirs = await db.child.create({ data: { parentId: other.id, nickname: "Bé nhà khác", birthYear: new Date().getFullYear() - 4 } });
    for (const path of [`/api/children/${theirs.id}/state`, `/api/children/${theirs.id}/report`]) {
      assert.equal((await c.json(path)).status, 404, path);
    }
    assert.equal((await c.json(`/api/children/${theirs.id}/events`, { method: "POST", json: { events: [] } })).status, 404);
    assert.equal((await c.json(`/api/children/${theirs.id}`, { method: "DELETE" })).status, 404);
    assert.equal((await c.req(`/kid/${theirs.id}`)).status, 404);
    assert.ok(await db.child.findUnique({ where: { id: theirs.id } }), "hồ sơ nhà khác phải còn nguyên");
  });

  it("xóa hồ sơ bé xóa dây chuyền toàn bộ dữ liệu học", async () => {
    const before = await db.activityEvent.count({ where: { childId } });
    assert.ok(before > 0);
    assert.equal((await c.json(`/api/children/${childId}`, { method: "DELETE" })).status, 200);
    for (const n of [
      await db.activityEvent.count({ where: { childId } }),
      await db.lessonProgress.count({ where: { childId } }),
      await db.phraseProgress.count({ where: { childId } }),
      await db.dailyActivity.count({ where: { childId } }),
      await db.childSticker.count({ where: { childId } }),
    ]) assert.equal(n, 0);
    childId = "";
  });

  it("đăng xuất hủy phiên", async () => {
    assert.equal((await c.json("/api/auth/logout", { method: "POST" })).status, 200);
    assert.equal((await c.json("/api/children")).status, 401);
  });
});


/** Dựng một tệp WAV PCM trong bộ nhớ. */
function wavBuffer(rate = 48000, seconds = 0.4) {
  const dataSize = Math.round(rate * 2 * seconds);
  const b = Buffer.alloc(44 + dataSize);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(36 + dataSize, 4); b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii"); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36, "ascii"); b.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < dataSize / 2; i++) b.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / rate)), 44 + i * 2);
  return b;
}

describe("API quản trị", () => {
  const c = new Client();
  const suffix = randomUUID().slice(0, 8);
  const lessonSlug = `thu-${suffix}`;
  const phraseSlug = `cau-thu-${suffix}`;
  let lessonId = "";
  let sourceId = "";
  const strangers: string[] = [];
  const storageToRemove: string[] = [];

  before(async () => {
    await db.loginCode.deleteMany({});
    // Máy này đăng nhập cả hai: phụ huynh (để xem danh mục như bé) và khu soạn bài. Không mở cổng phụ huynh.
    assert.equal((await login(c)).status, 200);
    assert.equal((await staffLogin(c)).status, 200);
    sourceId = (await db.lesson.findFirstOrThrow({ where: { slug: "chao-hoi" } })).id;
  });

  after(async () => {
    const root = path.resolve(process.env.STORAGE_DIR || "./storage");
    // Xóa bài trước (bài giữ khóa ngoại tới câu), rồi mới xóa câu và tệp tiếng.
    if (lessonId) {
      await db.sticker.deleteMany({ where: { lessonId } });
      await db.lesson.deleteMany({ where: { id: lessonId } });
      await fs.rm(path.join(root, "lessons", lessonId), { recursive: true, force: true });
    }
    const assets = await db.asset.findMany({ where: { phraseAudio: { some: { phrase: { slug: phraseSlug } } } } });
    await db.phraseAudio.deleteMany({ where: { phrase: { slug: phraseSlug } } });
    for (const a of assets) {
      await db.asset.delete({ where: { id: a.id } });
      const base = a.storageKey.replace(/\.wav$/, "");
      for (const ext of ["wav", "mp3", "m4a"]) storageToRemove.push(`${base}.${ext}`);
    }
    await db.phrase.deleteMany({ where: { slug: phraseSlug } });
    for (const k of storageToRemove) await fs.rm(path.join(root, k), { force: true });
    for (const id of strangers) await db.parent.deleteMany({ where: { id } });
    await db.$disconnect();
  });

  it("chưa đăng nhập khu soạn bài thì bị chặn và được đưa tới /admin/login", async () => {
    const anon = new Client();
    assert.equal((await anon.json("/api/admin/lessons")).status, 401);
    const page = await anon.req("/admin");
    assert.equal(page.status, 307);
    assert.match(page.headers.get("location") || "", /\/admin\/login\?next=%2Fadmin$/);
    assert.equal((await anon.req("/admin/login")).status, 200);
  });

  it("phiên phụ huynh không dùng được cho khu soạn bài, kể cả cùng email và đã qua cổng", async () => {
    const p = new Client();
    assert.equal((await login(p)).status, 200);
    assert.equal((await openGate(p)).status, 200);
    assert.equal((await p.json("/api/admin/lessons")).status, 401);
    assert.equal((await p.json("/api/admin/phrases/abc", { method: "PUT", json: { kind: "en", text: "x" } })).status, 401);
    assert.match((await p.req("/admin")).headers.get("location") || "", /\/admin\/login/);
  });

  it("mã đăng nhập phụ huynh không dùng được để vào khu soạn bài", async () => {
    const x = new Client();
    await x.json("/api/auth/request-code", { method: "POST", json: { email: EMAIL } });
    assert.equal((await x.json("/api/admin/auth/verify-code", { method: "POST", json: { email: EMAIL, code: CODE } })).status, 400);
    assert.equal((await x.json("/api/admin/lessons")).status, 401);
  });

  it("email không có trong bảng staff không đăng nhập được, và không bị lộ", async () => {
    const other = await db.parent.create({ data: { email: `khong-soan-${suffix}@example.com` } });
    strangers.push(other.id);
    const o = new Client();
    assert.equal((await o.json("/api/admin/auth/request-code", { method: "POST", json: { email: other.email } })).status, 200);
    assert.equal(await db.loginCode.count({ where: { email: other.email, purpose: "staff" } }), 0);
    assert.equal((await staffLogin(o, other.email)).status, 400);
    assert.equal((await o.json("/api/admin/lessons")).status, 401);
  });

  it("người soạn không cần qua cổng phụ huynh; đăng xuất thì mất quyền, phiên phụ huynh vẫn còn", async () => {
    assert.equal((await c.json("/api/admin/lessons")).status, 200);
    const s = new Client();
    assert.equal((await login(s)).status, 200);
    assert.equal((await staffLogin(s)).status, 200);
    assert.equal((await s.json("/api/admin/lessons")).status, 200);
    assert.equal((await s.json("/api/admin/auth/logout", { method: "POST" })).status, 200);
    assert.equal((await s.json("/api/admin/lessons")).status, 401);
    assert.equal((await s.json("/api/catalog")).status, 200);
  });

  it("tạo bản nháp bằng nhân bản; mã trùng bị từ chối; bé chưa thấy bản nháp", async () => {
    const topic = await db.topic.findFirstOrThrow({ where: { slug: "gia-dinh" } });
    const made = await c.json("/api/admin/lessons", { method: "POST", json: { topicId: topic.id, slug: lessonSlug, title: "Bài thử", cloneFromId: sourceId } });
    assert.equal(made.status, 201);
    lessonId = made.body.id;
    const dup = await c.json("/api/admin/lessons", { method: "POST", json: { topicId: topic.id, slug: lessonSlug, title: "Bài thử", cloneFromId: sourceId } });
    assert.equal(dup.status, 409);
    assert.equal((await c.json("/api/admin/lessons", { method: "POST", json: { topicId: topic.id, slug: "Sai Ma", title: "x", cloneFromId: sourceId } })).status, 400);

    const detail = await c.json(`/api/admin/lessons/${lessonId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.lesson.status, "draft");
    assert.equal(detail.body.steps.length, 5);
    const catalog = (await c.json("/api/catalog")).body.topics;
    assert.ok(!catalog.flatMap((t: any) => t.lessons).some((l: any) => l.slug === lessonSlug), "bản nháp không được hiện với bé");
  });

  it("lưu bước: sai lược đồ bị từ chối và nêu rõ chỗ sai; đúng thì lưu", async () => {
    const steps = (await c.json(`/api/admin/lessons/${lessonId}`)).body.steps;
    const listen = structuredClone(steps[1].config);
    listen.rounds[0].options[0] = "hinh-khong-co";
    const bad = await c.json(`/api/admin/lessons/${lessonId}/steps/1`, { method: "PUT", json: { config: listen } });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.fields.some((f: any) => /rounds\.0\.options\.0/.test(f.path)));
    assert.equal((await c.json(`/api/admin/lessons/${lessonId}/steps/9`, { method: "PUT", json: { config: {} } })).status, 400);

    // Gửi cấu hình của bước khác vào sai vị trí cũng bị từ chối.
    assert.equal((await c.json(`/api/admin/lessons/${lessonId}/steps/2`, { method: "PUT", json: { config: steps[1].config } })).status, 400);

    listen.rounds[0].options[0] = "hello";
    listen.rounds[0].phrase = phraseSlug;
    assert.equal((await c.json(`/api/admin/lessons/${lessonId}/steps/1`, { method: "PUT", json: { config: listen } })).status, 200);
  });

  it("thêm câu mới, sửa chữ; mã sai định dạng bị từ chối", async () => {
    assert.equal((await c.json(`/api/admin/phrases/${phraseSlug}`, { method: "PUT", json: { kind: "en", text: "Hello, friend!" } })).status, 200);
    assert.equal((await c.json(`/api/admin/phrases/${phraseSlug}`, { method: "PUT", json: { kind: "en", text: "Hi, friend!" } })).status, 200);
    assert.equal((await db.phrase.findUniqueOrThrow({ where: { slug: phraseSlug } })).textEn, "Hi, friend!");
    assert.equal((await c.json("/api/admin/phrases/Sai_Ma", { method: "PUT", json: { kind: "en", text: "x" } })).status, 400);
    assert.equal((await c.json(`/api/admin/phrases/${phraseSlug}`, { method: "PUT", json: { kind: "en", text: "" } })).status, 400);
  });

  async function upload(file: Buffer, voice = "miu", name = "tieng.wav") {
    const form = new FormData();
    form.set("phraseSlug", phraseSlug);
    form.set("voice", voice);
    form.set("file", new File([new Uint8Array(file)], name, { type: "audio/wav" }));
    return c.json("/api/admin/assets/upload", { method: "POST", body: form });
  }

  it("tải tệp WAV: sai định dạng bị từ chối, đúng thì lưu và phát được", async () => {
    assert.equal((await upload(wavBuffer(44100))).status, 400);
    assert.equal((await upload(Buffer.from("khong phai wav"))).status, 400);
    assert.equal((await upload(wavBuffer(), "robot")).status, 400);
    const ok = await upload(wavBuffer());
    assert.equal(ok.status, 201);
    assert.ok(Math.abs(ok.body.durationMs - 400) <= 5, `thời lượng ${ok.body.durationMs}`);
    const asset = await db.asset.findUniqueOrThrow({ where: { id: ok.body.assetId } });
    const file = await c.req(`/files/${asset.storageKey}`);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "audio/wav");
    assert.equal(Buffer.from(await file.arrayBuffer()).length, asset.bytes);
  });

  it("xuất bản bị chặn khi còn câu thiếu tiếng (khi tắt cờ phát triển)", async () => {
    const prev = process.env.MIU_ALLOW_MISSING_AUDIO;
    process.env.MIU_ALLOW_MISSING_AUDIO = "0";
    try {
      await assert.rejects(
        () => publishLesson(lessonId),
        (e: unknown) => e instanceof PublishBlocked && (e.detail as any).missingAudio.length > 0,
      );
    } finally {
      process.env.MIU_ALLOW_MISSING_AUDIO = prev;
    }
    assert.equal((await db.lesson.findUniqueOrThrow({ where: { id: lessonId } })).status, "draft");
  });

  it("xuất bản: tăng phiên bản, ghi gói bài, bé thấy bài; xuất bản lại thì lên phiên bản 2", async () => {
    const first = await c.json(`/api/admin/lessons/${lessonId}/publish`, { method: "POST" });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.version, 1);
    const entry = (await c.json("/api/catalog")).body.topics.flatMap((t: any) => t.lessons).find((l: any) => l.slug === lessonSlug);
    assert.ok(entry, "bài đã xuất bản phải hiện trong danh mục");
    const pack = await (await c.req(entry.packUrl)).json();
    assert.equal(pack.steps.length, 5);
    assert.equal(pack.phrases[phraseSlug].text, "Hi, friend!");
    assert.ok(pack.phrases[phraseSlug].audio.miu.length > 0, "gói bài phải trỏ tới tệp tiếng vừa tải");

    const second = await c.json(`/api/admin/lessons/${lessonId}/publish`, { method: "POST" });
    assert.equal(second.body.version, 2);
    // Gói phiên bản 1 vẫn còn nguyên: bé đang học dở bản cũ không bị hỏng giữa chừng.
    assert.equal((await c.req(entry.packUrl)).status, 200);
    const sticker = await db.sticker.findUnique({ where: { lessonId } });
    assert.ok(sticker, "mỗi bài xuất bản phải có nhãn dán thưởng");
  });

  it("bản nháp bị hỏng thì không xuất bản được và nêu rõ lỗi", async () => {
    await db.lessonStep.update({ where: { lessonId_position: { lessonId, position: 4 } }, data: { config: { type: "reward", badge: "khong-co", done: "x", bye: "y" } } });
    const r = await c.json(`/api/admin/lessons/${lessonId}/publish`, { method: "POST" });
    assert.equal(r.status, 422);
    assert.equal(r.body.code, "publish_blocked");
    assert.ok(r.body.detail.issues.length > 0);
    assert.equal((await db.lesson.findUniqueOrThrow({ where: { id: lessonId } })).version, 2, "phiên bản không được tăng khi bị chặn");
  });
});

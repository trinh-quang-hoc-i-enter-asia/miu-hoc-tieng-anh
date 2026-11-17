import { z } from "zod";
import {
  ACTOR_KINDS, MOODS, NEEDS, PIC_KEYS, PROP_KINDS, SKY_KEYS, VOICES,
} from "./content-keys";
import { STEP_TYPES } from "./config";

// Mã câu (slug) trỏ tới bảng phrases. Mã chữ thường, số và dấu gạch ngang.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Mã câu chỉ gồm chữ thường, số và dấu gạch ngang");
const who = z.string().min(1).max(20);
const mood = z.enum(MOODS);

const actor = z.strictObject({
  id: who,
  kind: z.enum(ACTOR_KINDS),
  voice: z.enum(VOICES),
  x: z.number().min(0).max(400),
  y: z.number().min(0).max(320),
  s: z.number().min(0.3).max(2.5).default(1),
  flip: z.boolean().optional(),
  fur: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  ear: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  shirt: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const prop = z.strictObject({ id: who, kind: z.enum(PROP_KINDS) });

const frame = z.strictObject({
  vi: slug,
  pose: z.enum(["wave", "hi"]).optional(),
  sky: z.enum(SKY_KEYS).optional(),
  mood: z.record(z.string(), mood).optional(),
  show: z.array(who).optional(),
  lines: z.array(z.strictObject({ who, phrase: slug })).min(1).max(4),
});

export const storyStep = z.strictObject({
  type: z.literal("story"),
  aria: z.string().min(1).max(200),
  actors: z.array(actor).min(1).max(4),
  props: z.array(prop).max(6).default([]),
  frames: z.array(frame).min(1).max(6),
});

export const listenStep = z.strictObject({
  type: z.literal("listen"),
  rounds: z
    .array(
      z.strictObject({
        phrase: slug,
        voice: z.enum(VOICES),
        options: z.array(z.enum(PIC_KEYS)).length(2),
        answer: z.enum(PIC_KEYS),
      }),
    )
    .min(1)
    .max(8),
});

export const speakStep = z.strictObject({
  type: z.literal("speak"),
  items: z.array(z.strictObject({ phrase: slug, mood: mood.optional() })).min(1).max(8),
});

const greetGame = z.strictObject({
  type: z.literal("game"),
  kind: z.literal("greet"),
  hello: slug,
  bye: slug,
  promptIn: slug,
  promptOut: slug,
  rounds: z
    .array(z.strictObject({ t: z.enum(["in", "out"]), f: z.enum(["a", "b"]) }))
    .min(1)
    .max(10),
});

const giveGame = z.strictObject({
  type: z.literal("game"),
  kind: z.literal("give"),
  intro: slug,
  rounds: z
    .array(z.strictObject({ say: slug, need: z.enum(NEEDS), mood }))
    .min(1)
    .max(10),
});

export const gameStep = z.discriminatedUnion("kind", [greetGame, giveGame]);

export const rewardStep = z.strictObject({
  type: z.literal("reward"),
  badge: z.enum(PIC_KEYS),
  done: slug,
  bye: slug,
});

/** Một bước bất kỳ. Dùng để kiểm tra từng bước khi soạn. */
export const anyStep = z.union([storyStep, listenStep, speakStep, gameStep, rewardStep]);

export type StoryStep = z.infer<typeof storyStep>;
export type ListenStep = z.infer<typeof listenStep>;
export type SpeakStep = z.infer<typeof speakStep>;
export type GameStep = z.infer<typeof gameStep>;
export type RewardStep = z.infer<typeof rewardStep>;
export type AnyStep = z.infer<typeof anyStep>;

const schemaByType = {
  story: storyStep,
  listen: listenStep,
  speak: speakStep,
  game: gameStep,
  reward: rewardStep,
} as const;

/** Kiểm tra cấu hình của một bước theo vị trí (0..4). Trả về danh sách lỗi, rỗng nghĩa là hợp lệ. */
export function validateStepConfig(position: number, config: unknown): { path: string; message: string }[] {
  const type = STEP_TYPES[position];
  if (!type) return [{ path: "", message: "Bài chỉ có 5 bước (vị trí 0 đến 4)" }];
  const parsed = schemaByType[type].safeParse(config);
  return parsed.success ? [] : parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

export type StepIssue = { step: number; path: string; message: string };

/**
 * Kiểm tra đủ 5 bước đúng thứ tự (story, listen, speak, game, reward) và đúng lược đồ.
 * Trả về danh sách lỗi (rỗng nghĩa là hợp lệ) cùng các bước đã được chuẩn hóa.
 */
export function validateSteps(steps: { type: string; config: unknown }[]): {
  issues: StepIssue[];
  steps: AnyStep[];
} {
  const issues: StepIssue[] = [];
  const out: AnyStep[] = [];
  STEP_TYPES.forEach((t, i) => {
    const s = steps[i];
    if (!s || s.type !== t) {
      issues.push({ step: i, path: "type", message: `Bước ${i + 1} phải là "${t}"` });
      return;
    }
    const parsed = schemaByType[t].safeParse(s.config);
    if (!parsed.success) {
      for (const is of parsed.error.issues) {
        issues.push({ step: i, path: is.path.join("."), message: is.message });
      }
    } else {
      out.push(parsed.data as AnyStep);
    }
  });
  if (steps.length !== STEP_TYPES.length) {
    issues.push({ step: -1, path: "", message: `Bài phải có đúng ${STEP_TYPES.length} bước, hiện có ${steps.length}` });
  }
  return { issues, steps: out };
}

export { collectPhraseSlugs } from "./phrase-refs";

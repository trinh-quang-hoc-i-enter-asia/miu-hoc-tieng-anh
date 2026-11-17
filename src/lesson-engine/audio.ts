"use client";
// Âm thanh của máy chạy bài: phát tệp tiếng làm sẵn, giọng dự phòng của trình duyệt,
// tiếng hiệu ứng và thu âm giọng bé (chỉ nằm trong bộ nhớ trang, không gửi đi đâu).
import type { Voice } from "@/lib/content-keys";
import { VOICE_PITCH } from "@/lib/content-keys";
import type { LessonPack, PackAudio } from "@/lib/pack-types";

// ---------- Mở khóa âm thanh (trình duyệt chỉ cho phát sau một lần chạm) ----------
let ac: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ac) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      ac = Ctor ? new Ctor() : null;
    } catch {
      ac = null;
    }
  }
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

export function unlockAudio() {
  audioContext();
  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch {}
}

// ---------- Giọng dự phòng của trình duyệt ----------
const synth: SpeechSynthesis | null = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
let voices: SpeechSynthesisVoice[] = [];
let keep: SpeechSynthesisUtterance | null = null;

function loadVoices() {
  try {
    voices = synth ? synth.getVoices() : [];
  } catch {
    voices = [];
  }
}
if (synth) {
  loadVoices();
  try {
    synth.onvoiceschanged = loadVoices;
  } catch {}
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) loadVoices();
  const norm = (v: SpeechSynthesisVoice) => (v.lang || "").replace("_", "-").toLowerCase();
  const want = lang.toLowerCase();
  const pool = voices.filter((v) => norm(v).startsWith(want.slice(0, 2)));
  if (!pool.length) return null;
  return (
    pool.find((v) => norm(v) === want && /samantha|google|aria|jenny|natural/i.test(v.name)) ||
    pool.find((v) => norm(v) === want) ||
    pool[0]
  );
}

function speakText(text: string, lang: string, pitch: number, rate: number): Promise<void> {
  return new Promise((res) => {
    const v = synth ? pickVoice(lang) : null;
    // Không có giọng cho ngôn ngữ này (hay gặp với tiếng Việt): chỉ chờ một nhịp ngắn.
    if (!synth || (lang === "vi-VN" && !v)) {
      setTimeout(res, lang === "vi-VN" ? 450 : 1000);
      return;
    }
    let done = false;
    let t: ReturnType<typeof setTimeout>;
    const fin = () => {
      if (!done) {
        done = true;
        clearTimeout(t);
        res();
      }
    };
    const u = new SpeechSynthesisUtterance(text.replace(/[’‘]/g, "'"));
    u.lang = lang;
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = fin;
    u.onerror = fin;
    t = setTimeout(fin, 1800 + text.length * 150);
    keep = u;
    try {
      synth.speak(u);
    } catch {
      fin();
    }
  });
}

// ---------- Tệp tiếng làm sẵn ----------
const cache = new Map<string, HTMLAudioElement>();
let playing: HTMLAudioElement | null = null;
let stopFile: (() => void) | null = null;

function pickSource(list: PackAudio[]): PackAudio | null {
  const probe = document.createElement("audio");
  return list.find((a) => probe.canPlayType(a.type) !== "") ?? list[0] ?? null;
}

function sourcesFor(pack: LessonPack, slug: string, voice: Voice): PackAudio[] | null {
  const a = pack.phrases[slug]?.audio;
  if (!a) return null;
  return a[voice] ?? Object.values(a)[0] ?? null;
}

function elementFor(src: string): HTMLAudioElement {
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

/** Tải sẵn mọi tệp tiếng của một bước rồi mới cho bé thao tác. Quá hạn thì bỏ qua, không chặn bé. */
export async function preload(pack: LessonPack, slugs: string[], voices: Voice[] = ["miu", "ben", "friend", "guide"]) {
  const waits: Promise<void>[] = [];
  for (const slug of slugs) {
    for (const voice of voices) {
      const list = pack.phrases[slug]?.audio?.[voice];
      if (!list) continue;
      const pick = pickSource(list);
      if (!pick) continue;
      const el = elementFor(pick.src);
      if (el.readyState >= 3) continue;
      waits.push(
        new Promise<void>((res) => {
          const done = () => res();
          el.addEventListener("canplaythrough", done, { once: true });
          el.addEventListener("error", done, { once: true });
          setTimeout(done, 2500);
          el.load();
        }),
      );
    }
  }
  await Promise.all(waits);
}

function playFile(src: string): Promise<boolean> {
  return new Promise((res) => {
    const el = elementFor(src);
    let finished = false;
    const fin = (ok: boolean) => {
      if (finished) return;
      finished = true;
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
      if (playing === el) playing = null;
      if (stopFile === stopThis) stopFile = null;
      res(ok);
    };
    const stopThis = () => fin(true);
    const onEnd = () => fin(true);
    const onErr = () => fin(false);
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);
    try {
      el.currentTime = 0;
    } catch {}
    playing = el;
    stopFile = stopThis;
    el.play().catch(() => fin(false));
    // Dự phòng nếu sự kiện kết thúc không đến.
    setTimeout(() => fin(true), 15_000);
  });
}

export function stopAudio() {
  try {
    synth?.cancel();
  } catch {}
  // Giải phóng lời hứa đang chờ của tệp tiếng để luồng bài học đang bị hủy thoát ngay.
  stopFile?.();
  if (playing) {
    try {
      playing.pause();
      playing.currentTime = 0;
    } catch {}
    playing = null;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAudio();
  });
}

/**
 * Phát một câu trong gói bài. Có tệp tiếng thì phát tệp; không có (hoặc tệp lỗi) thì dùng
 * giọng dự phòng của trình duyệt. Bài đã xuất bản được chặn nếu thiếu tệp, nên giọng dự
 * phòng chủ yếu dùng khi phát triển và xem trước.
 */
export async function playPhrase(pack: LessonPack, slug: string, voice: Voice = "guide"): Promise<void> {
  const p = pack.phrases[slug];
  if (!p) return;
  const list = sourcesFor(pack, slug, voice);
  if (list) {
    const pick = pickSource(list);
    if (pick && (await playFile(pick.src))) return;
  }
  const lang = p.lang === "vi" ? "vi-VN" : "en-US";
  await speakText(p.text, lang, p.lang === "vi" ? 1 : VOICE_PITCH[voice] ?? 1, p.lang === "vi" ? 1 : 0.85);
}

export const hasSpeech = () => !!synth;

// ---------- Tiếng hiệu ứng ----------
function tone(f: number, at: number, dur: number, type: OscillatorType = "sine", vol = 0.16) {
  const a = audioContext();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    const t0 = a.currentTime + at;
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {}
}

export const sfx = {
  tap: () => tone(520, 0, 0.09, "triangle", 0.1),
  ok: () => {
    tone(660, 0, 0.18);
    tone(880, 0.12, 0.3);
  },
  no: () => tone(220, 0, 0.26, "triangle", 0.13),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.34)),
};

// ---------- Thu âm giọng bé (chỉ giữ trong bộ nhớ, bỏ khi sang câu khác) ----------
let micStream: MediaStream | null = null;
let micState: "unknown" | "ok" | "no" = "unknown";

export async function ensureMic(): Promise<boolean> {
  if (micState === "ok" && micStream) return true;
  if (micState === "no") return false;
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("no mic");
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micState = "ok";
    return true;
  } catch {
    micState = "no";
    micStream = null;
    return false;
  }
}

export function record(ms: number): Promise<Blob | null> {
  return new Promise((res) => {
    try {
      const rec = new MediaRecorder(micStream!);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => res(chunks.length ? new Blob(chunks, { type: rec.mimeType || "audio/webm" }) : null);
      rec.onerror = () => res(null);
      rec.start();
      setTimeout(() => {
        try {
          if (rec.state !== "inactive") rec.stop();
        } catch {
          res(null);
        }
      }, ms);
    } catch {
      res(null);
    }
  });
}

export async function playBlob(blob: Blob): Promise<boolean> {
  const a = audioContext();
  if (!a) return false;
  try {
    const raw = await blob.arrayBuffer();
    const buf = await new Promise<AudioBuffer>((ok, bad) => a.decodeAudioData(raw, ok, bad));
    await new Promise<void>((r) => {
      const s = a.createBufferSource();
      s.buffer = buf;
      s.connect(a.destination);
      s.onended = () => r();
      s.start();
      setTimeout(r, (buf.duration + 0.6) * 1000);
    });
    return true;
  } catch {
    return false;
  }
}

export function releaseMic() {
  if (micStream) {
    try {
      micStream.getTracks().forEach((t) => t.stop());
    } catch {}
    micStream = null;
  }
  if (micState === "ok") micState = "unknown";
}

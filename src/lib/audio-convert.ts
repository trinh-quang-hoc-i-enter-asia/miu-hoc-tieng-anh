import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as storage from "./storage";

const run = promisify(execFile);

let ffmpegChecked: Promise<boolean> | null = null;
export function hasFfmpeg(): Promise<boolean> {
  return (ffmpegChecked ??= run("ffmpeg", ["-version"]).then(() => true, () => false));
}

/**
 * Từ tệp WAV gốc tạo hai bản để bé nghe: MP3 và AAC (.m4a), một kênh, cân bằng âm lượng
 * và cắt khoảng lặng ở hai đầu. Cần ffmpeg trên máy chủ; không có thì trả false và gói
 * bài tự dùng thẳng tệp WAV (nặng hơn nhưng vẫn phát được).
 */
export async function convertWav(storageKey: string): Promise<boolean> {
  if (!(await hasFfmpeg())) return false;
  const wav = await storage.get(storageKey);
  if (!wav) return false;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "miu-audio-"));
  try {
    const input = path.join(dir, "in.wav");
    await fs.writeFile(input, wav);
    const base = storageKey.replace(/\.wav$/i, "");
    const filter = [
      "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05",
      "areverse",
      "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05",
      "areverse",
      "loudnorm=I=-16:TP=-1.5:LRA=11",
    ].join(",");
    const outputs: [string, string[]][] = [
      ["mp3", ["-codec:a", "libmp3lame", "-b:a", "64k"]],
      ["m4a", ["-codec:a", "aac", "-b:a", "64k"]],
    ];
    for (const [ext, codec] of outputs) {
      const out = path.join(dir, `out.${ext}`);
      await run("ffmpeg", ["-y", "-i", input, "-af", filter, "-ac", "1", ...codec, out]);
      await storage.put(`${base}.${ext}`, await fs.readFile(out));
    }
    return true;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

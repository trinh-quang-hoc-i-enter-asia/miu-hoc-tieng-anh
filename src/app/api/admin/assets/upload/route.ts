import { NextResponse } from "next/server";
import { randomUUID, createHash } from "node:crypto";
import { route, badRequest, notFound } from "@/lib/api";
import { requireStaffApi } from "@/lib/staff-auth";
import { db } from "@/lib/db";
import * as storage from "@/lib/storage";
import { parseWav } from "@/lib/wav";
import { convertWav } from "@/lib/audio-convert";
import { VOICES } from "@/lib/content-keys";

const MAX_BYTES = 5 * 1024 * 1024;

/** Tải lên tệp WAV gốc cho một câu và một giọng; nếu có ffmpeg thì tạo luôn bản MP3 và AAC. */
export const POST = route(async (req: Request) => {
  await requireStaffApi();
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Cần gửi dạng multipart/form-data");
  const slug = String(form.get("phraseSlug") || "");
  const voice = String(form.get("voice") || "");
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Thiếu tệp");
  if (!(VOICES as readonly string[]).includes(voice)) throw badRequest("Giọng không hợp lệ");
  if (file.size > MAX_BYTES) throw badRequest("Tệp quá lớn (tối đa 5 MB)");

  const phrase = await db.phrase.findUnique({ where: { slug } });
  if (!phrase) throw notFound("Không tìm thấy câu");
  const buf = Buffer.from(await file.arrayBuffer());
  const info = parseWav(buf);

  const id = randomUUID();
  const storageKey = `audio/${id}.wav`;
  await storage.put(storageKey, buf);
  const converted = await convertWav(storageKey).catch((e) => {
    console.error("[audio] không chuyển được sang MP3/AAC:", e);
    return false;
  });

  const asset = await db.asset.create({
    data: {
      id,
      kind: "audio_wav",
      storageKey,
      mimeType: "audio/wav",
      bytes: buf.length,
      durationMs: info.durationMs,
      checksum: createHash("sha256").update(buf).digest("hex"),
    },
  });
  await db.phraseAudio.upsert({
    where: { phraseId_voice: { phraseId: phrase.id, voice } },
    create: { phraseId: phrase.id, voice, assetId: asset.id },
    update: { assetId: asset.id },
  });
  return NextResponse.json({ assetId: asset.id, durationMs: info.durationMs, converted }, { status: 201 });
});

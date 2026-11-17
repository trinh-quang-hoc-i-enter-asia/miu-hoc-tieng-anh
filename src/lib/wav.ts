import { badRequest } from "./api";

export type WavInfo = { sampleRate: number; channels: number; bits: number; durationMs: number };

/**
 * Đọc phần đầu tệp WAV. Chỉ nhận WAV không nén (PCM), 48 kHz, 16 bit, một kênh,
 * đúng quy tắc tệp gốc đã chốt trong tài liệu thiết kế. Sai thì báo rõ lý do.
 */
export function parseWav(buf: Buffer): WavInfo {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw badRequest("Đây không phải tệp WAV");
  }
  let pos = 12;
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  let dataBytes = -1;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt " && body + 16 <= buf.length) {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        rate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      dataBytes = Math.min(size, buf.length - body);
      break;
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || dataBytes < 0) throw badRequest("Tệp WAV bị hỏng: thiếu phần định dạng hoặc dữ liệu");
  if (fmt.format !== 1) throw badRequest("Tệp WAV phải là loại không nén (PCM)");
  if (fmt.channels !== 1) throw badRequest("Tệp WAV phải có một kênh (mono)");
  if (fmt.bits !== 16) throw badRequest("Tệp WAV phải là 16 bit");
  if (fmt.rate !== 48000) throw badRequest(`Tệp WAV phải là 48 kHz (tệp này là ${fmt.rate} Hz)`);
  const bytesPerSec = fmt.rate * fmt.channels * (fmt.bits / 8);
  return { sampleRate: fmt.rate, channels: fmt.channels, bits: fmt.bits, durationMs: Math.round((dataBytes / bytesPerSec) * 1000) };
}

import { APP_TIMEZONE } from "./config";

/** Khóa ngày dạng YYYY-MM-DD theo múi giờ của app. */
export function dayKey(d: Date = new Date(), tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Cột @db.Date của Prisma nhận một Date lúc 00:00 UTC của ngày đó. */
export function dayToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: string, delta: number): string {
  const d = dayToDate(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Danh sách n ngày gần nhất, cũ trước mới sau, kết thúc ở hôm nay. */
export function lastDays(n: number, today: string = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

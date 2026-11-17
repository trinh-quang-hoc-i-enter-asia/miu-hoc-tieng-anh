import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./config";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hmac(s: string): string {
  return createHmac("sha256", sessionSecret()).update(s).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

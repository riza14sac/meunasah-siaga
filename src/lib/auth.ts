import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { HttpError } from "./http";

export const ADMIN_COOKIE = "ms_admin";
export const ADMIN_COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60;

/** Constant-time comparison that also hides the length of the secret. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * The admin cookie is an HMAC keyed by the device key, so a short PIN alone is
 * not enough to forge it, and changing either secret signs every device out.
 */
export function adminToken(): string | null {
  const pin = process.env.ADMIN_PIN;
  const key = process.env.DEVICE_API_KEY;
  if (!pin || !key) return null;
  return createHmac("sha256", key).update(`admin:${pin}`).digest("base64url");
}

export function isAdmin(request: NextRequest): boolean {
  const expected = adminToken();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(expected && cookie && safeEqual(cookie, expected));
}

export function requireAdmin(request: NextRequest): void {
  if (!isAdmin(request)) {
    throw new HttpError(401, "PIN admin diperlukan untuk mengubah data", "PIN_REQUIRED");
  }
}

export function pinMatches(pin: string): boolean {
  const expected = process.env.ADMIN_PIN;
  return Boolean(expected) && safeEqual(pin, expected!);
}

export function deviceKeyMatches(request: NextRequest): boolean {
  const expected = process.env.DEVICE_API_KEY;
  const sent = request.headers.get("x-api-key");
  return Boolean(expected && sent && safeEqual(sent, expected));
}

export function requireDeviceKey(request: NextRequest): void {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) throw new HttpError(503, "DEVICE_API_KEY belum diatur di server");
  const sent = request.headers.get("x-api-key");
  if (!sent || !safeEqual(sent, expected)) {
    throw new HttpError(401, "API key tidak valid atau tidak dikirim (header x-api-key)");
  }
}

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "lokal";
}

/** Secure cookies need HTTPS; local `npm run dev` over plain HTTP must still work. */
export function isHttps(request: NextRequest): boolean {
  return request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
}

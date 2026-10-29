import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE_S, adminToken, clientIp, isAdmin, isHttps, pinMatches } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { HttpError, readBody, route } from "@/lib/http";

export const dynamic = "force-dynamic";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

export const GET = route(async (request: NextRequest) => NextResponse.json({ admin: isAdmin(request) }));

export const POST = route(async (request: NextRequest) => {
  const token = adminToken();
  if (!token) throw new HttpError(503, "ADMIN_PIN atau DEVICE_API_KEY belum diatur di server");

  const body = await readBody(request);
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const db = await getDb();
  const ip = clientIp(request);
  const now = Date.now();

  const recent = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM auth_attempts WHERE ip = ? AND at >= ?",
    args: [ip, new Date(now - WINDOW_MS).toISOString()],
  });
  if (Number(recent.rows[0].c) >= MAX_FAILURES) {
    throw new HttpError(429, "Terlalu banyak percobaan PIN. Coba lagi 15 menit lagi.");
  }

  if (!pin || !pinMatches(pin)) {
    await db.batch(
      [
        { sql: "INSERT INTO auth_attempts (ip, at) VALUES (?, ?)", args: [ip, new Date(now).toISOString()] },
        { sql: "DELETE FROM auth_attempts WHERE at < ?", args: [new Date(now - 24 * 3_600_000).toISOString()] },
      ],
      "write"
    );
    throw new HttpError(401, "PIN salah");
  }

  await db.execute({ sql: "DELETE FROM auth_attempts WHERE ip = ?", args: [ip] });
  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(request),
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE_S,
  });
  return res;
});

export const DELETE = route(async (request: NextRequest) => {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isHttps(request), path: "/", maxAge: 0 });
  return res;
});

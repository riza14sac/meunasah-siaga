import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { deleteProfile, profileDto, updateProfile } from "@/lib/schedule";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { id } = await params;
  const profile = await updateProfile(await getDb(), id, await readBody(request));
  return NextResponse.json(profileDto(profile));
});

export const DELETE = route(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { id } = await params;
  await deleteProfile(await getDb(), id);
  return NextResponse.json({ ok: true });
});

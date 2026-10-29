import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { readBody, route } from "@/lib/http";
import { createProfile, listProfiles, profileDto } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const profiles = await listProfiles(await getDb());
  return NextResponse.json({ profiles: profiles.map(profileDto) });
});

export const POST = route(async (request: NextRequest) => {
  requireAdmin(request);
  const profile = await createProfile(await getDb(), await readBody(request));
  return NextResponse.json(profileDto(profile), { status: 201 });
});

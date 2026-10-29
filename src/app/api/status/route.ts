import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route } from "@/lib/http";
import { getStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export const GET = route(async () => NextResponse.json(await getStatus(await getDb(), Date.now())));

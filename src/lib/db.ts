import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type Value } from "@libsql/client";
import { migrations } from "./migrations";

declare global {
  // eslint-disable-next-line no-var
  var __meunasahDb: Promise<Client> | undefined;
}

function connectionConfig(): { url: string; authToken?: string } {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Plain HTTP suits serverless functions better than a long-lived WebSocket;
    // libsql:// and https:// reach the same Turso database.
    return { url: url.replace(/^libsql:\/\//, "https://"), authToken: process.env.TURSO_AUTH_TOKEN };
  }
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL belum diatur di Vercel. Lihat docs/DEPLOY.md.");
  }
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  return { url: "file:./data/local.db" };
}

async function migrate(db: Client): Promise<void> {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
  );
  const applied = await db.execute("SELECT version FROM schema_migrations");
  const done = new Set(applied.rows.map((r) => Number(r.version)));

  for (const migration of migrations) {
    if (done.has(migration.version)) continue;
    // A batch runs as one transaction. INSERT OR IGNORE keeps this idempotent
    // when two cold starts race to apply the same migration.
    await db.batch(
      [
        ...migration.statements(),
        {
          sql: "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
          args: [migration.version, new Date().toISOString()],
        },
      ],
      "write"
    );
  }
}

export function getDb(): Promise<Client> {
  if (!global.__meunasahDb) {
    global.__meunasahDb = (async () => {
      const db = createClient(connectionConfig());
      await migrate(db);
      return db;
    })().catch((err) => {
      global.__meunasahDb = undefined;
      throw err;
    });
  }
  return global.__meunasahDb;
}

export const num = (v: Value): number => Number(v);
export const numOrNull = (v: Value): number | null => (v === null ? null : Number(v));
export const str = (v: Value): string => String(v);
export const strOrNull = (v: Value): string | null => (v === null ? null : String(v));
export const bool = (v: Value): boolean => Number(v) === 1;

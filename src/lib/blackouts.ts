import type { Client, Row } from "@libsql/client";
import type { BlackoutEvent, BlackoutOutcome, Mode } from "./types";
import { num, str, strOrNull } from "./db";
import { HttpError, ValidationError } from "./http";

export const BLACKOUT_COLS = "id, mode, start_time, end_time, battery_at_start, outcome, fail_reason, note";

export function toBlackout(r: Row): BlackoutEvent {
  return {
    id: str(r.id),
    mode: str(r.mode) === "simulasi" ? "simulasi" : "real",
    start_time: str(r.start_time),
    end_time: strOrNull(r.end_time),
    battery_at_start: num(r.battery_at_start),
    outcome: strOrNull(r.outcome) as BlackoutOutcome | null,
    fail_reason: strOrNull(r.fail_reason),
    note: strOrNull(r.note),
  };
}

export async function listBlackouts(db: Client, mode: Mode, sinceIso: string | null): Promise<BlackoutEvent[]> {
  const res = await db.execute({
    sql: `SELECT ${BLACKOUT_COLS} FROM blackout_events
          WHERE mode = ? AND (? IS NULL OR start_time >= ?)
          ORDER BY start_time DESC LIMIT 200`,
    args: [mode, sinceIso, sinceIso],
  });
  return res.rows.map(toBlackout);
}

export async function deleteBlackout(db: Client, id: string): Promise<void> {
  const res = await db.execute({ sql: "SELECT end_time FROM blackout_events WHERE id = ?", args: [id] });
  const row = res.rows[0];
  if (!row) throw new HttpError(404, "Kejadian pemadaman tidak ditemukan");
  if (row.end_time === null) throw new ValidationError("Tidak bisa menghapus pemadaman yang masih berlangsung");
  await db.execute({ sql: "DELETE FROM blackout_events WHERE id = ?", args: [id] });
}

import { randomUUID } from "node:crypto";
import type { Client, Row } from "@libsql/client";
import type { TestMeasurement, TestSession, TestSessionDetail, TestSessionWithSummary, TestSummary } from "./types";
import { num, numOrNull, str, strOrNull } from "./db";
import { HttpError, ValidationError } from "./http";
import { atWibTime, wibClockSeconds, wibDateKey, wibDayStartFromKey } from "./time";
import {
  DATE_RE,
  TIME_RE,
  nullableNumberField,
  numberField,
  optionalTextField,
  textField,
  type Body,
} from "./validate";

const SESSION_COLS = `s.id, s.judul, s.tanggal, s.lokasi, s.kondisi, s.tekanan_bar, s.debit_lpm,
  s.started_at, s.ended_at, s.catatan, s.created_at`;
const SUMMARY_COLS = `COUNT(m.id) AS n, COALESCE(SUM(m.sumber = 'esp32'), 0) AS n_esp32,
  MIN(m.gen_voltage) AS v_min, AVG(m.gen_voltage) AS v_avg, MAX(m.gen_voltage) AS v_max,
  MAX(m.arus_a) AS a_max, MAX(m.gen_voltage * m.arus_a) AS p_max, MIN(m.ts) AS first_ts, MAX(m.ts) AS last_ts`;
const MEASUREMENT_COLS = "id, session_id, ts, sumber, gen_voltage, arus_a, beban, catatan";

function toSession(r: Row): TestSession {
  const startedAt = strOrNull(r.started_at);
  const endedAt = strOrNull(r.ended_at);
  return {
    id: str(r.id),
    judul: str(r.judul),
    tanggal: str(r.tanggal),
    lokasi: strOrNull(r.lokasi),
    kondisi: strOrNull(r.kondisi),
    tekanan_bar: numOrNull(r.tekanan_bar),
    debit_lpm: numOrNull(r.debit_lpm),
    started_at: startedAt,
    ended_at: endedAt,
    catatan: strOrNull(r.catatan),
    created_at: str(r.created_at),
    recording: startedAt !== null && endedAt === null,
  };
}

function toSummary(r: Row): TestSummary {
  const count = num(r.n);
  const countEsp32 = num(r.n_esp32);
  return {
    count,
    count_esp32: countEsp32,
    count_manual: count - countEsp32,
    v_min: numOrNull(r.v_min),
    v_avg: numOrNull(r.v_avg),
    v_max: numOrNull(r.v_max),
    a_max: numOrNull(r.a_max),
    p_max: numOrNull(r.p_max),
    first_ts: strOrNull(r.first_ts),
    last_ts: strOrNull(r.last_ts),
  };
}

function toMeasurement(r: Row): TestMeasurement {
  const voltage = num(r.gen_voltage);
  const current = numOrNull(r.arus_a);
  return {
    id: num(r.id),
    session_id: str(r.session_id),
    ts: str(r.ts),
    sumber: str(r.sumber) === "manual" ? "manual" : "esp32",
    gen_voltage: voltage,
    arus_a: current,
    daya_w: current === null ? null : voltage * current,
    beban: strOrNull(r.beban),
    catatan: strOrNull(r.catatan),
  };
}

export async function listSessions(db: Client, limit: number): Promise<TestSessionWithSummary[]> {
  const res = await db.execute({
    sql: `SELECT ${SESSION_COLS}, ${SUMMARY_COLS}
          FROM test_sessions s LEFT JOIN test_measurements m ON m.session_id = s.id
          GROUP BY s.id ORDER BY s.tanggal DESC, s.created_at DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map((r) => ({ ...toSession(r), summary: toSummary(r) }));
}

export async function getSessionDetail(db: Client, id: string): Promise<TestSessionDetail> {
  const [sessionRes, measurementsRes] = await db.batch(
    [
      {
        sql: `SELECT ${SESSION_COLS}, ${SUMMARY_COLS}
              FROM test_sessions s LEFT JOIN test_measurements m ON m.session_id = s.id
              WHERE s.id = ? GROUP BY s.id`,
        args: [id],
      },
      { sql: `SELECT ${MEASUREMENT_COLS} FROM test_measurements WHERE session_id = ? ORDER BY ts, id`, args: [id] },
    ],
    "read"
  );
  const row = sessionRes.rows[0];
  if (!row) throw new HttpError(404, "Sesi pengujian tidak ditemukan");
  return { session: toSession(row), summary: toSummary(row), measurements: measurementsRes.rows.map(toMeasurement) };
}

async function getSession(db: Client, id: string): Promise<TestSession> {
  const res = await db.execute({ sql: `SELECT ${SESSION_COLS} FROM test_sessions s WHERE s.id = ?`, args: [id] });
  if (!res.rows[0]) throw new HttpError(404, "Sesi pengujian tidak ditemukan");
  return toSession(res.rows[0]);
}

const TEXT_FIELDS = [
  ["lokasi", "Lokasi", 80],
  ["kondisi", "Kondisi", 120],
  ["catatan", "Catatan", 500],
] as const;

function parseSessionFields(body: Body, partial: boolean): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {};
  if (!partial || body.judul !== undefined) fields.judul = textField(body, "judul", { label: "Judul sesi", max: 80 });
  if (body.tanggal !== undefined) {
    if (typeof body.tanggal !== "string" || !DATE_RE.test(body.tanggal)) {
      throw new ValidationError("Tanggal harus berformat YYYY-MM-DD");
    }
    fields.tanggal = body.tanggal;
  }
  for (const [key, label, max] of TEXT_FIELDS) {
    const value = optionalTextField(body, key, { label, max });
    if (value !== undefined) fields[key] = value;
  }
  const pressure = nullableNumberField(body, "tekanan_bar", { min: 0, max: 10, label: "Tekanan", unit: "bar" });
  if (pressure !== undefined) fields.tekanan_bar = pressure;
  const flow = nullableNumberField(body, "debit_lpm", { min: 0, max: 200, label: "Debit", unit: "L/menit" });
  if (flow !== undefined) fields.debit_lpm = flow;
  return fields;
}

export async function createSession(db: Client, body: Body, nowMs: number): Promise<TestSession> {
  const f = parseSessionFields(body, false);
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO test_sessions (id, judul, tanggal, lokasi, kondisi, tekanan_bar, debit_lpm, catatan, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      f.judul,
      f.tanggal ?? wibDateKey(nowMs),
      f.lokasi ?? null,
      f.kondisi ?? null,
      f.tekanan_bar ?? null,
      f.debit_lpm ?? null,
      f.catatan ?? null,
      new Date(nowMs).toISOString(),
    ],
  });
  return getSession(db, id);
}

/** Edits fields, or with `action` starts ("mulai") or stops ("selesai") recording ESP32 data. */
export async function updateSession(db: Client, id: string, body: Body, nowMs: number): Promise<TestSession> {
  await getSession(db, id);
  const nowIso = new Date(nowMs).toISOString();

  if (body.action === "mulai") {
    // Only one session records at a time; starting this one stops any other.
    await db.batch(
      [
        {
          sql: "UPDATE test_sessions SET ended_at = ? WHERE id <> ? AND started_at IS NOT NULL AND ended_at IS NULL",
          args: [nowIso, id],
        },
        { sql: "UPDATE test_sessions SET started_at = COALESCE(started_at, ?), ended_at = NULL WHERE id = ?", args: [nowIso, id] },
      ],
      "write"
    );
  } else if (body.action === "selesai") {
    await db.execute({
      sql: "UPDATE test_sessions SET ended_at = ? WHERE id = ? AND started_at IS NOT NULL AND ended_at IS NULL",
      args: [nowIso, id],
    });
  } else if (body.action !== undefined) {
    throw new ValidationError("action harus 'mulai' atau 'selesai'");
  } else {
    const entries = Object.entries(parseSessionFields(body, true));
    if (entries.length === 0) throw new ValidationError("Tidak ada data sesi yang diubah");
    await db.execute({
      sql: `UPDATE test_sessions SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`,
      args: [...entries.map(([, value]) => value), id],
    });
  }
  return getSession(db, id);
}

export async function deleteSession(db: Client, id: string): Promise<void> {
  await getSession(db, id);
  await db.batch(
    [
      { sql: "DELETE FROM test_measurements WHERE session_id = ?", args: [id] },
      { sql: "DELETE FROM test_sessions WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

export async function addManualMeasurement(db: Client, sessionId: string, body: Body, nowMs: number): Promise<TestMeasurement> {
  const session = await getSession(db, sessionId);
  const voltage = numberField(body, "gen_voltage", { min: 0, max: 60, label: "Tegangan", unit: "V" });
  const current = nullableNumberField(body, "arus_a", { min: 0, max: 10, label: "Arus", unit: "A" }) ?? null;
  const load = optionalTextField(body, "beban", { label: "Beban", max: 60 }) ?? null;
  const note = optionalTextField(body, "catatan", { label: "Catatan", max: 200 }) ?? null;

  let tsMs = nowMs;
  if (body.waktu !== undefined && body.waktu !== null && body.waktu !== "") {
    if (typeof body.waktu !== "string" || !TIME_RE.test(body.waktu)) throw new ValidationError("Waktu harus berformat HH:MM");
    tsMs = atWibTime(wibDayStartFromKey(session.tanggal), body.waktu);
  }

  const ts = new Date(tsMs).toISOString();
  const res = await db.execute({
    sql: `INSERT INTO test_measurements (session_id, ts, sumber, gen_voltage, arus_a, beban, catatan)
          VALUES (?, ?, 'manual', ?, ?, ?, ?)`,
    args: [sessionId, ts, voltage, current, load, note],
  });
  return {
    id: Number(res.lastInsertRowid),
    session_id: sessionId,
    ts,
    sumber: "manual",
    gen_voltage: voltage,
    arus_a: current,
    daya_w: current === null ? null : voltage * current,
    beban: load,
    catatan: note,
  };
}

export async function deleteMeasurement(db: Client, sessionId: string, measurementId: number): Promise<void> {
  const res = await db.execute({
    sql: "DELETE FROM test_measurements WHERE id = ? AND session_id = ?",
    args: [measurementId, sessionId],
  });
  if (res.rowsAffected === 0) throw new HttpError(404, "Data pengukuran tidak ditemukan");
}

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  // Keep spreadsheet apps from treating typed notes as formulas.
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function sessionCsv(measurements: TestMeasurement[]): string {
  const header = ["waktu_wib", "sumber", "tegangan_v", "arus_a", "daya_w", "beban", "catatan"];
  const lines = measurements.map((m) => {
    const ms = Date.parse(m.ts);
    return [
      `${wibDateKey(ms)} ${wibClockSeconds(ms)}`,
      m.sumber,
      m.gen_voltage,
      m.arus_a,
      m.daya_w === null ? null : Math.round(m.daya_w * 1000) / 1000,
      m.beban,
      m.catatan,
    ]
      .map(csvCell)
      .join(",");
  });
  // The BOM makes Excel read the file as UTF-8.
  return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
}

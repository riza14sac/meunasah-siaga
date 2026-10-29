import { randomUUID } from "node:crypto";
import type { Client, InStatement } from "@libsql/client";
import type { ScheduleSlot, Settings } from "./types";
import { num, str } from "./db";
import { rollupDelta, type PowerSample } from "./energy";
import { ValidationError } from "./http";
import { classifyBlackout } from "./outcome";
import { rollupStatement } from "./readings";
import { nullableNumberField, numberField, optionalTextField, type Body } from "./validate";

export interface IngestPayload {
  device_id: string;
  tsMs: number | null;
  gen_voltage: number;
  gen_current: number | null;
  bat_voltage: number;
  bat_current: number;
  bat_percent: number;
  pln_on: boolean;
  lamp1_pct: number;
  lamp2_pct: number;
  rssi: number | null;
  fw: string | null;
}

const DEVICE_ID_RE = /^[A-Za-z0-9._-]{1,32}$/;
const MAX_PAST_MS = 7 * 24 * 3_600_000;
const MAX_FUTURE_MS = 5 * 60_000;

export function parseIngest(body: Body, nowMs: number): IngestPayload {
  let deviceId = "esp32";
  if (body.device_id !== undefined && body.device_id !== null) {
    if (typeof body.device_id !== "string" || !DEVICE_ID_RE.test(body.device_id)) {
      throw new ValidationError("device_id harus teks 1–32 karakter (huruf, angka, titik, minus, atau garis bawah)");
    }
    deviceId = body.device_id;
  }

  const genVoltage = numberField(body, "gen_voltage", { min: 0, max: 60, unit: "V" });
  const genCurrent = nullableNumberField(body, "gen_current", { min: 0, max: 10, unit: "A" }) ?? null;
  const batVoltage = numberField(body, "bat_voltage", { min: 0, max: 10, unit: "V" });
  const batCurrent = numberField(body, "bat_current", { min: -10, max: 10, unit: "A (negatif = mengisi)" });
  const batPercent = numberField(body, "bat_percent", { min: 0, max: 100, unit: "%" });

  const pln = body.pln_on;
  if (typeof pln !== "boolean" && pln !== 0 && pln !== 1) throw new ValidationError("pln_on harus true atau false");

  const lamp1 = numberField(body, "lamp1_pct", { min: 0, max: 100, integer: true, unit: "%" });
  const lamp2 = numberField(body, "lamp2_pct", { min: 0, max: 100, integer: true, unit: "%" });
  const rssi = nullableNumberField(body, "rssi", { min: -130, max: 0, integer: true, unit: "dBm" }) ?? null;
  const fw = optionalTextField(body, "fw", { label: "fw", max: 32 }) ?? null;

  let tsMs: number | null = null;
  if (body.ts !== undefined && body.ts !== null) {
    const parsed = typeof body.ts === "string" ? Date.parse(body.ts) : NaN;
    if (!Number.isFinite(parsed) || parsed < nowMs - MAX_PAST_MS || parsed > nowMs + MAX_FUTURE_MS) {
      throw new ValidationError(
        "ts harus waktu ISO 8601 yang valid, paling lama 7 hari ke belakang. Hapus ts agar waktu diisi server"
      );
    }
    tsMs = parsed;
  }

  return {
    device_id: deviceId,
    tsMs,
    gen_voltage: genVoltage,
    gen_current: genCurrent,
    bat_voltage: batVoltage,
    bat_current: batCurrent,
    bat_percent: batPercent,
    pln_on: pln === true || pln === 1,
    lamp1_pct: lamp1,
    lamp2_pct: lamp2,
    rssi,
    fw,
  };
}

export interface IngestResult {
  blackout: "dibuka" | "ditutup" | null;
  session_id: string | null;
}

/**
 * Stores one ESP32 reading as mode 'real': updates the 5-minute rollup and the
 * device status, opens or closes a blackout when pln_on flips, and copies the
 * reading into the test session that is currently recording.
 */
export async function ingestReading(
  db: Client,
  p: IngestPayload,
  receivedMs: number,
  settings: Settings,
  slots: readonly ScheduleSlot[]
): Promise<IngestResult> {
  const tsMs = p.tsMs ?? receivedMs;
  const ts = new Date(tsMs).toISOString();

  const [prevRes, openRes, sessionRes] = await db.batch(
    [
      "SELECT ts, gen_voltage, bat_voltage, bat_current FROM readings WHERE mode = 'real' ORDER BY ts DESC LIMIT 1",
      "SELECT id, start_time FROM blackout_events WHERE mode = 'real' AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
      "SELECT id FROM test_sessions WHERE started_at IS NOT NULL AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    ],
    "read"
  );

  const prevRow = prevRes.rows[0];
  const prev: PowerSample | null = prevRow
    ? {
        tsMs: Date.parse(str(prevRow.ts)),
        gen_voltage: num(prevRow.gen_voltage),
        bat_voltage: num(prevRow.bat_voltage),
        bat_current: num(prevRow.bat_current),
      }
    : null;
  const delta = rollupDelta(prev, { tsMs, gen_voltage: p.gen_voltage, bat_voltage: p.bat_voltage, bat_current: p.bat_current });

  const writes: InStatement[] = [
    {
      sql: `INSERT INTO readings (ts, mode, device_id, gen_voltage, gen_current, bat_voltage, bat_current, bat_percent,
              pln_on, lamp1_pct, lamp2_pct, rssi, fw)
            VALUES (?, 'real', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        ts,
        p.device_id,
        p.gen_voltage,
        p.gen_current,
        p.bat_voltage,
        p.bat_current,
        p.bat_percent,
        p.pln_on ? 1 : 0,
        p.lamp1_pct,
        p.lamp2_pct,
        p.rssi,
        p.fw,
      ],
    },
    rollupStatement("real", tsMs, p.bat_percent, p.gen_voltage, delta),
    {
      sql: `INSERT INTO device_status (device_id, last_seen, rssi, fw) VALUES (?, ?, ?, ?)
            ON CONFLICT (device_id) DO UPDATE SET last_seen = excluded.last_seen, rssi = excluded.rssi, fw = excluded.fw`,
      args: [p.device_id, new Date(receivedMs).toISOString(), p.rssi, p.fw],
    },
  ];

  let blackout: IngestResult["blackout"] = null;
  const open = openRes.rows[0];
  if (!p.pln_on && !open) {
    writes.push({
      sql: "INSERT INTO blackout_events (id, mode, start_time, battery_at_start) VALUES (?, 'real', ?, ?)",
      args: [randomUUID(), ts, p.bat_percent],
    });
    blackout = "dibuka";
  } else if (p.pln_on && open) {
    const startIso = str(open.start_time);
    const during = await db.execute({
      sql: `SELECT ts, bat_percent, lamp1_pct, lamp2_pct FROM readings
            WHERE mode = 'real' AND ts >= ? AND ts <= ? ORDER BY ts`,
      args: [startIso, ts],
    });
    const result = classifyBlackout({
      startMs: Date.parse(startIso),
      endMs: tsMs,
      samples: [
        ...during.rows.map((r) => ({
          tsMs: Date.parse(str(r.ts)),
          bat_percent: num(r.bat_percent),
          lamp1_pct: num(r.lamp1_pct),
          lamp2_pct: num(r.lamp2_pct),
        })),
        { tsMs, bat_percent: p.bat_percent, lamp1_pct: p.lamp1_pct, lamp2_pct: p.lamp2_pct },
      ],
      slots,
      maxBrightness: settings.max_brightness,
      zonesEnabled: settings.zone1_enabled || settings.zone2_enabled,
    });
    writes.push({
      sql: "UPDATE blackout_events SET end_time = ?, outcome = ?, fail_reason = ?, note = ? WHERE id = ?",
      args: [ts, result.outcome, result.fail_reason, result.note, str(open.id)],
    });
    blackout = "ditutup";
  }

  const session = sessionRes.rows[0];
  if (session) {
    writes.push({
      sql: "INSERT INTO test_measurements (session_id, ts, sumber, gen_voltage, arus_a) VALUES (?, ?, 'esp32', ?, ?)",
      args: [str(session.id), ts, p.gen_voltage, p.gen_current],
    });
  }

  await db.batch(writes, "write");
  return { blackout, session_id: session ? str(session.id) : null };
}

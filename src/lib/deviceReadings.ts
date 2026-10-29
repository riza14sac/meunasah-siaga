import type { Client, Row } from "@libsql/client";
import { num, numOrNull, str } from "./db";
import { ValidationError } from "./http";
import { TIME_ZONE, wibClock, wibDateKey } from "./time";
import type { DeviceReading } from "./types";
import { nullableNumberField, numberField, type Body } from "./validate";

export interface DeviceReadingInput {
  device_id: string;
  gen_voltage: number;
  gen_current: number;
  rssi: number | null;
}

export function parseDeviceReading(body: Body): DeviceReadingInput {
  let deviceId = "esp32";
  if (body.device_id !== undefined && body.device_id !== null) {
    if (typeof body.device_id !== "string" || body.device_id.trim().length === 0 || body.device_id.trim().length > 32) {
      throw new ValidationError("device_id harus teks 1–32 karakter");
    }
    deviceId = body.device_id.trim();
  }

  const genVoltage = numberField(body, "gen_voltage", { min: 0, max: 30, unit: "V" });
  const genCurrent = nullableNumberField(body, "gen_current", { min: -5, max: 5, unit: "A" }) ?? 0;
  const rssi = nullableNumberField(body, "rssi", { min: -130, max: 0, integer: true, unit: "dBm" }) ?? null;

  return { device_id: deviceId, gen_voltage: genVoltage, gen_current: genCurrent, rssi };
}

export async function insertDeviceReading(db: Client, r: DeviceReadingInput, receivedMs: number): Promise<number> {
  const res = await db.execute({
    sql: `INSERT INTO device_readings (ts, device_id, gen_voltage, gen_current, gen_power, rssi)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [new Date(receivedMs).toISOString(), r.device_id, r.gen_voltage, r.gen_current, r.gen_voltage * r.gen_current, r.rssi],
  });
  return Number(res.lastInsertRowid);
}

const COLS = "id, ts, device_id, gen_voltage, gen_current, gen_power, rssi";

function toDeviceReading(row: Row): DeviceReading {
  return {
    id: num(row.id),
    ts: str(row.ts),
    device_id: str(row.device_id),
    gen_voltage: num(row.gen_voltage),
    gen_current: num(row.gen_current),
    gen_power: num(row.gen_power),
    rssi: numOrNull(row.rssi),
  };
}

export async function latestDeviceReading(db: Client): Promise<DeviceReading | null> {
  const res = await db.execute(`SELECT ${COLS} FROM device_readings ORDER BY ts DESC, id DESC LIMIT 1`);
  return res.rows[0] ? toDeviceReading(res.rows[0]) : null;
}

export async function deviceReadingsSince(db: Client, sinceMs: number): Promise<DeviceReading[]> {
  const res = await db.execute({
    sql: `SELECT ${COLS} FROM device_readings WHERE ts >= ? ORDER BY ts ASC, id ASC`,
    args: [new Date(sinceMs).toISOString()],
  });
  return res.rows.map(toDeviceReading);
}

/** `?minutes=` as 1–1440; absent means `fallback`. */
export function parseMinutes(searchParams: URLSearchParams, fallback: number): number {
  const raw = searchParams.get("minutes");
  if (raw === null || raw === "") return fallback;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new ValidationError("minutes harus bilangan bulat antara 1 dan 1440");
  }
  return minutes;
}

const csvTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Decimal comma and no thousands separator, so Indonesian Excel reads it as a number. */
const decimal = (v: number, digits: number) => v.toFixed(digits).replace(".", ",");

/** Semicolon-separated with a UTF-8 BOM, the format Excel with Indonesian settings opens into columns. */
export function deviceReadingsCsv(rows: DeviceReading[]): string {
  const lines = ["waktu;tegangan_V;arus_mA;daya_mW;rssi_dBm"];
  for (const r of rows) {
    lines.push(
      [
        // id-ID gives "29/10/2026, 17.50.12"; the comma would read as part of the text, so drop it.
        csvTime.format(Date.parse(r.ts)).replace(", ", " "),
        decimal(r.gen_voltage, 3),
        decimal(r.gen_current * 1000, 2),
        decimal(r.gen_power * 1000, 2),
        r.rssi === null ? "" : String(r.rssi),
      ].join(";")
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function deviceCsvFilename(nowMs: number): string {
  return `uji-generator-${wibDateKey(nowMs).replaceAll("-", "")}-${wibClock(nowMs).replace(":", "")}.csv`;
}

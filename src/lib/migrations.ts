import type { InStatement } from "@libsql/client";
import { DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME, DEFAULT_SLOTS } from "./prayer";

export interface Migration {
  version: number;
  statements: () => InStatement[];
}

export const migrations: Migration[] = [
  {
    version: 1,
    statements: () => [
      `CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('real', 'simulasi')),
        device_id TEXT,
        gen_voltage REAL NOT NULL,
        gen_current REAL,
        bat_voltage REAL NOT NULL,
        bat_current REAL NOT NULL,
        bat_percent REAL NOT NULL,
        pln_on INTEGER NOT NULL,
        lamp1_pct INTEGER NOT NULL,
        lamp2_pct INTEGER NOT NULL,
        rssi INTEGER,
        fw TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_readings_mode_ts ON readings (mode, ts)",

      // One row per mode per 5 minutes, so energy totals and long charts never
      // have to scan the raw readings (the ESP32 sends ~17,000 rows a day).
      `CREATE TABLE IF NOT EXISTS stats_5min (
        mode TEXT NOT NULL,
        bucket TEXT NOT NULL,
        samples INTEGER NOT NULL DEFAULT 0,
        bat_pct_sum REAL NOT NULL DEFAULT 0,
        bat_pct_last REAL,
        gen_v_max REAL NOT NULL DEFAULT 0,
        energy_in_wh REAL NOT NULL DEFAULT 0,
        energy_out_wh REAL NOT NULL DEFAULT 0,
        spin_seconds REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (mode, bucket)
      )`,

      `CREATE TABLE IF NOT EXISTS device_status (
        device_id TEXT PRIMARY KEY,
        last_seen TEXT NOT NULL,
        rssi INTEGER,
        fw TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS blackout_events (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL CHECK (mode IN ('real', 'simulasi')),
        start_time TEXT NOT NULL,
        end_time TEXT,
        battery_at_start REAL NOT NULL,
        outcome TEXT CHECK (outcome IN ('bertahan', 'gagal', 'siang')),
        fail_reason TEXT,
        note TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_blackout_mode_start ON blackout_events (mode, start_time)",

      `CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT NOT NULL DEFAULT 'real' CHECK (mode IN ('real', 'simulasi')),
        reserve_min INTEGER NOT NULL DEFAULT 20 CHECK (reserve_min BETWEEN 0 AND 50),
        max_brightness INTEGER NOT NULL DEFAULT 80 CHECK (max_brightness BETWEEN 0 AND 80),
        zone1_enabled INTEGER NOT NULL DEFAULT 1,
        zone2_enabled INTEGER NOT NULL DEFAULT 1,
        auto_dim INTEGER NOT NULL DEFAULT 1,
        notify INTEGER NOT NULL DEFAULT 1,
        deep_sleep INTEGER NOT NULL DEFAULT 0,
        adzan INTEGER NOT NULL DEFAULT 0
      )`,
      "INSERT OR IGNORE INTO system_settings (id) VALUES (1)",

      `CREATE TABLE IF NOT EXISTS schedule_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS schedule_slots (
        profile_id TEXT NOT NULL,
        prayer TEXT NOT NULL CHECK (prayer IN ('subuh', 'zuhur', 'ashar', 'maghrib', 'isya')),
        time TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('rendah', 'sedang', 'tinggi')),
        lamp_pct INTEGER NOT NULL,
        target_min INTEGER NOT NULL,
        PRIMARY KEY (profile_id, prayer)
      )`,
      {
        sql: "INSERT OR IGNORE INTO schedule_profiles (id, name, active, created_at) VALUES (?, ?, 1, ?)",
        args: [DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME, new Date().toISOString()],
      },
      ...DEFAULT_SLOTS.map((s) => ({
        sql: `INSERT OR IGNORE INTO schedule_slots (profile_id, prayer, time, priority, lamp_pct, target_min)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [DEFAULT_PROFILE_ID, s.prayer, s.time, s.priority, s.lamp_pct, s.target_min],
      })),

      `CREATE TABLE IF NOT EXISTS maintenance_notes (
        id TEXT PRIMARY KEY,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      "CREATE INDEX IF NOT EXISTS idx_maintenance_created ON maintenance_notes (created_at)",

      `CREATE TABLE IF NOT EXISTS test_sessions (
        id TEXT PRIMARY KEY,
        judul TEXT NOT NULL,
        tanggal TEXT NOT NULL,
        lokasi TEXT,
        kondisi TEXT,
        tekanan_bar REAL,
        debit_lpm REAL,
        started_at TEXT,
        ended_at TEXT,
        catatan TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS test_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        ts TEXT NOT NULL,
        sumber TEXT NOT NULL CHECK (sumber IN ('esp32', 'manual')),
        gen_voltage REAL NOT NULL,
        arus_a REAL,
        beban TEXT,
        catatan TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_test_measurements_session ON test_measurements (session_id, ts)",

      `CREATE TABLE IF NOT EXISTS auth_attempts (
        ip TEXT NOT NULL,
        at TEXT NOT NULL
      )`,
      "CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_at ON auth_attempts (ip, at)",
    ],
  },
  {
    version: 2,
    // Raw generator readings for the Uji Generator page. Kept apart from
    // `readings` so a sketch that only has the INA219 can send without battery data.
    statements: () => [
      `CREATE TABLE IF NOT EXISTS device_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        device_id TEXT NOT NULL,
        gen_voltage REAL NOT NULL,
        gen_current REAL NOT NULL,
        gen_power REAL NOT NULL,
        rssi INTEGER
      )`,
      "CREATE INDEX IF NOT EXISTS idx_device_readings_ts ON device_readings (ts)",
    ],
  },
];

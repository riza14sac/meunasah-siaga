export type Mode = "real" | "simulasi";
export type PrayerKey = "subuh" | "zuhur" | "ashar" | "maghrib" | "isya";
export type Priority = "rendah" | "sedang" | "tinggi";
export type BlackoutOutcome = "bertahan" | "gagal" | "siang";
export type MeasurementSource = "esp32" | "manual";

export interface Reading {
  id: number;
  ts: string;
  mode: Mode;
  device_id: string | null;
  gen_voltage: number;
  /** Generator current from the second INA219 (0x41); null until it is installed. */
  gen_current: number | null;
  bat_voltage: number;
  /** Negative while charging. */
  bat_current: number;
  bat_percent: number;
  pln_on: boolean;
  lamp1_pct: number;
  lamp2_pct: number;
  rssi: number | null;
  fw: string | null;
}

/** One point of a (possibly downsampled) reading series for charts. */
export interface ReadingPoint {
  ts: string;
  bat_percent: number;
  gen_voltage: number;
  charge_w: number;
}

export interface BlackoutEvent {
  id: string;
  mode: Mode;
  start_time: string;
  end_time: string | null;
  battery_at_start: number;
  outcome: BlackoutOutcome | null;
  fail_reason: string | null;
  note: string | null;
}

export interface ScheduleSlot {
  prayer: PrayerKey;
  time: string;
  priority: Priority;
  lamp_pct: number;
  target_min: number;
}

export interface ScheduleProfile {
  id: string;
  name: string;
  active: boolean;
  slots: ScheduleSlot[];
}

/** API shape of a profile: slots plus flat `subuh: "04:52"` style times. */
export type ScheduleProfileDto = ScheduleProfile & Record<PrayerKey, string>;

export interface Settings {
  mode: Mode;
  reserve_min: number;
  max_brightness: number;
  zone1_enabled: boolean;
  zone2_enabled: boolean;
  auto_dim: boolean;
  notify: boolean;
  deep_sleep: boolean;
  adzan: boolean;
}

export interface DeviceStatus {
  device_id: string;
  last_seen: string;
  rssi: number | null;
  fw: string | null;
  online: boolean;
}

export interface MaintenanceNote {
  id: string;
  note: string;
  created_at: string;
}

export interface TestSession {
  id: string;
  judul: string;
  tanggal: string;
  lokasi: string | null;
  kondisi: string | null;
  tekanan_bar: number | null;
  debit_lpm: number | null;
  started_at: string | null;
  ended_at: string | null;
  catatan: string | null;
  created_at: string;
  recording: boolean;
}

export interface TestSummary {
  count: number;
  count_esp32: number;
  count_manual: number;
  v_min: number | null;
  v_avg: number | null;
  v_max: number | null;
  a_max: number | null;
  p_max: number | null;
  first_ts: string | null;
  last_ts: string | null;
}

export interface TestSessionWithSummary extends TestSession {
  summary: TestSummary;
}

export interface TestSessionDetail {
  session: TestSession;
  summary: TestSummary;
  measurements: TestMeasurement[];
}

export interface TestMeasurement {
  id: number;
  session_id: string;
  ts: string;
  sumber: MeasurementSource;
  gen_voltage: number;
  arus_a: number | null;
  daya_w: number | null;
  beban: string | null;
  catatan: string | null;
}

export interface NextPrayer {
  prayer: PrayerKey;
  at: string;
  priority: Priority;
  lamp_pct: number;
  lamps: boolean;
}

export interface StatusResponse {
  mode: Mode;
  server_time: string;
  device: DeviceStatus | null;
  reading: Reading | null;
  charge_power_w: number | null;
  turbine_power_w: number | null;
  active_blackout: BlackoutEvent | null;
  next_prayer: NextPrayer | null;
  today: { energy_in_wh: number; energy_out_wh: number; blackout_count: number };
  settings: Settings;
  schedule: { profile_name: string; slots: ScheduleSlot[] };
}

/** One row of `device_readings`: what the ESP32 sends for the Uji Generator page. */
export interface DeviceReading {
  id: number;
  ts: string;
  device_id: string;
  gen_voltage: number;
  /** Ampere; 0 when the generator has no load or the sketch did not send it. */
  gen_current: number;
  /** Watt, gen_voltage × gen_current computed by the server. */
  gen_power: number;
  rssi: number | null;
}

export interface DeviceLatestResponse {
  reading: DeviceReading | null;
  online: boolean;
  last_seen: string | null;
  /** Lets the browser count "x detik lalu" on the server clock, not its own. */
  server_time: string;
}

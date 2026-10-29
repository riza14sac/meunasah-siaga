import { randomUUID } from "node:crypto";
import type { Client, InStatement, ResultSet, Row } from "@libsql/client";
import type { PrayerKey, Priority, ScheduleProfile, ScheduleProfileDto, ScheduleSlot } from "./types";
import { bool, num, str } from "./db";
import { HttpError, ValidationError } from "./http";
import {
  DEFAULT_PROFILE_NAME,
  DEFAULT_SLOTS,
  PRAYER_KEYS,
  PRIORITIES,
  isDaylightPrayer,
  prayerLabel,
  slotOf,
} from "./prayer";
import { TIME_RE, optionalNumberField, optionalTextField, textField, type Body } from "./validate";

export const ACTIVE_PROFILE_SQL = "SELECT id, name FROM schedule_profiles WHERE active = 1 LIMIT 1";
export const ACTIVE_SLOTS_SQL = `SELECT prayer, time, priority, lamp_pct, target_min FROM schedule_slots
  WHERE profile_id = (SELECT id FROM schedule_profiles WHERE active = 1 LIMIT 1)`;

export interface ActiveSchedule {
  id: string | null;
  name: string;
  slots: ScheduleSlot[];
}

function toSlot(r: Row): ScheduleSlot {
  return {
    prayer: str(r.prayer) as PrayerKey,
    time: str(r.time),
    priority: str(r.priority) as Priority,
    lamp_pct: num(r.lamp_pct),
    target_min: num(r.target_min),
  };
}

function inPrayerOrder(slots: ScheduleSlot[]): ScheduleSlot[] {
  return PRAYER_KEYS.map((key) => slotOf(slots, key));
}

/** Builds the active schedule from ACTIVE_PROFILE_SQL and ACTIVE_SLOTS_SQL results. */
export function toActiveSchedule(profile: ResultSet, slots: ResultSet): ActiveSchedule {
  const row = profile.rows[0];
  if (!row) return { id: null, name: DEFAULT_PROFILE_NAME, slots: [...DEFAULT_SLOTS] };
  return { id: str(row.id), name: str(row.name), slots: inPrayerOrder(slots.rows.map(toSlot)) };
}

export async function getActiveSchedule(db: Client): Promise<ActiveSchedule> {
  const [profile, slots] = await db.batch([ACTIVE_PROFILE_SQL, ACTIVE_SLOTS_SQL], "read");
  return toActiveSchedule(profile, slots);
}

export async function listProfiles(db: Client): Promise<ScheduleProfile[]> {
  const [profiles, slots] = await db.batch(
    [
      "SELECT id, name, active FROM schedule_profiles ORDER BY created_at, name",
      "SELECT profile_id, prayer, time, priority, lamp_pct, target_min FROM schedule_slots",
    ],
    "read"
  );
  return profiles.rows.map((p) => ({
    id: str(p.id),
    name: str(p.name),
    active: bool(p.active),
    slots: inPrayerOrder(slots.rows.filter((s) => s.profile_id === p.id).map(toSlot)),
  }));
}

type SlotPatch = Partial<Omit<ScheduleSlot, "prayer">>;

function parseSlotPatch(key: PrayerKey, raw: unknown): SlotPatch {
  const label = prayerLabel(key);
  if (typeof raw === "string") {
    if (!TIME_RE.test(raw)) throw new ValidationError(`Jam ${label} harus berformat HH:MM`);
    return { time: raw };
  }
  if (!raw || typeof raw !== "object") throw new ValidationError(`Data ${label} tidak valid`);

  const body = raw as Body;
  const patch: SlotPatch = {};
  if (body.time !== undefined) {
    if (typeof body.time !== "string" || !TIME_RE.test(body.time)) {
      throw new ValidationError(`Jam ${label} harus berformat HH:MM`);
    }
    patch.time = body.time;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority as Priority)) {
      throw new ValidationError(`Prioritas ${label} harus rendah, sedang, atau tinggi`);
    }
    patch.priority = body.priority as Priority;
  }
  const pct = optionalNumberField(body, "lamp_pct", { min: 0, max: 80, integer: true, label: `Lampu ${label}`, unit: "%" });
  if (pct !== undefined) patch.lamp_pct = pct;
  const target = optionalNumberField(body, "target_min", {
    min: 0,
    max: 180,
    integer: true,
    label: `Target ${label}`,
    unit: "menit",
  });
  if (target !== undefined) patch.target_min = target;
  return patch;
}

/** Accepts `slots` as an array or keyed object, plus the flat `subuh: "04:45"` fields older screens send. */
function parseSlotPatches(body: Body): Partial<Record<PrayerKey, SlotPatch>> {
  const patches: Partial<Record<PrayerKey, SlotPatch>> = {};
  const merge = (key: PrayerKey, patch: SlotPatch) => {
    patches[key] = { ...patches[key], ...patch };
  };

  for (const key of PRAYER_KEYS) {
    if (body[key] !== undefined) merge(key, parseSlotPatch(key, body[key]));
  }

  const slots = body.slots;
  if (Array.isArray(slots)) {
    for (const item of slots) {
      const prayer = (item as Body | null)?.prayer;
      if (!PRAYER_KEYS.includes(prayer as PrayerKey)) throw new ValidationError("Nama waktu shalat tidak dikenal");
      merge(prayer as PrayerKey, parseSlotPatch(prayer as PrayerKey, item));
    }
  } else if (slots && typeof slots === "object") {
    for (const key of PRAYER_KEYS) {
      const value = (slots as Body)[key];
      if (value !== undefined) merge(key, parseSlotPatch(key, value));
    }
  } else if (slots !== undefined) {
    throw new ValidationError("Format slots tidak valid");
  }
  return patches;
}

function applySlotPatches(base: readonly ScheduleSlot[], patches: Partial<Record<PrayerKey, SlotPatch>>): ScheduleSlot[] {
  return PRAYER_KEYS.map((key) => {
    const merged: ScheduleSlot = { ...slotOf(base, key), ...patches[key], prayer: key };
    // Lamps are never lit for Zuhur and Ashar, so their lamp settings are fixed.
    return isDaylightPrayer(key) ? { ...merged, priority: "rendah", lamp_pct: 0, target_min: 0 } : merged;
  });
}

function slotWrites(profileId: string, slots: ScheduleSlot[]): InStatement[] {
  return slots.map((s) => ({
    sql: `INSERT INTO schedule_slots (profile_id, prayer, time, priority, lamp_pct, target_min) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (profile_id, prayer) DO UPDATE SET time = excluded.time, priority = excluded.priority,
            lamp_pct = excluded.lamp_pct, target_min = excluded.target_min`,
    args: [profileId, s.prayer, s.time, s.priority, s.lamp_pct, s.target_min],
  }));
}

export async function createProfile(db: Client, body: Body): Promise<ScheduleProfile> {
  const name = textField(body, "name", { label: "Nama jadwal", max: 40 });
  const slots = applySlotPatches(DEFAULT_SLOTS, parseSlotPatches(body));
  const active = body.active === true;
  const id = randomUUID();

  await db.batch(
    [
      ...(active ? ["UPDATE schedule_profiles SET active = 0"] : []),
      {
        sql: "INSERT INTO schedule_profiles (id, name, active, created_at) VALUES (?, ?, ?, ?)",
        args: [id, name, active ? 1 : 0, new Date().toISOString()],
      },
      ...slotWrites(id, slots),
    ],
    "write"
  );
  return { id, name, active, slots };
}

export async function updateProfile(db: Client, id: string, body: Body): Promise<ScheduleProfile> {
  const current = (await listProfiles(db)).find((p) => p.id === id);
  if (!current) throw new HttpError(404, "Jadwal tidak ditemukan");

  const name = optionalTextField(body, "name", { label: "Nama jadwal", max: 40 });
  if (name === null) throw new ValidationError("Nama jadwal tidak boleh kosong");
  if (body.active === false && current.active) {
    throw new ValidationError("Jadikan jadwal lain aktif terlebih dahulu");
  }
  const patches = parseSlotPatches(body);
  const slots = applySlotPatches(current.slots, patches);
  const activate = body.active === true && !current.active;

  const writes: InStatement[] = [];
  if (name !== undefined) writes.push({ sql: "UPDATE schedule_profiles SET name = ? WHERE id = ?", args: [name, id] });
  if (activate) {
    writes.push("UPDATE schedule_profiles SET active = 0", { sql: "UPDATE schedule_profiles SET active = 1 WHERE id = ?", args: [id] });
  }
  if (Object.keys(patches).length > 0) writes.push(...slotWrites(id, slots));
  if (writes.length > 0) await db.batch(writes, "write");

  return { id, name: name ?? current.name, active: current.active || activate, slots };
}

export async function deleteProfile(db: Client, id: string): Promise<void> {
  const res = await db.execute({ sql: "SELECT active FROM schedule_profiles WHERE id = ?", args: [id] });
  const row = res.rows[0];
  if (!row) throw new HttpError(404, "Jadwal tidak ditemukan");
  if (bool(row.active)) throw new ValidationError("Tidak bisa menghapus jadwal yang sedang aktif");
  await db.batch(
    [
      { sql: "DELETE FROM schedule_slots WHERE profile_id = ?", args: [id] },
      { sql: "DELETE FROM schedule_profiles WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

/** API shape: the slots plus the flat prayer times that older screens read. */
export function profileDto(profile: ScheduleProfile): ScheduleProfileDto {
  const times = Object.fromEntries(profile.slots.map((s) => [s.prayer, s.time])) as Record<PrayerKey, string>;
  return { ...profile, ...times };
}

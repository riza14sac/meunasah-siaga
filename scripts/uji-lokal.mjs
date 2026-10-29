// Uji ujung-ke-ujung API Tahap 1 terhadap server LOKAL.
//
//   hapus data/local.db (skrip mengecek kondisi awal database yang kosong)
//   npm run build && npm run start -- -p 3100     (terminal 1)
//   npm run uji:lokal                              (terminal 2)
//
// Skrip ini mengisi database dengan data uji palsu (bacaan, pemadaman, sesi).
// Hapus data/local.db lagi sesudahnya supaya tidak tertukar dengan hasil uji asli.
// Sengaja menolak alamat selain localhost agar tidak mengisi data palsu ke web online.
const BASE = process.env.BASE ?? "http://localhost:3100";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`Ditolak: ${BASE} bukan server lokal.`);
  process.exit(1);
}
// Kunci dan PIN dibaca dari .env.local, sama dengan yang dipakai server.
try {
  process.loadEnvFile(".env.local");
} catch {}
const KEY = process.env.DEVICE_API_KEY;
const PIN = process.env.ADMIN_PIN;
if (!KEY || !PIN) {
  console.error("Isi DEVICE_API_KEY dan ADMIN_PIN di .env.local dulu (lihat .env.example).");
  process.exit(1);
}
let cookie = "";
let pass = 0;
let fail = 0;

async function call(method, path, { body, key, auth = false, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (key) h["x-api-key"] = key;
  if (auth && cookie) h["Cookie"] = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} :: ${(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 400)}`);
  }
}

const reading = (over = {}) => ({
  device_id: "ms-01",
  gen_voltage: 11.8,
  gen_current: null,
  bat_voltage: 3.92,
  bat_current: -0.42,
  bat_percent: 78,
  pln_on: true,
  lamp1_pct: 0,
  lamp2_pct: 0,
  rssi: -62,
  fw: "0.3.1",
  ...over,
});

/** ISO time of HH:MM WIB, `daysAgo` days before today (WIB). */
function wib(daysAgo, hhmm) {
  const offset = 7 * 3600e3;
  const dayStart = Math.floor((Date.now() + offset) / 86400e3) * 86400e3 - offset - daysAgo * 86400e3;
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(dayStart + h * 3600e3 + m * 60e3).toISOString();
}

console.log("1. Status awal");
let r = await call("GET", "/api/status");
check("status 200", r.status === 200, r);
check("mode default real", r.json?.mode === "real", r.json);
check("belum ada reading", r.json?.reading === null, r.json);
check("jadwal default Standar Kemenag", r.json?.schedule?.profile_name === "Standar Kemenag", r.json?.schedule);

console.log("2. Ingest: keamanan dan validasi");
r = await call("POST", "/api/ingest", { body: reading() });
check("tanpa api key -> 401", r.status === 401 && r.json?.error === "Kunci API salah", r.json);
r = await call("POST", "/api/ingest", { body: reading(), key: "salah" });
check("key salah -> 401", r.status === 401, r.json);
r = await call("POST", "/api/ingest", { body: "{bukan json", key: KEY });
check("JSON rusak -> 400", r.status === 400 && /JSON/.test(r.json?.error), r.json);
r = await call("POST", "/api/ingest", { body: reading({ gen_voltage: "abc" }), key: KEY });
check("gen_voltage teks -> 400", r.status === 400 && /^gen_voltage harus angka/.test(r.json?.error), r.json);
r = await call("POST", "/api/ingest", { body: reading({ bat_percent: 150 }), key: KEY });
check("bat_percent 150 -> 400", r.status === 400 && /^bat_percent/.test(r.json?.error), r.json);
r = await call("POST", "/api/ingest", { body: reading({ pln_on: "ya" }), key: KEY });
check("pln_on bukan boolean -> 400", r.status === 400 && /pln_on/.test(r.json?.error), r.json);
r = await call("POST", "/api/ingest", { body: reading({ ts: "2020-01-01T00:00:00Z" }), key: KEY });
check("ts terlalu lama -> 400", r.status === 400 && /^ts harus/.test(r.json?.error), r.json);
console.log("     contoh pesan:", r.json?.error);

console.log("3. Ingest: data valid");
r = await call("POST", "/api/ingest", { body: reading(), key: KEY });
check("gen_current null -> 200", r.status === 200, r);
check(
  "balasan berisi pengaturan ESP32",
  r.json && ["reserve_min", "max_brightness", "zone1_enabled", "zone2_enabled"].every((k) => k in r.json) && r.json.schedule?.length === 5,
  r.json
);
check("Zuhur tidak menyalakan lampu", r.json?.schedule?.find((s) => s.prayer === "zuhur")?.lamps === false, r.json?.schedule);
console.log("     balasan:", JSON.stringify(r.json));
const { gen_current: _omit, ...withoutGenCurrent } = reading();
r = await call("POST", "/api/ingest", { body: withoutGenCurrent, key: KEY });
check("tanpa field gen_current -> 200", r.status === 200, r);
r = await call("POST", "/api/ingest", { body: reading({ gen_current: 0.3, gen_voltage: 12.1 }), key: KEY });
check("gen_current 0,3 -> 200", r.status === 200, r);

r = await call("GET", "/api/status");
check("status menampilkan data terbaru", r.json?.reading?.gen_voltage === 12.1 && r.json?.reading?.gen_current === 0.3, r.json?.reading);
check("ESP32 online", r.json?.device?.online === true && r.json?.device?.device_id === "ms-01", r.json?.device);
check("daya pengisian = 3,92 × 0,42", Math.abs(r.json?.charge_power_w - 1.6464) < 1e-6, r.json?.charge_power_w);
check("daya turbin = 12,1 × 0,3", Math.abs(r.json?.turbine_power_w - 3.63) < 1e-6, r.json?.turbine_power_w);
check("energi hari ini terhitung", r.json?.today?.energy_in_wh > 0, r.json?.today);

r = await call("GET", "/api/device/config");
check("config tanpa key -> 401", r.status === 401, r.json);
r = await call("GET", "/api/device/config", { key: KEY });
check("config dengan key -> 200", r.status === 200 && r.json?.schedule?.length === 5, r.json);

console.log("4. PIN admin");
r = await call("GET", "/api/auth/pin");
check("awalnya bukan admin", r.json?.admin === false, r.json);
r = await call("POST", "/api/test-sessions", { body: { judul: "x" } });
check("buat sesi tanpa PIN -> 401 PIN_REQUIRED", r.status === 401 && r.json?.code === "PIN_REQUIRED", r.json);
r = await call("POST", "/api/auth/pin", { body: { pin: "000000" } });
check("PIN salah -> 401", r.status === 401 && r.json?.error === "PIN salah", r.json);
r = await call("POST", "/api/auth/pin", { body: { pin: PIN } });
check("PIN benar -> 200", r.status === 200 && r.json?.admin === true, r.json);
const setCookie = r.headers.get("set-cookie") ?? "";
check("cookie httpOnly + SameSite", /ms_admin=/.test(setCookie) && /HttpOnly/i.test(setCookie) && /SameSite=lax/i.test(setCookie), setCookie);
cookie = setCookie.split(";")[0];
r = await call("GET", "/api/auth/pin", { auth: true });
check("cookie dikenali sebagai admin", r.json?.admin === true, r.json);
r = await call("PATCH", "/api/settings", { body: { reserve_min: 25 }, headers: { Cookie: "ms_admin=palsu" } });
check("cookie palsu ditolak", r.status === 401, r.json);

console.log("5. Sesi pengujian");
r = await call("POST", "/api/test-sessions", {
  body: { judul: "Uji turbin kran penuh", kondisi: "kran wudhu dibuka penuh", tekanan_bar: 0.8, debit_lpm: 18.6, lokasi: "Lab Terpadu" },
  auth: true,
});
check("buat sesi -> 201", r.status === 201 && r.json?.id, r.json);
const sid = r.json?.id;
check("tanggal default = hari ini WIB", r.json?.tanggal === new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), r.json?.tanggal);
await call("POST", "/api/ingest", { body: reading({ gen_voltage: 10.5 }), key: KEY });
r = await call("GET", `/api/test-sessions/${sid}`);
check("sebelum Mulai rekam: 0 data", r.json?.summary?.count === 0, r.json?.summary);
r = await call("PATCH", `/api/test-sessions/${sid}`, { body: { action: "mulai" }, auth: true });
check("Mulai rekam", r.status === 200 && r.json?.recording === true, r.json);
for (const [v, a] of [[11.2, null], [11.8, 0.28], [12.4, 0.31]]) {
  r = await call("POST", "/api/ingest", { body: reading({ gen_voltage: v, gen_current: a }), key: KEY });
}
check("ingest selama rekam -> 200", r.status === 200, r);
r = await call("POST", `/api/test-sessions/${sid}/measurements`, {
  body: { gen_voltage: 12.0, arus_a: 0.3, beban: "LED 2 W", catatan: "multimeter" },
  auth: true,
});
check("input manual -> 201, daya otomatis 3,6 W", r.status === 201 && Math.abs(r.json?.daya_w - 3.6) < 1e-9, r.json);
r = await call("POST", `/api/test-sessions/${sid}/measurements`, { body: { gen_voltage: "12,0" }, auth: true });
check("input manual bukan angka -> 400", r.status === 400 && /^Tegangan harus angka/.test(r.json?.error), r.json);
r = await call("PATCH", `/api/test-sessions/${sid}`, { body: { action: "selesai" }, auth: true });
check("Selesai rekam", r.status === 200 && r.json?.recording === false && r.json?.ended_at, r.json);
await call("POST", "/api/ingest", { body: reading({ gen_voltage: 9.9 }), key: KEY });
r = await call("GET", `/api/test-sessions/${sid}`);
const s = r.json?.summary;
check("4 data (3 ESP32 + 1 manual); data setelah selesai tidak ikut", s?.count === 4 && s?.count_esp32 === 3 && s?.count_manual === 1, s);
check("ringkasan min/rata-rata/maks", s?.v_min === 11.2 && s?.v_max === 12.4 && Math.abs(s?.v_avg - 11.85) < 1e-9, s);
check("daya maks = 12,4 × 0,31", Math.abs(s?.p_max - 12.4 * 0.31) < 1e-9, s);
const esp32NoCurrent = r.json?.measurements?.find((m) => m.sumber === "esp32" && m.arus_a === null);
check("baris ESP32 tanpa gen_current: arus dan daya kosong", esp32NoCurrent && esp32NoCurrent.daya_w === null, r.json?.measurements);

r = await call("GET", `/api/test-sessions/${sid}/csv`);
check("CSV 200 + header", r.status === 200 && r.text.includes("waktu_wib,sumber,tegangan_v,arus_a,daya_w,beban,catatan"), r.text.slice(0, 200));
check(
  "CSV sebagai lampiran",
  /attachment; filename="pengujian-\d{4}-\d{2}-\d{2}-uji-turbin-kran-penuh\.csv"/.test(r.headers.get("content-disposition") ?? ""),
  r.headers.get("content-disposition")
);
check("CSV berisi 4 baris data", r.text.trim().split(/\r?\n/).length === 5, r.text);
console.log(r.text.replace(/^﻿/, "").trim().split(/\r?\n/).map((l) => `     ${l}`).join("\n"));

r = await call("GET", "/api/test-sessions?limit=1");
check("daftar sesi + ringkasan", r.json?.sessions?.[0]?.id === sid && r.json.sessions[0].summary.count === 4, r.json);
const manualId = (await call("GET", `/api/test-sessions/${sid}`)).json.measurements.find((m) => m.sumber === "manual").id;
r = await call("DELETE", `/api/test-sessions/${sid}/measurements/${manualId}`);
check("hapus baris tanpa PIN -> 401", r.status === 401, r.json);
r = await call("DELETE", `/api/test-sessions/${sid}/measurements/${manualId}`, { auth: true });
check("hapus baris dengan PIN", r.status === 200, r.json);
r = await call("GET", "/api/test-sessions/tidak-ada");
check("sesi tidak ada -> 404", r.status === 404 && /tidak ditemukan/.test(r.json?.error), r.json);

console.log("6. Pemadaman: buka/tutup otomatis dan hasilnya");
// Siang: 2 hari lalu 12:30–13:15
await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(2, "12:30"), bat_percent: 90 }), key: KEY });
await call("POST", "/api/ingest", { body: reading({ pln_on: true, ts: wib(2, "13:15"), bat_percent: 89 }), key: KEY });
// Bertahan: kemarin 18:47–19:52, lampu menyala
await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(1, "18:47"), bat_percent: 82 }), key: KEY });
for (const t of ["18:50", "19:10", "19:30", "19:50"]) {
  await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(1, t), bat_percent: 70, lamp1_pct: 60, lamp2_pct: 70 }), key: KEY });
}
await call("POST", "/api/ingest", { body: reading({ pln_on: true, ts: wib(1, "19:52"), bat_percent: 66 }), key: KEY });
// Gagal: 3 hari lalu 17:58–21:10, baterai habis 19:58
await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(3, "17:58"), bat_percent: 61 }), key: KEY });
await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(3, "18:40"), bat_percent: 30, lamp1_pct: 80, lamp2_pct: 80 }), key: KEY });
await call("POST", "/api/ingest", { body: reading({ pln_on: false, ts: wib(3, "19:58"), bat_percent: 0.5, lamp1_pct: 5, lamp2_pct: 5 }), key: KEY });
await call("POST", "/api/ingest", { body: reading({ pln_on: true, ts: wib(3, "21:10"), bat_percent: 3 }), key: KEY });
// Masih berlangsung sekarang
await call("POST", "/api/ingest", { body: reading({ pln_on: false, bat_percent: 77 }), key: KEY });

r = await call("GET", "/api/blackout-events");
const events = r.json?.events ?? [];
console.log(events.map((e) => `     ${e.start_time} → ${e.end_time ?? "berlangsung"} | ${e.outcome ?? "-"} | ${e.fail_reason ?? e.note ?? ""}`).join("\n"));
check("4 kejadian tercatat", events.length === 4, events);
const byOutcome = (o) => events.find((e) => e.outcome === o);
check("Siang", byOutcome("siang")?.note === "Siang hari, lampu tidak dinyalakan", events);
check("Bertahan sampai Isya", byOutcome("bertahan")?.note === "Lampu menyala sampai Isya selesai", events);
check("Gagal: Baterai habis 19:58, sebelum Isya selesai", byOutcome("gagal")?.fail_reason === "Baterai habis 19:58, sebelum Isya selesai", events);
const ongoing = events.find((e) => e.end_time === null);
check("pemadaman sekarang masih berlangsung", ongoing && ongoing.outcome === null, events);
r = await call("GET", "/api/status");
check("status: active_blackout + PLN padam", r.json?.active_blackout?.id === ongoing?.id && r.json?.reading?.pln_on === false, r.json);
check("status: pemadaman hari ini = 1", r.json?.today?.blackout_count === 1, r.json?.today);
r = await call("DELETE", `/api/blackout-events/${ongoing.id}`, { auth: true });
check("hapus pemadaman berlangsung -> 400", r.status === 400 && /masih berlangsung/.test(r.json?.error), r.json);
await call("POST", "/api/ingest", { body: reading({ pln_on: true, bat_percent: 77 }), key: KEY });
r = await call("DELETE", `/api/blackout-events/${byOutcome("siang").id}`, { auth: true });
check("hapus pemadaman yang selesai", r.status === 200, r.json);

console.log("7. Pengaturan dan jadwal");
r = await call("PATCH", "/api/settings", { body: { max_brightness: 90 }, auth: true });
check("kecerahan 90 -> 400", r.status === 400 && r.json?.error === "Kecerahan maksimum harus angka antara 0 dan 80 %", r.json);
r = await call("PATCH", "/api/settings", { body: { reserve_min: 30, zone2_enabled: false }, auth: true });
check("ubah pengaturan", r.status === 200 && r.json?.reserve_min === 30 && r.json?.zone2_enabled === false, r.json);
r = await call("POST", "/api/ingest", { body: reading(), key: KEY });
check("balasan ke ESP32 ikut berubah", r.json?.reserve_min === 30 && r.json?.zone2_enabled === false, r.json);
r = await call("POST", "/api/schedule-profiles", {
  body: { name: "Ramadan", subuh: "04:40", slots: [{ prayer: "zuhur", lamp_pct: 50 }, { prayer: "isya", lamp_pct: 70, target_min: 45 }] },
  auth: true,
});
check(
  "buat profil (format lama + slots), Zuhur tetap 0%",
  r.status === 201 && r.json?.subuh === "04:40" && r.json?.slots.find((x) => x.prayer === "zuhur").lamp_pct === 0 && r.json?.slots.find((x) => x.prayer === "isya").target_min === 45,
  r.json
);
const rid = r.json?.id;
r = await call("PATCH", `/api/schedule-profiles/${rid}`, { body: { active: true }, auth: true });
check("aktifkan profil", r.status === 200 && r.json?.active === true, r.json);
r = await call("GET", "/api/status");
check("status memakai profil aktif", r.json?.schedule?.profile_name === "Ramadan", r.json?.schedule);
r = await call("DELETE", `/api/schedule-profiles/${rid}`, { auth: true });
check("hapus profil aktif -> 400", r.status === 400, r.json);
await call("PATCH", "/api/schedule-profiles/standar-kemenag", { body: { active: true }, auth: true });
r = await call("DELETE", `/api/schedule-profiles/${rid}`, { auth: true });
check("hapus profil tidak aktif", r.status === 200, r.json);
r = await call("PATCH", "/api/schedule-profiles/standar-kemenag", { body: { maghrib: "25:00" }, auth: true });
check("jam tidak valid -> 400", r.status === 400 && /Maghrib harus berformat HH:MM/.test(r.json?.error), r.json);
await call("PATCH", "/api/settings", { body: { reserve_min: 20, zone2_enabled: true }, auth: true });

console.log("8. Catatan pemeliharaan dan grafik");
r = await call("POST", "/api/maintenance-notes", { body: { note: "Turbin dibersihkan" }, auth: true });
check("tambah catatan", r.status === 201, r.json);
r = await call("DELETE", `/api/maintenance-notes/${r.json?.id}`, { auth: true });
check("hapus catatan", r.status === 200, r.json);
r = await call("GET", "/api/readings?range=60m");
check("readings 60m (data mentah)", r.status === 200 && r.json?.points?.length > 0, r.json);
r = await call("GET", "/api/readings?range=7d");
check("readings 7d (ringkasan 5 menit)", r.status === 200 && r.json?.points?.length > 0, r.json);

console.log("9. Batas percobaan PIN");
for (let i = 0; i < 5; i++) await call("POST", "/api/auth/pin", { body: { pin: "999999" }, headers: { "x-forwarded-for": "10.9.9.9" } });
r = await call("POST", "/api/auth/pin", { body: { pin: PIN }, headers: { "x-forwarded-for": "10.9.9.9" } });
check("percobaan ke-6 -> 429 walau PIN benar", r.status === 429, r.json);

if (process.env.KEEP_SESSION !== "1") {
  console.log("10. Hapus sesi");
  r = await call("DELETE", `/api/test-sessions/${sid}`, { auth: true });
  check("hapus sesi", r.status === 200, r.json);
}

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);

# KONTEKS PROYEK — MEUNASAH-SIAGA

Kamu adalah asisten teknis untuk proyek kuliah **MEUNASAH-SIAGA** (Kelompok 07, TIK306). Baca konteks di bawah, lalu bantu saya menjawab pertanyaan seputar hardware, firmware ESP32, dashboard web, dan presentasi ke dosen. **Jangan mengarang angka atau fakta**; jika ada yang kurang, tanyakan dulu.

## 1. Ringkasan proyek
Dashboard untuk memantau **lampu darurat meunasah** yang ditenagai **turbin pikohidro F40** dan disimpan di **baterai 18650**. ESP32 membaca sensor dan mengirim data lewat WiFi ke dashboard Next.js yang di-deploy di Vercel.

- Nama: **MEUNASAH-SIAGA**
- Tim: **Kelompok 07 TIK306**
- Repo: `riza14sac/meunasah-siaga`
- Production: `https://meunasah-siaga.vercel.app`
- Stack: **Next.js 15 (App Router), React 19, TypeScript, Tailwind, libSQL/Turso, Vercel**
- Database lokal: `data/local.db`; production: **Turso**.

## 2. Halaman web
- `/` = **Beranda** (status sistem, baterai, PLN, energi, jadwal shalat, tren baterai 24 jam).
- `/uji-generator` = sekarang **Monitor Baterai** (V/A/W live, grafik, ringkasan, CSV).
- `/jadwal`, `/pengaturan`, `/riwayat`, `/riwayat/pengujian`, `/riwayat/pengujian/[id]`.
- API utama: `/api/ingest`, `/api/status`, `/api/device/latest`, `/api/device/readings`, `/api/device/export`, `/api/readings`, `/api/settings`, `/api/schedule-profiles`, `/api/blackout-events`, `/api/maintenance-notes`, `/api/test-sessions`, `/api/auth/pin`.

## 3. Hardware (yang benar-benar terpasang)
- **Turbin F40** pikohidro, nominal **9,8–18,5 V DC**.
- **INA219** (I2C 0x40) — **dipasang di jalur baterai, bukan di keluaran turbin**. Ini penting: data `gen_voltage`/`gen_current` sebenarnya adalah **tegangan/arus baterai**.
- **Modul cas** antara turbin dan baterai.
- **Modul powerbank 1S** untuk suplai **5 V USB** ke ESP32. Modul ini pernah rusak akibat insiden polaritas terbalik.
- **Baterai 18650**: holder 3 slot (desain 3S), tetapi pengukuran nyata **3,6–3,9 V = 1S**. Satu sel 18650; sel pernah drop sampai **0,8 V** (over-discharge).
- **LED strip 12 V 1,5 W**, MOSFET **IRLZ44N** (low-side), gate 220 Ω + pull-down 10 kΩ, **fuse 2 A**, saklar rocker.
- **PC817 + adaptor 5 V terisolasi** untuk deteksi PLN; **pushbutton** di GPIO0.
- **ESP32 DevKit** (board `ESP32 Dev Module`), USB serial **CH340** → **COM13**.
- I2C: **SDA GPIO21, SCL GPIO22**; `Wire.setClock(100000)`.
- ESP32 diberi daya dari **USB 5 V modul powerbank**, bukan langsung dari baterai.
- Ground sistem disatukan; sisi PC817 terisolasi.
- **Tidak ada BMS/fuse yang jelas** pada baterai; wiring banyak sambungan terbuka/longgar.

Alur hardware:
```
Turbin F40 → Modul Cas → Baterai 18650 (1S) → Beban (ESP32 + LED 12 V)
                                  ↑
                              INA219 (V/I baterai)
ESP32 → WiFi → Vercel → Dashboard
```

Insiden: sel tengah 18650 pernah dipasang terbalik (**-+** seharusnya **+-**) → polaritas balik → modul powerbank/modul cas rusak, ESP32 sempat hidup lalu mati, baterai over-discharge.

## 4. Firmware ESP32
### Sketch yang dipakai sekarang
`firmware/esp32_tegangan_generator/esp32_tegangan_generator.ino`

- Mengirim **payload ringkas** tiap 2 detik:
```json
{"device_id":"ms-01","gen_voltage":3.84,"gen_current":0.0144,"rssi":-35}
```
- INA219 0x40, SDA21/SCL22, rata-rata 200 ms, kirim ke `https://meunasah-siaga.vercel.app/api/ingest` dengan header `x-api-key`.
- Versi baru sudah memakai **filter**:
  - `V_MIN=2.5`, `V_MAX=4.3` (1S), `I_MIN=-5`, `I_MAX=5`
  - tolak lonjakan >0,5 V atau >1 A per 200 ms
  - reinit I2C setelah 20 sampel jelek
- **Nama field tetap `gen_*`** agar API tidak berubah, meskipun isinya baterai.
- Board: **ESP32 Dev Module**; core **esp32 by Espressif 3.3.12**; library **Adafruit INA219 1.2.3** + **Adafruit BusIO 1.17.4**.

### Sketch lengkap (belum dipakai)
`firmware/esp32_contoh/esp32_contoh.ino` mengirim payload lengkap: `bat_voltage`, `bat_current`, `bat_percent`, `pln_on`, `lamp1_pct`, `lamp2_pct`, `fw`; tegangan generator lewat ADC GPIO34; INA219 baterai 0x40; **arus negatif = mengisi**.

## 5. Alur data web (penting)
- `/api/ingest` memilih jalur:
  - **Payload ringkas** (tanpa `bat_voltage`/`bat_percent`/`pln_on`) → `insertDeviceReading` → tabel **`device_readings`** → halaman **Monitor Baterai**.
  - **Payload lengkap** → `ingestReading` → tabel **`readings`** + `stats_5min` + `blackout_events` + `test_measurements`.
- `/api/status` (`getStatus`) membaca `readings`, `device_status`, `stats_5min`, dll. Jika `readings` kosong, ia **fallback** ke `device_readings` terakhir dan memberi `data_source: "generator-only"`.
- **Beranda** memakai `data_source`:
  - `"full"` → data baterai/PLN/energi lengkap.
  - `"generator-only"` → **mode ringkas**: hanya tegangan baterai yang tampil; persentase, daya pengisian, energi, PLN, kecerahan lampu tampil **"—"**.
  - Karena firmware sekarang mengirim payload ringkas, **Beranda memang tidak berubah banyak** saat pengujian. Data live ada di **Monitor Baterai**.
- CSV: `waktu;tegangan_baterai_V;arus_baterai_mA;daya_baterai_mW;rssi_dBm`; nama file `monitor-baterai-YYYYMMDD-HHmm.csv`.

## 6. Hasil pengujian terakhir (27 Nov 2026)
- Periode: **21:14–22:33 WIB**, **566 sampel**.
- Tegangan normal: **3,6–3,9 V** (1S). Nilai aneh lama: **8,352 V / 0,39 V** (glitch INA219, sudah difilter firmware baru).
- Arus: **idle 12–15 mA**; beban lampu maksimum **234,2 mA**.
- Daya: idle **±50 mW**; beban maksimum **853,9 mW**.
- **Arus pengisian tidak terdeteksi**: tidak ada arus negatif yang bertahan; hanya noise **−2 mA**.
- Data terakhir: **22:33:03 WIB · 3,777 V / 13,0 mA / 49,1 mW · RSSI −51**.
- Perangkat **offline** setelah itu.
- Gap data: **110 detik, 219 detik, 14 menit, 36 menit** → perangkat sering putus.

## 7. Masalah & diagnosis saat ini
1. **Pengisian baterai belum terbukti/terdeteksi.**
   - Arus selalu positif (discharge), tegangan tidak naik.
   - Dugaan: modul cas rusak akibat polaritas terbalik, atau **INA219 tidak berada di jalur cas** (hanya mengukur jalur beban), atau output turbin tidak sampai ke modul cas.
2. **Baterai 1S vs desain 3S.**
   - Diagram memakai 3S (11,1–12,6 V), tetapi alat nyata **1S (±3,8 V)**.
   - LED 12 V jadi kurang optimal; modul powerbank 1S tidak cocok untuk 3S.
3. **Tidak ada BMS/fuse** → risiko over-discharge (sel pernah 0,8 V) dan polaritas balik.
4. **Wiring longgar/terbuka** → INA219 sempat membaca 8,352 V/0,39 V dan data sering putus.
5. **Beranda tidak berubah** karena payload ringkas; bukan bug web.
6. **Kunci API pernah terekspos** (docs/chat) → harus di-rotate.

## 8. Keputusan yang sudah diambil
- Wiring tetap: **INA219 di baterai**.
- Halaman `/uji-generator` di-rename menjadi **Monitor Baterai**; label/badge disesuaikan (Baterai mengisi/dipakai/tidak ada arus).
- **Tidak mengubah nama field API/firmware** (`gen_*` tetap) agar kompatibel.
- Firmware ditambah filter validasi.
- Deploy otomatis ke Vercel setiap push ke `main`.
- Jangan mengklaim pengisian berhasil sebelum ada bukti arus negatif/kenaikan tegangan.

## 9. Yang saya butuhkan dari Gemini
Bantu saya:
1. Mendiagnosis **kenapa pengisian tidak terdeteksi** dari data/wiring di atas.
2. Menentukan **penempatan INA219** yang benar untuk mengukur arus cas dan arus beban.
3. Memilih solusi **1S vs 3S** (BMS, charger, boost 5 V/12 V, LED).
4. Menyusun **langkah uji hardware** yang aman (multimeter, air mati/nyala, lampu mati).
5. Menyiapkan **penjelasan singkat ke dosen** tentang alat, kendala, dan rencana perbaikan.
6. (Opsional) Membantu merancang **Beranda versi lengkap** dengan payload baterai/PLN.

## 10. Catatan keamanan
Jangan meminta/menuliskan kunci API, password WiFi, atau token. Gunakan placeholder. Sel Li-ion yang pernah 0,8 V / polaritas balik **jangan dicas ulang**; ganti dan tangani sebagai limbah elektronik.

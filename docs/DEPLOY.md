# Panduan Deploy MEUNASAH-SIAGA (Vercel + Turso)

Hasil akhirnya: dashboard bisa dibuka siapa saja di `https://<nama-proyek>.vercel.app`, dan ESP32
mengirim data ke `https://<nama-proyek>.vercel.app/api/ingest`. Semua orang bisa **melihat** data;
untuk **mengubah atau menghapus** data, web meminta PIN admin sekali per perangkat.

Waktu yang dibutuhkan: sekitar 30 menit untuk pertama kali.

---

## 0. Yang perlu disiapkan

- Akun **GitHub**, **Vercel**, dan **Turso**. Vercel dan Turso bisa didaftar dengan "Continue with GitHub".
  Paket gratis keduanya cukup untuk demo dan pengujian.
- Di laptop: **Node.js 20** atau lebih baru, dan **Git**.

## 1. Siapkan dua nilai rahasia

| Nama | Isi | Cara membuat |
|---|---|---|
| `DEVICE_API_KEY` | kunci yang dikirim ESP32 | `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` |
| `ADMIN_PIN` | PIN untuk ubah/hapus data di web | 6 angka, jangan `123456` |

Simpan keduanya di tempat aman. Jangan ditempel di grup chat.

## 2. Buat database Turso

**Lewat dashboard (paling mudah):**

1. Buka <https://app.turso.tech>, lalu **Create Database**. Beri nama `meunasah-siaga`,
   pilih lokasi yang paling dekat dengan Indonesia.
2. Buka database tersebut, salin **URL** (diawali `libsql://`). Ini `TURSO_DATABASE_URL`.
3. Buat token (**Create Token**, izin baca-tulis). Ini `TURSO_AUTH_TOKEN`.

**Atau lewat Turso CLI:**

```bash
turso auth login
turso db create meunasah-siaga
turso db show meunasah-siaga --url      # TURSO_DATABASE_URL
turso db tokens create meunasah-siaga   # TURSO_AUTH_TOKEN
```

Tabel dibuat otomatis saat web pertama kali dibuka. Tidak perlu menjalankan SQL apa pun.

## 3. (Disarankan) Coba dulu di laptop

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>. Salin `.env.example` menjadi `.env.local` dan isi `DEVICE_API_KEY` serta
`ADMIN_PIN` dengan nilai kalian sendiri; database tersimpan di `data/local.db`. Untuk mencoba langsung ke Turso, tambahkan `TURSO_DATABASE_URL` dan
`TURSO_AUTH_TOKEN` ke `.env.local`.

## 4. Unggah kode ke GitHub

Folder proyek belum menjadi repo Git. Jalankan di folder `meunasah-siaga-dashboard`:

```bash
git init
git add .
git commit -m "Dashboard MEUNASAH-SIAGA"
```

Buat repo baru di <https://github.com/new> (boleh private), lalu:

```bash
git remote add origin https://github.com/<akun>/meunasah-siaga-dashboard.git
git branch -M main
git push -u origin main
```

`.gitignore` sudah mengecualikan `node_modules`, `.next`, database lokal, dan `.env.local`,
jadi rahasia tidak ikut terunggah.

## 5. Deploy di Vercel

1. Di <https://vercel.com/new>, pilih **Import** pada repo tadi. Framework terdeteksi otomatis
   sebagai Next.js; biarkan pengaturan build bawaan.
2. Buka **Environment Variables**, isi keempat variabel:
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEVICE_API_KEY`, `ADMIN_PIN`.
3. Tekan **Deploy** dan tunggu sekitar 2 menit. Vercel memberi alamat `https://<nama-proyek>.vercel.app`.
4. Disarankan: **Settings → Functions → Function Region**, pilih Singapore (`sin1`) supaya dekat
   dengan Indonesia, lalu **Redeploy**.

Setiap `git push` ke cabang `main` akan otomatis men-deploy ulang.

## 6. Uji kiriman data dengan curl

Ganti `<nama-proyek>` dan `<DEVICE_API_KEY>`:

```bash
curl -X POST https://<nama-proyek>.vercel.app/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: <DEVICE_API_KEY>" \
  -d '{"device_id":"ms-01","gen_voltage":11.8,"gen_current":null,"bat_voltage":3.92,"bat_current":-0.42,"bat_percent":78,"pln_on":true,"lamp1_pct":0,"lamp2_pct":0,"rssi":-62,"fw":"0.3.1"}'
```

Di PowerShell (Windows):

```powershell
$body = @{ device_id="ms-01"; gen_voltage=11.8; gen_current=$null; bat_voltage=3.92; bat_current=-0.42;
  bat_percent=78; pln_on=$true; lamp1_pct=0; lamp2_pct=0; rssi=-62; fw="0.3.1" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://<nama-proyek>.vercel.app/api/ingest" `
  -Headers @{ "x-api-key" = "<DEVICE_API_KEY>" } -ContentType "application/json" -Body $body
```

Balasannya berisi pengaturan untuk ESP32 (`reserve_min`, `max_brightness`, `zone1_enabled`,
`zone2_enabled`, `auto_dim`, `deep_sleep`, `adzan`, `schedule`). Buka Beranda: bagian atas
menampilkan "ESP32 terhubung". `gen_current` boleh `null` atau tidak dikirim sampai sensor arus
generator dipasang.

## 7. Hubungkan ESP32

Buka `firmware/esp32_contoh/esp32_contoh.ino` di Arduino IDE, isi `WIFI_SSID`, `WIFI_PASS`, `SERVER_URL`, dan
`DEVICE_API_KEY`, lalu upload. Serial Monitor (115200) menampilkan `POST 200: {...}` setiap 5 detik.

ESP32 bisa memakai WiFi meunasah atau hotspot HP. Jika tidak ada data lebih dari 30 detik,
dashboard menampilkan "ESP32 terputus · terakhir terlihat HH:MM".

## 8. Alur pengujian alat saat demo

1. Buka **Riwayat → Pengujian Alat → Sesi baru**. Isi judul, kondisi (mis. "kran wudhu dibuka penuh"),
   tekanan dan debit bila diukur.
2. Tekan **Mulai rekam**. Web meminta PIN admin sekali di perangkat itu.
3. Buka kran. Setiap data ESP32 yang masuk selama perekaman tercatat di sesi tersebut.
4. Tambahkan hasil multimeter lewat form **Tambah pengukuran multimeter** (V, A, beban, catatan).
5. Tekan **Selesai rekam**, lalu **Unduh CSV** bila perlu dilampirkan di laporan.

Sesi pengujian selalu tampil apa adanya, baik di Mode Real maupun Simulasi, dan data simulasi
tidak pernah masuk ke sesi pengujian. Beranda menampilkan kartu "Pengujian alat terakhir" yang
menautkan ke hasil terbaru.

## Masalah yang sering muncul

| Gejala | Penyebab dan solusi |
|---|---|
| `401 API key tidak valid` | Header `x-api-key` salah atau tidak dikirim. Samakan dengan `DEVICE_API_KEY` di Vercel. |
| `503 DEVICE_API_KEY belum diatur` | Variabel belum diisi di Vercel. Isi, lalu **Redeploy**. |
| Web error "TURSO_DATABASE_URL belum diatur" | Variabel Turso belum diisi atau salah ketik. Isi, lalu **Redeploy**. |
| `400 ... harus angka antara ...` | Nilai dari ESP32 di luar batas. Pesan error menyebut kolom mana yang salah. |
| `429 Terlalu banyak percobaan PIN` | PIN salah 5 kali dari jaringan yang sama. Tunggu 15 menit. |
| PIN diminta lagi di semua perangkat | `ADMIN_PIN` atau `DEVICE_API_KEY` diganti. Ini disengaja. |

## Catatan kuota

ESP32 yang mengirim tiap 5 detik menghasilkan sekitar 17.000 permintaan per hari. Untuk demo dan
pengujian, paket gratis Vercel dan Turso cukup. Untuk alat yang menyala terus berbulan-bulan, pantau
halaman **Usage** di Vercel dan Turso. Jika interval kirim diperpanjang, jaga tetap di bawah 30 detik
supaya status tidak tampil "terputus".

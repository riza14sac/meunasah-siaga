# Rencana Kerja Dashboard MEUNASAH-SIAGA

Urutan mengikuti tenggat demo ke dosen: hasil pengujian alat harus tampil di web online lebih dulu,
perombakan tampilan menyusul. Setiap tahap ditutup dengan `npx tsc --noEmit` dan `npm run build`.

Sumber gaya: `design-tokens.md` (wajib) dan gambar di `design/figma/` (referensi gaya, bukan piksel).

## Tahap 1: Cloud, koneksi ESP32, Hasil Pengujian Alat (selesai 25 Okt 2026)

- [x] Database: `@libsql/client` (Turso di cloud, `file:./data/local.db` di lokal), migrasi berversi otomatis.
- [x] Skema baru: `readings`, `blackout_events` (+ `outcome`, `fail_reason`), `system_settings`,
      `schedule_profiles` + `schedule_slots`, `maintenance_notes`, `test_sessions`, `test_measurements`,
      `device_status`, `stats_5min` (ringkasan per 5 menit), `auth_attempts`.
- [x] Semua perhitungan "hari ini" dan jadwal memakai WIB (Asia/Jakarta).
- [x] `POST /api/ingest` (x-api-key) dan `GET /api/device/config`, validasi + pesan Bahasa Indonesia.
- [x] Buka/tutup `blackout_events` otomatis dari `pln_on`, hitung hasil Bertahan/Gagal/Siang.
- [x] Data ESP32 ikut tercatat ke sesi pengujian yang sedang merekam.
- [x] PIN admin (cookie httpOnly, sekali per perangkat) untuk semua aksi ubah/hapus dari UI.
- [x] API + halaman Pengujian Alat: daftar sesi, buat sesi, Mulai/Selesai rekam, input manual,
      grafik V dan A, ringkasan min/rata-rata/maks, unduh CSV, hapus lewat dialog konfirmasi.
- [x] Tab [Pemadaman] [Pengujian Alat] di Riwayat dan kartu "Pengujian alat terakhir" di Beranda.
- [x] Hapus mesin simulasi lama berbasis `setInterval` (tidak jalan di Vercel); mode default Real.
- [x] Token di `tailwind.config.ts`, efek kaca dan mode gelap dimatikan, alias warna lama sementara.
- [x] `.env.example`, `docs/DEPLOY.md`, `firmware/esp32_contoh/esp32_contoh.ino`.

Verifikasi: `tsc --noEmit` dan `npm run build` lolos; `npm run uji:lokal` 73/73 lulus; halaman utama
tanpa scroll horizontal di 390 px; tidak ada kode hex di `src/`.

Belum di Tahap 1: deploy sungguhan ke Vercel/Turso (butuh akun tim), sketch ESP32 belum dicoba di alat,
`postcss` di dalam Next masih punya advisory (perbaikannya butuh Next 16), `data/meunasah-siaga.db`
lama belum dihapus.

## Tahap 2: Token di seluruh aplikasi, Beranda, Turbin

- [ ] Layout: konten maks 440 px di HP + bottom nav 5 tab (Beranda, Turbin, Darurat, Riwayat, Atur);
      sidebar di desktop, kartu grid 2-3 kolom, teks naik satu tingkat.
- [ ] Beranda: header gradien, kartu baterai (cincin + estimasi + pill cukup/tidak), 3 kartu status,
      energi per jam Masuk vs Terpakai, waktu shalat berikutnya, pengujian alat terakhir.
- [ ] Turbin: status Berputar/Diam, cincin daya, tile data asli + tile opsional abu-abu,
      grafik 60 menit, sesi wudhu hari ini, kartu titik pasang (tanpa pilihan kran).

## Tahap 3: Darurat, Riwayat Pemadaman, Atur, Jadwal Shalat

- [ ] Darurat (token `night`): banner, cincin kecerahan, bertahan hingga vs Isya selesai,
      rencana kecerahan, zona lampu, speaker adzan (nonaktif).
- [ ] Riwayat Pemadaman: filter 7/30 hari, 3 statistik, grafik energi per hari, grafik baterai,
      daftar kejadian + geser untuk hapus + dialog + toast.
- [ ] Atur: saklar Real | Simulasi, slider ambang, fitur, perangkat, menu Jadwal dan Catatan pemeliharaan.
- [ ] Jadwal Shalat & Prioritas: chip profil, 5 waktu + prioritas, kartu cara kerja, CRUD profil.

## Tahap 4: Mode Simulasi, bersih-bersih

- [ ] Simulasi lazy per request mengikuti jam nyata, logika sama dengan firmware, `gen_current = null`.
- [ ] Tombol demo: Picu PLN padam, Pulihkan PLN, Baterai menipis.
- [ ] Hapus sisa fitur lama, alias warna lama, dependensi yang tidak terpakai.
- [ ] Bukti tidak ada hex di `*.tsx` (`#[0-9A-Fa-f]{6}`), uji 390 px tanpa scroll horizontal.

## Keputusan dan interpretasi

- Baris ESP32 di sesi uji: `arus_a = gen_current` (kosong bila sensor belum dipasang). Arus baterai
  tidak dipakai karena tegangan generator × arus baterai menghasilkan daya yang salah.
- Hasil pemadaman: Siang bila seluruh pemadaman jatuh antara Subuh selesai dan Maghrib; Gagal bila
  lampu padam, baterai habis, atau ESP32 berhenti mengirim saat lampu dibutuhkan; selain itu Bertahan.
- Balasan config ke ESP32 juga memuat `auto_dim`, `deep_sleep`, `adzan` supaya saklar di Atur sampai ke alat.
- `stats_5min` dipakai untuk energi dan grafik jangka panjang agar polling tidak membaca puluhan ribu
  baris di Turso (ESP32 mengirim ±17 ribu baris per hari).

# HANDOVER: Dashboard MEUNASAH-SIAGA

Kelompok 07 · per 29 Okt 2026 · Next.js 15, TypeScript, Tailwind, database libSQL
(lokal `data/local.db`, cloud Turso).

## Status fitur

- **Siap:** halaman Uji Generator (tegangan ESP32 tampil langsung), API ESP32 dengan kunci API,
  Pengujian Alat (sesi uji, input multimeter, grafik, CSV), riwayat pemadaman otomatis dari
  `pln_on`, PIN admin untuk semua aksi ubah/hapus.
- **Tampilan sementara:** Beranda, Riwayat, Jadwal, Atur. Sudah memakai warna baru, tapi tata
  letaknya belum mengikuti Figma.

## Menjalankan dari nol

```powershell
git clone <url-repo>
cd meunasah-siaga-dashboard
npm install
copy .env.example .env.local    # isi DEVICE_API_KEY dan ADMIN_PIN dengan nilai kalian sendiri
npm run dev:lan                 # server di port 3000, bisa dibuka dari HP di WiFi yang sama
```

Buka `http://localhost:3000/uji-generator`. Dari HP: `http://IP-LAPTOP:3000`. IP laptop ada di
`ipconfig`, bagian Wi-Fi → IPv4. Izinkan Node.js di Windows Firewall (jaringan Private).
Panduan lengkap ada di `docs/UJI_GENERATOR.md`.

## Uji tanpa ESP32 (PowerShell 5.1)

```powershell
curl.exe -i -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -H "x-api-key: ISI_KUNCI" -d '{\"device_id\":\"ms-01\",\"gen_voltage\":5.12,\"gen_current\":0.012,\"rssi\":-61}'
```

Hasil yang diharapkan:

- kunci benar → `200 {"ok":true,"id":...}`;
- tanpa kunci → `401`;
- `gen_voltage` berupa teks → `400`.

`npm run uji:lokal` menjalankan 73 uji API lengkap. Syaratnya: server jalan di port 3100 dengan
database kosong. Skrip ini menolak alamat selain localhost.

## Halaman

| Alamat | Isi |
| --- | --- |
| `/` | Beranda: status baterai, waktu shalat berikutnya, pengujian terakhir |
| `/uji-generator` | Tegangan langsung, arus/daya/sinyal, grafik 1/10/60 menit, ringkasan, Unduh CSV |
| `/riwayat`, `/riwayat/pengujian` | Riwayat pemadaman; sesi Pengujian Alat |
| `/jadwal`, `/pengaturan` | Jadwal shalat dan prioritas; pengaturan ambang dan PIN admin |

## Target demo Sabtu, 31 Okt: halaman Uji Generator

1. Upload `firmware/esp32_tegangan_generator` (INA219, kirim tiap 2 detik). Isi `WIFI_SSID`,
   `WIFI_PASS`, `SERVER_URL` (`http://IP-LAPTOP:3000/api/ingest`) dan `API_KEY`. `API_KEY`
   harus sama dengan `DEVICE_API_KEY`.
2. Jalankan `npm run dev:lan`, buka `/uji-generator`. Angka harus muncul ≤ 3 detik dan status
   berubah "Terputus" setelah 10 detik tanpa data.
3. Untuk penonton di luar WiFi, jalankan `cloudflared tunnel --url http://localhost:3000`.
   Alamatnya berubah tiap dijalankan, dan laptop harus tetap menyala.
4. Setelah pengujian, klik Unduh CSV (bisa langsung dibuka di Excel).

## Belum selesai

- Belum di-deploy ke Vercel + Turso (butuh akun tim). Langkahnya ada di `docs/DEPLOY.md`.
- Sketch belum dicoba di alat sungguhan. `firmware/esp32_contoh` (payload lengkap: baterai, PLN,
  lampu) masih memakai fungsi sensor contoh.
- Tahap 2–4 di `docs/RENCANA_KERJA.md`: Beranda/Turbin sesuai Figma, Darurat, Riwayat, Atur,
  saklar dan mesin Mode Simulasi, serta bersih-bersih alias warna lama.
- `npm audit` masih menyisakan advisory postcss bawaan Next (perlu Next 16).
- Saat `next dev` dibuka lewat IP, terminal menampilkan peringatan "Cross origin". Untuk sekarang
  aman diabaikan.

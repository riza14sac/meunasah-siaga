# Uji Generator: tegangan ESP32 tampil langsung di web

Panduan ini untuk menjalankan dashboard di laptop Windows, menerima data dari ESP32 + INA219,
dan membuka halaman **Uji Generator** dari HP atau dari internet.

ESP32 mengirim data tiap 2 detik ke `POST /api/ingest`:

```json
{"device_id":"ms-01","gen_voltage":5.123,"gen_current":0.0123,"rssi":-61}
```

`gen_voltage` dalam volt (0–30), `gen_current` dalam ampere (−5 sampai 5, boleh tidak dikirim,
dianggap 0), `rssi` dalam dBm (boleh tidak dikirim). Header `x-api-key` wajib berisi kunci API.

Sketch untuk Arduino IDE: `firmware/esp32_tegangan_generator/esp32_tegangan_generator.ino`
(library "Adafruit INA219"). Isi `WIFI_SSID`, `WIFI_PASS`, `SERVER_URL` (IP laptop dari langkah 3),
dan `API_KEY` (sama dengan `DEVICE_API_KEY`), lalu upload.

## 1. Isi `.env.local`

Di folder proyek, salin `.env.example` menjadi `.env.local`, lalu isi kunci API. Kunci ini harus
sama persis dengan yang ditulis di sketch ESP32.

```
DEVICE_API_KEY=isi-kunci-rahasia-kalian
```

Buat kunci acak dengan perintah ini, lalu tempel hasilnya:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

`.env.local` sudah masuk `.gitignore`, jadi tidak ikut ter-upload ke GitHub. Setiap kali isi
`.env.local` diubah, hentikan server (Ctrl+C) lalu jalankan lagi.

## 2. Jalankan server untuk jaringan lokal

```powershell
npm install
npm run dev:lan
```

Perintah ini membuka server di port 3000 untuk semua perangkat di WiFi yang sama.
Buka `http://localhost:3000/uji-generator` di laptop untuk memastikan halaman tampil.

## 3. Cari IP laptop

```powershell
ipconfig
```

Lihat bagian **Wireless LAN adapter Wi-Fi**, baris **IPv4 Address**, misalnya `192.168.1.10`.
Abaikan adapter lain (Ethernet, CloudflareWARP, VirtualBox).

Alamat ini yang dipakai:

- di sketch ESP32: `http://192.168.1.10:3000/api/ingest`
- di HP (WiFi yang sama): `http://192.168.1.10:3000/uji-generator`

IP bisa berubah kalau laptop pindah WiFi atau router dinyalakan ulang. Cek lagi sebelum demo.

## 4. Izinkan Node.js di Windows Firewall

Saat `npm run dev:lan` pertama kali dijalankan, Windows biasanya menampilkan jendela
"Windows Defender Firewall has blocked some features". Centang **Private networks**, lalu
**Allow access**.

Kalau jendela itu tidak muncul atau terlanjur ditolak:

1. Buka **Start → Windows Security → Firewall & network protection →
   Allow an app through firewall**.
2. Klik **Change settings**, cari **Node.js JavaScript Runtime**.
3. Centang kolom **Private** (boleh lebih dari satu baris Node.js), klik **OK**.
4. Pastikan WiFi laptop berprofil **Private**: **Settings → Network & internet → Wi-Fi →
   (nama WiFi) → Network profile type → Private network**.

Tes dari HP: buka `http://192.168.1.10:3000/uji-generator`. Kalau tidak terbuka padahal di laptop
bisa, hampir pasti firewall atau profil jaringan masih Public.

## 5. Uji tanpa ESP32 (PowerShell)

Pakai `curl.exe`, bukan `curl` (di PowerShell `curl` adalah alias perintah lain). Ganti kunci dengan
isi `DEVICE_API_KEY` kalian. Jalankan sambil membuka halaman Uji Generator; angkanya muncul dalam
2 detik.

Kunci benar, balasan `200 {"ok":true,"id":1}`:

```powershell
curl.exe -i -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -H "x-api-key: isi-kunci-rahasia-kalian" -d '{\"device_id\":\"ms-01\",\"gen_voltage\":5.123,\"gen_current\":0.0123,\"rssi\":-61}'
```

Tanpa kunci, balasan `401 {"error":"Kunci API salah"}`:

```powershell
curl.exe -i -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -d '{\"device_id\":\"ms-01\",\"gen_voltage\":5.123}'
```

Nilai salah (tegangan berupa teks), balasan `400 {"error":"gen_voltage harus angka antara 0 dan 30 V"}`:

```powershell
curl.exe -i -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -H "x-api-key: isi-kunci-rahasia-kalian" -d '{\"device_id\":\"ms-01\",\"gen_voltage\":\"abc\"}'
```

Tanda `\"` diperlukan karena Windows PowerShell 5.1 (bawaan Windows) membuang tanda kutip ganda saat
meneruskan teks ke `curl.exe`. Ketiga perintah di atas sudah dicoba di PowerShell 5.1. Kalau memakai
PowerShell 7 (`pwsh`), hapus semua garis miring terbalik: `-d '{"device_id":"ms-01","gen_voltage":5.123}'`.

Data juga bisa dicek langsung di browser:

- `http://localhost:3000/api/device/latest`: data terakhir dan status `online`
  (`true` bila data terakhir kurang dari 10 detik lalu).
- `http://localhost:3000/api/device/readings?minutes=10`: data 10 menit terakhir.
- `http://localhost:3000/api/device/export?minutes=60`: unduh CSV 60 menit terakhir.

## 6. Halaman Uji Generator

- Angka besar: tegangan terakhir (2 desimal). Status **Terhubung** (hijau) selama data terus
  masuk; berubah menjadi **Terputus · terakhir terlihat HH:MM:SS** setelah 10 detik tanpa data.
- Tiga kartu kecil: arus (mA), daya (mW, dihitung server = tegangan × arus), sinyal WiFi (dBm).
- Grafik tegangan dengan pilihan 1 / 10 / 60 menit, ringkasan min, rata-rata, maks, daya maks,
  dan jumlah data untuk rentang yang dipilih.
- **Unduh CSV**: file `uji-generator-YYYYMMDD-HHmm.csv` untuk rentang yang dipilih. Pemisah titik
  koma dan koma desimal, jadi langsung terbagi rapi per kolom di Excel berbahasa Indonesia.
- Halaman berhenti mengambil data saat tab tidak terlihat, dan lanjut lagi saat dibuka.

## 7. Buka dari internet dengan Cloudflare Quick Tunnel

Dipakai bila dosen atau anggota tim perlu membuka web dari luar WiFi yang sama. Tidak perlu akun
Cloudflare.

1. Pasang `cloudflared` sekali saja:

   ```powershell
   winget install --id Cloudflare.cloudflared
   ```

   Tutup lalu buka lagi PowerShell setelah memasang.

2. Pastikan `npm run dev:lan` sedang berjalan, lalu di jendela PowerShell kedua:

   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```

3. Tunggu baris berisi alamat seperti `https://kata-kata-acak.trycloudflare.com`. Bagikan alamat
   itu dan tambahkan `/uji-generator` di belakangnya.

Catatan:

- Alamat **berubah setiap kali** `cloudflared` dijalankan ulang. Kirim ulang alamat baru ke dosen.
- Laptop harus **tetap menyala dan terhubung internet**, serta `npm run dev:lan` dan `cloudflared`
  tetap berjalan. Matikan mode sleep laptop selama demo.
- ESP32 tetap mengirim ke IP lokal laptop (langkah 3), bukan ke alamat trycloudflare.
- Siapa pun yang tahu alamatnya bisa melihat halaman. Kirim data hanya dengan kunci API yang benar.

## Masalah umum

| Gejala | Penyebab dan solusi |
| --- | --- |
| "Belum ada data dari ESP32" | ESP32 belum mengirim. Cek Serial Monitor: WiFi tersambung? Kode balasan HTTP? |
| ESP32 dapat kode `-1` / connection refused | Alamat server salah atau firewall. Cek IP (langkah 3) dan firewall (langkah 4). |
| ESP32 dapat `401` | Kunci di sketch tidak sama dengan `DEVICE_API_KEY`, atau server belum dijalankan ulang setelah `.env.local` diubah. |
| ESP32 dapat `400` | Isi JSON salah. Pesan error di balasan menyebut kolom mana yang salah. |
| Status "Terputus" padahal ESP32 menyala | Lebih dari 10 detik tanpa data. Cek WiFi ESP32 dan Serial Monitor. |
| HP tidak bisa membuka `http://IP:3000` | Firewall, profil jaringan Public, atau HP tidak di WiFi yang sama. |

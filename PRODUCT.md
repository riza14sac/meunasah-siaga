# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pengurus meunasah (takmir) di kampung di Aceh adalah pengguna utama dan satu-satunya akun admin sistem (PRD non-goals: tidak ada login multi-user). Mereka belum tentu paham istilah teknis kelistrikan/elektronika, dan kemungkinan besar mengakses dashboard lewat ponsel, bukan laptop. Sekunder: tim developer/mahasiswa yang membangun proyek ini, memakai dashboard yang sama untuk kalibrasi ambang batas dan menguji skenario sebelum demo ke dosen.

## Product Purpose

Dashboard CRUD untuk MEUNASAH-SIAGA, sistem lampu darurat meunasah bertenaga pikohidro (energi dari aliran air wudhu) yang dikendalikan ESP32. Software ini memberi pengurus cara memantau status sistem dari jarak jauh — tanpa harus datang langsung ke meunasah untuk cek baterai atau riwayat lampu — dan mengubah ambang batas operasional tanpa flash ulang firmware. Sukses berarti pengurus bisa membaca kondisi sistem sekilas tanpa penjelasan teknis, dan tim developer bisa menguji logika keputusan sebelum hardware fisik selesai.

## Positioning

Mekanisme pembeda utamanya: dashboard punya dua mode data yang identik skema dan logikanya — mode Real (data sungguhan dari ESP32) dan mode Simulasi (generator internal yang meniru pola nyata: event wudhu mengikuti 5 waktu shalat, self-discharge baterai, pemadaman PLN acak yang bisa sengaja jatuh di waktu maghrib/isya, dan pengali kecepatan waktu). Ini bukan dashboard IoT generik — ritme lima waktu shalat adalah sumbu waktu nyata dalam datanya, bukan hiasan kalender.

## Operating Context

- Di-deploy ke Vercel dengan database Turso agar dosen dan pengurus bisa membuka dari mana saja; tetap bisa dijalankan lokal dengan file SQLite (`data/local.db`).
- ESP32 terhubung lewat WiFi lokal meunasah atau hotspot HP saat demo — jaringan kecil, tidak selalu stabil, bukan infrastruktur enterprise.
- Update data live lewat polling tiap 3-5 detik (bukan WebSocket).
- Lima waktu shalat (subuh, zuhur, ashar, maghrib, isya) adalah siklus harian nyata yang membentuk datanya dan yang dipahami pengguna secara intuitif — ini sumbu waktu utama di grafik tren, bukan sekadar label 24 jam generik.
- Toggle Real vs Simulasi adalah keputusan operasional yang harus terlihat jelas dan disengaja, karena menentukan apakah pengguna sedang melihat kondisi sungguhan meunasah atau demonstrasi.

## Capabilities and Constraints

- CRUD lengkap wajib (ketentuan mata kuliah): Create (profil jadwal shalat manual, catatan pemeliharaan), Read (status real-time, grafik tren 24 jam, riwayat pemadaman), Update (ambang cadangan energi, batas kecerahan maksimum, jadwal shalat), Delete (log pemadaman lama, catatan pemeliharaan tidak relevan lagi).
- Web publik untuk dilihat; semua aksi ubah/hapus wajib satu PIN admin (sekali per perangkat). Tanpa login multi-user, tanpa notifikasi push, tanpa app mobile terpisah — web responsif adalah satu-satunya permukaan, wajib penuh fungsi sampai ukuran layar ponsel.
- ESP32 mengirim data lewat `POST /api/ingest` (header `x-api-key`) dan menerima pengaturan di balasannya. Fitur "Hasil Pengujian Alat" menampilkan sesi uji turbin (data ESP32 + multimeter) untuk dosen.
- Catatan implementasi: backend memakai `@libsql/client` (Turso di cloud, file SQLite di laptop) dengan migrasi skema otomatis. Rencana kerja per tahap ada di `docs/RENCANA_KERJA.md`, panduan deploy di `docs/DEPLOY.md`.

## Brand Commitments

Tidak ada nama meunasah spesifik, logo, atau aset brand yang diberikan — ini proyek studi kasus mata kuliah untuk sistem generik "MEUNASAH-SIAGA", bukan instalasi nyata di satu meunasah tertentu. Asumsi: nama sistem ini dipakai apa adanya di UI (mis. header), tanpa wordmark/logo yang perlu didesain ulang.

## Evidence on Hand

- `PRD_MEUNASAH-SIAGA-Dashboard.md` — sumber kebenaran untuk fitur, skema data, dan alur API.
- Tidak ada data pengguna nyata, testimoni, atau aset demo lain di luar generator simulasi; grafik dan riwayat yang tampil saat demo berasal dari data sintetis mode simulasi, karena purwarupa fisik masih dalam proses.

## Product Principles

1. Sekali lihat, langsung paham — pengurus tanpa latar belakang teknis harus bisa membaca status sistem (aman/tidak, baterai cukup/tidak) tanpa istilah elektronika.
2. Real vs Simulasi selalu terlihat, tidak pernah tersembunyi — pengguna tidak boleh salah kira data demo sebagai kondisi sungguhan meunasah, atau sebaliknya.
3. Ritme lima waktu shalat adalah struktur asli data, bukan dekorasi — desain memakai ritme itu sebagai sumbu waktu, bukan grafik 24 jam generik yang mengabaikannya.
4. Andal dan tenang, bukan riuh — sistem ini soal keandalan cadangan energi darurat; UI mencerminkan itu, bukan gaya aplikasi konsumen yang ramai animasi.
5. Ponsel dulu — pengurus meunasah kemungkinan besar cek lewat HP, bukan laptop; setiap halaman harus penuh fungsi di layar kecil.

## Accessibility & Inclusion

Pengguna utama bukan orang teknis dan mengakses lewat ponsel yang kemungkinan bukan flagship dengan koneksi yang kadang tidak stabil — bahasa Indonesia sederhana tanpa jargon, target sentuh yang nyaman di layar kecil, dan kontras yang tetap terbaca di kondisi cahaya beragam (dalam meunasah, luar ruangan) adalah kebutuhan yang berasal langsung dari konteks pengguna, bukan checklist generik.

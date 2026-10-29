# MEUNASAH-SIAGA - Design Tokens

Sumber: file Figma "Prototype v3 - Hi-Fi (Final)". Nilai di bawah dibaca langsung dari layer asli
(layar 03 Mode Darurat, 06 Jadwal Shalat, 01c Beranda Mode Real), lalu dicocokkan dengan warna
di gambar layar v3. Warna utama keduanya sama persis.

Aturan untuk agent:
- Semua warna, font, radius, dan bayangan WAJIB dari file ini. Jangan menambah warna baru.
- Tidak ada glassmorphism / liquid glass / backdrop-blur. Kartu putih solid + bayangan tipis.
- Satu-satunya gradien adalah header hero (lihat `gradient-header`).
- Ikon: lucide-react, garis (outline), `strokeWidth={1.5}`. Tanpa emoji.
- Gambar di `design/figma/` adalah referensi gaya, bukan tata letak yang harus disalin persis.
  Ukuran di sini berasal dari layar HP lebar 440 px.

---

## 1. Warna

### Brand
| Token | Hex | Dipakai untuk |
|---|---|---|
| `primary` | `#0E9F8E` | tombol utama, tab navigasi aktif, ring baterai, bar grafik aktif, toggle ON |
| `primary-dark` | `#0B4F6C` | awal gradien header |
| `primary-soft` | `#E6F4F1` | latar ikon / chip bernuansa teal |
| `primary-muted` | `#0E9F8E` opacity 35% (tampil kira-kira `#AADDD7`) | bar grafik yang tidak aktif |
| `gradient-header` | `linear-gradient(135deg, #0B4F6C 0%, #0E9F8E 100%)` | header hero Beranda dan Detail Turbin (warna stop pasti, sudut 135deg perkiraan: gelap di kiri atas) |
| `on-header-chip` | `#FFFFFF` opacity 20% | chip "Mode Simulasi / Mode Real" di atas header |

### Status
| Token | Hex | Dipakai untuk |
|---|---|---|
| `warning` | `#F5A524` | lampu darurat "Siaga", ring Mode Darurat, bar energi terpakai, aksen Maghrib |
| `warning-soft` | `#FFF3DC` | latar badge / ikon kuning |
| `warning-text` | `#B7791F` | teks di atas `warning-soft` |
| `danger` | `#D93036` | banner PLN PADAM, tombol Hapus, label Gagal |
| `success` | `#22C55E` | titik status "Hidup" |
| `success-bright` | `#4ADE80` | indikator ON di latar gelap (Mode Darurat) |
| `success-soft` | `#E3F6EC` | latar badge "Bertahan" |
| `success-text` | `#15803D` | teks di atas `success-soft` |
| `info-soft` | `#E0EEFF` | latar ikon / badge biru |
| `info-text` | `#2F6FD6` | teks di atas `info-soft` |
| `purple-soft` | `#EFE7FF` | latar ikon / badge ungu |
| `purple-text` | `#6D28D9` | teks di atas `purple-soft` |

### Netral (tema terang)
| Token | Hex | Dipakai untuk |
|---|---|---|
| `bg` | `#F5F7FA` | latar halaman |
| `surface` | `#FFFFFF` | kartu |
| `surface-muted` | `#EEF1F5` | latar segmented control, track slider |
| `border` | `#E4E9F0` | garis pemisah, border kartu (kalau perlu) |
| `text` | `#0F1B2D` | judul dan angka utama |
| `text-secondary` | `#6B7A90` | label dan keterangan |
| `text-muted` | `#9FB0C7` | caption, label sumbu grafik |
| `icon` | `#9AA7B8` | ikon navigasi tidak aktif (stroke 1.5) |

### Tema gelap (khusus layar Mode Darurat / PLN padam)
| Token | Hex |
|---|---|
| `dark-bg` | `#0F1B2D` |
| `dark-surface` | `#17263D` |
| `dark-surface-2` | `#23324A` |
| `dark-border` | `#33445E` |
| `dark-text` | `#FFFFFF` |
| `dark-text-muted` | `#9FB0C7` |

---

## 2. Tipografi

Font: **Inter** (Google Fonts), bobot 400 / 500 / 600 / 700.

Skala yang dipakai di Figma (layar HP 440 px):

| Peran | Ukuran / bobot | Contoh |
|---|---|---|
| Display | 40 / Bold | "60%" di ring Mode Darurat |
| Angka hero | 28-30 / Bold | angka besar di kartu utama |
| Angka kartu | 22-24 / Bold | "3 j 20 mnt", "11,2 Wh" |
| Judul layar | 16-18 / Bold | "Riwayat & Analitik" |
| Judul kartu | 13-15 / Semi Bold | "Energi hari ini" |
| Body | 12-13 / Regular | keterangan |
| Label / chip | 11 / Medium atau Semi Bold | "Mode Simulasi", "Bertahan" |
| Caption / navigasi | 10 / Regular | label tab bawah, sumbu grafik |

Untuk web desktop, naikkan satu tingkat (body 14 px, label 12 px, judul halaman 22-24 px)
supaya tetap terbaca. Ini penyesuaian untuk web, tidak ada di Figma.

---

## 3. Radius sudut

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `radius-bar` | 3 px | batang grafik |
| `radius-sm` | 6-8 px | badge, chip kecil, input |
| `radius-md` | 12 px | tombol, kartu kecil (kartu status 3 kolom) |
| `radius-lg` | 16-20 px | kartu utama |
| `radius-xl` | 24 px | dialog konfirmasi, sheet |
| `radius-pill` | 9999 px | chip mode, toggle, segmented control |

---

## 4. Bayangan

| Token | Nilai CSS | Dipakai untuk |
|---|---|---|
| `shadow-card` | `0 6px 18px rgba(15, 28, 46, 0.08)` | semua kartu putih |
| `shadow-nav` | `0 -4px 16px rgba(15, 28, 46, 0.06)` | navigasi bawah (versi HP) |

Tidak ada blur latar, tidak ada glow.

---

## 5. Pola komponen dari Figma

- **Header hero**: gradien `gradient-header`, teks putih, nama musholla + lokasi, chip mode di kanan.
- **Kartu ringkasan baterai**: ring progres `primary` (persen baterai) + estimasi lama lampu menyala.
- **Kartu status 3 kolom**: Status PLN, Daya turbin, Lampu darurat. Ikon dalam kotak `*-soft`,
  nilai berwarna sesuai status (Hidup = `primary`, Padam = `danger`, Siaga = `warning`).
- **Grafik batang energi**: bar aktif `primary`, bar lain `primary-muted`, energi terpakai `warning`.
- **Daftar kejadian (Riwayat)**: kartu dengan garis warna di sisi kiri sesuai hasil
  (Bertahan = success, Gagal = danger, Siang/lampu tidak dinyalakan = info) + badge kecil di kanan.
- **Dialog hapus**: kartu `radius-xl`, tombol Batal (abu) dan Hapus (`danger`), latar gelap transparan.
- **Toast**: pil gelap `#0F1B2D`, teks putih, muncul di bawah.
- **Mode Darurat**: seluruh layar memakai tema gelap, ring `warning`, banner `danger` di atas.
- **Toggle**: track ON `primary`, OFF `surface-muted`.

---

## 6. Tailwind (tailwind.config.ts)

```ts
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#0E9F8E', dark: '#0B4F6C', soft: '#E6F4F1' },
      warning: { DEFAULT: '#F5A524', soft: '#FFF3DC', text: '#B7791F' },
      danger:  { DEFAULT: '#D93036' },
      success: { DEFAULT: '#22C55E', bright: '#4ADE80', soft: '#E3F6EC', text: '#15803D' },
      info:    { soft: '#E0EEFF', text: '#2F6FD6' },
      purple:  { soft: '#EFE7FF', text: '#6D28D9' },
      bg: '#F5F7FA',
      surface: { DEFAULT: '#FFFFFF', muted: '#EEF1F5' },
      line: '#E4E9F0',
      ink: { DEFAULT: '#0F1B2D', secondary: '#6B7A90', muted: '#9FB0C7' },
      icon: '#9AA7B8',
      night: { bg: '#0F1B2D', surface: '#17263D', surface2: '#23324A', line: '#33445E' },
    },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    borderRadius: { bar: '3px', sm: '8px', md: '12px', lg: '18px', xl: '24px' },
    boxShadow: {
      card: '0 6px 18px rgba(15, 28, 46, 0.08)',
      nav: '0 -4px 16px rgba(15, 28, 46, 0.06)',
    },
    backgroundImage: {
      header: 'linear-gradient(135deg, #0B4F6C 0%, #0E9F8E 100%)',
    },
  },
},
```

---

## 7. Daftar gambar referensi (folder `design/figma/`)

| File | Halaman web |
|---|---|
| 01 Beranda (Mode Simulasi) | Dashboard utama |
| 01b Beranda - PLN padam | Dashboard saat PLN padam |
| 01c Beranda (Mode Real) | Dashboard mode Real (data ESP32) |
| 02 Detail Turbin | Detail turbin. ABAIKAN tombol "Titik instalasi" |
| 03 Mode Darurat (PLN Padam) | Mode darurat |
| 04 Riwayat & Analitik | Riwayat + grafik |
| 04b / 04c / 04d Riwayat | Alur hapus kejadian (tombol, dialog, toast) |
| 05 / 05b Pengaturan | Pengaturan, saklar Real / Simulasi |
| 06 Jadwal Shalat & Prioritas | Jadwal shalat |

Layar "07 Titik Instalasi" sengaja TIDAK disertakan: sistem hanya 1 alat di pipa tandon,
tidak ada pemilihan kran / titik pasang.

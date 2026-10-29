/*
  MEUNASAH-SIAGA - Kirim tegangan generator ke web
  Kelompok 07 TIK306

  Papan   : ESP32 DevKit (atau ESP32-C3 Super Mini, ganti SDA_PIN / SCL_PIN di bawah)
  Sensor  : INA219, alamat 0x40 (jumper A0/A1 tidak disolder)
  Library : "Adafruit INA219" (pasang lewat Library Manager)
            WiFi.h dan HTTPClient.h sudah bawaan board ESP32

  Sambungan:
    INA219 VCC  -> ESP32 3V3
    INA219 GND  -> ESP32 GND
    INA219 SDA  -> ESP32 SDA_PIN
    INA219 SCL  -> ESP32 SCL_PIN
    Generator + -> INA219 VIN+
    INA219 VIN- -> + beban (lampu / resistor). Tanpa beban boleh dibiarkan kosong,
                   tegangan tetap terbaca, arusnya 0.
    Generator - -> - beban DAN ESP32 GND (GND harus satu)

  Cara kerja:
    - Membaca INA219 tiap 200 ms, dirata-rata, lalu dikirim tiap INTERVAL_KIRIM_MS.
    - Dikirim sebagai JSON ke SERVER_URL dengan header x-api-key.
    - Semua hasil juga dicetak di Serial Monitor (115200 baud) untuk cek tanpa web.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ================== UBAH BAGIAN INI ==================
const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASS = "PASSWORD_WIFI";

// Web jalan di laptop : "http://IP_LAPTOP:3000/api/ingest"  (IP dari ipconfig, contoh 192.168.1.10)
// Web sudah di cloud  : "https://nama-proyek.vercel.app/api/ingest"
const char* SERVER_URL = "http://IP_LAPTOP:3000/api/ingest";

// Harus sama persis dengan DEVICE_API_KEY di file .env.local web
const char* API_KEY = "ISI_DEVICE_API_KEY";

const char* DEVICE_ID = "ms-01";

// ESP32 DevKit: SDA 21, SCL 22.  ESP32-C3 Super Mini: contoh SDA 4, SCL 5.
const int SDA_PIN = 21;
const int SCL_PIN = 22;

const unsigned long INTERVAL_BACA_MS  = 200;    // baca sensor
const unsigned long INTERVAL_KIRIM_MS = 2000;   // kirim ke web
// =====================================================

Adafruit_INA219 ina219;   // alamat default 0x40
bool inaSiap = false;

// akumulator rata-rata
float jumlahV = 0, jumlahA = 0, maksV = 0;
int   jumlahSampel = 0;

unsigned long terakhirBaca = 0;
unsigned long terakhirKirim = 0;
unsigned long terakhirCobaWiFi = 0;

void sambungWiFi() {
  Serial.printf("Menyambung ke WiFi \"%s\" ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long mulai = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - mulai < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi tersambung. IP ESP32: %s, sinyal %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("WiFi belum tersambung, nanti dicoba lagi.");
  }
}

int kirimKeWeb(float volt, float amp) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  char body[160];
  snprintf(body, sizeof(body),
           "{\"device_id\":\"%s\",\"gen_voltage\":%.3f,\"gen_current\":%.4f,\"rssi\":%d}",
           DEVICE_ID, volt, amp, (int)WiFi.RSSI());

  HTTPClient http;
  WiFiClient klienBiasa;
  WiFiClientSecure klienAman;
  bool pakaiHttps = strncmp(SERVER_URL, "https", 5) == 0;

  bool siap;
  if (pakaiHttps) {
    klienAman.setInsecure();   // cukup untuk tugas kuliah; sertifikat tidak diperiksa
    siap = http.begin(klienAman, SERVER_URL);
  } else {
    siap = http.begin(klienBiasa, SERVER_URL);
  }
  if (!siap) return -2;

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  int kode = http.POST((uint8_t*)body, strlen(body));
  if (kode > 0 && (kode < 200 || kode >= 300)) {
    Serial.printf("Balasan server: %s\n", http.getString().c_str());
  }
  http.end();
  return kode;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nMEUNASAH-SIAGA - uji tegangan generator");

  Wire.begin(SDA_PIN, SCL_PIN);
  inaSiap = ina219.begin(&Wire);
  if (inaSiap) {
    Serial.println("INA219 terdeteksi (0x40).");
  } else {
    Serial.println("INA219 TIDAK terdeteksi. Cek kabel VCC, GND, SDA, SCL dan nomor pin.");
  }

  sambungWiFi();
}

void loop() {
  unsigned long sekarang = millis();

  // Coba sambung ulang WiFi tiap 10 detik kalau putus
  if (WiFi.status() != WL_CONNECTED && sekarang - terakhirCobaWiFi > 10000) {
    terakhirCobaWiFi = sekarang;
    Serial.println("WiFi putus, menyambung ulang...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }

  // Baca sensor
  if (sekarang - terakhirBaca >= INTERVAL_BACA_MS) {
    terakhirBaca = sekarang;
    if (inaSiap) {
      float shunt_mV = ina219.getShuntVoltage_mV();
      float bus_V    = ina219.getBusVoltage_V();
      float arus_mA  = ina219.getCurrent_mA();
      float teganganGenerator = bus_V + shunt_mV / 1000.0;   // tegangan di VIN+
      jumlahV += teganganGenerator;
      jumlahA += arus_mA / 1000.0;
      if (teganganGenerator > maksV) maksV = teganganGenerator;
      jumlahSampel++;
    }
  }

  // Kirim rata-rata
  if (sekarang - terakhirKirim >= INTERVAL_KIRIM_MS) {
    terakhirKirim = sekarang;

    if (!inaSiap) {
      Serial.println("Lewati kirim: INA219 tidak terdeteksi.");
      inaSiap = ina219.begin(&Wire);   // coba lagi, siapa tahu kabel baru dibetulkan
      return;
    }
    if (jumlahSampel == 0) return;

    float rataV = jumlahV / jumlahSampel;
    float rataA = jumlahA / jumlahSampel;

    int kode = kirimKeWeb(rataV, rataA);
    Serial.printf("V rata2 %.3f V | V maks %.3f V | I %.1f mA | P %.1f mW | kirim: %d %s\n",
                  rataV, maksV, rataA * 1000.0, rataV * rataA * 1000.0, kode,
                  (kode >= 200 && kode < 300) ? "OK" : "GAGAL");

    jumlahV = 0; jumlahA = 0; maksV = 0; jumlahSampel = 0;
  }
}

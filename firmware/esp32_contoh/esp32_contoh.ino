// Contoh sketch ESP32 untuk MEUNASAH-SIAGA.
// Mengirim data sensor ke dashboard tiap 5 detik lewat HTTPS + JSON,
// lalu memakai pengaturan yang dikirim balik oleh server.
//
// Papan  : ESP32 Dev Module
// Library: ArduinoJson versi 7 (Library Manager)
//
// Fungsi "baca..." di bawah masih contoh. Ganti dengan pembacaan sensor asli:
//   - tegangan generator : ADC GPIO34, pembagi 68k/10k, kalibrasi V = a × ADC + b
//   - baterai            : INA219 alamat 0x40 (arus negatif = mengisi)
//   - status PLN         : PC817 di GPIO27 (INPUT_PULLUP, LOW = PLN ada)
//   - lampu              : PWM GPIO25 (ruang shalat) dan GPIO26 (jalur wudhu)

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID      = "NAMA_WIFI";
const char* WIFI_PASS      = "PASSWORD_WIFI";
const char* SERVER_URL     = "https://nama-proyek.vercel.app/api/ingest";
const char* DEVICE_API_KEY = "ISI_DEVICE_API_KEY";
const char* DEVICE_ID      = "ms-01";
const char* FW_VERSION     = "0.3.1";

const unsigned long SEND_INTERVAL_MS = 5000;

// Pengaturan dari server. Nilai awal dipakai sampai balasan pertama diterima.
int  reserveMin    = 20;
int  maxBrightness = 80;
bool zone1Enabled  = true;
bool zone2Enabled  = true;

// Diisi oleh logika lampu darurat Anda (0-100).
int lamp1Pct = 0;
int lamp2Pct = 0;

// ---------- contoh pembacaan sensor, ganti dengan kode asli ----------
float readGenVoltage() {
  // 12-bit ADC, 3,3 V, pembagi (68k + 10k) / 10k = 7,8. Kalibrasi ulang dengan multimeter.
  return analogRead(34) / 4095.0f * 3.3f * 7.8f;
}
float readBatVoltage() { return 3.92f; }   // ganti: ina219.getBusVoltage_V()
float readBatCurrent() { return -0.42f; }  // ganti: ina219.getCurrent_mA() / 1000.0
bool  readPlnOn()      { return digitalRead(27) == LOW; }

float batteryPercent(float volt) {
  return constrain((volt - 3.0f) / (4.2f - 3.0f) * 100.0f, 0.0f, 100.0f);
}
// ----------------------------------------------------------------------

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Menghubungkan WiFi");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " terhubung" : " gagal, dicoba lagi nanti");
}

void applyConfig(JsonDocument& cfg) {
  reserveMin    = cfg["reserve_min"] | reserveMin;
  maxBrightness = cfg["max_brightness"] | maxBrightness;
  zone1Enabled  = cfg["zone1_enabled"] | zone1Enabled;
  zone2Enabled  = cfg["zone2_enabled"] | zone2Enabled;
  // cfg["schedule"] berisi 5 waktu shalat:
  //   prayer, time ("HH:MM"), priority, lamps (true/false), lamp_pct, target_min
}

void sendReading() {
  float batV = readBatVoltage();

  JsonDocument doc;
  doc["device_id"]   = DEVICE_ID;
  doc["gen_voltage"] = readGenVoltage();
  doc["gen_current"] = nullptr;  // isi angka (A) setelah INA219 kedua (0x41) dipasang
  doc["bat_voltage"] = batV;
  doc["bat_current"] = readBatCurrent();
  doc["bat_percent"] = batteryPercent(batV);
  doc["pln_on"]      = readPlnOn();
  doc["lamp1_pct"]   = lamp1Pct;
  doc["lamp2_pct"]   = lamp2Pct;
  doc["rssi"]        = WiFi.RSSI();
  doc["fw"]          = FW_VERSION;

  String body;
  serializeJson(doc, body);

  WiFiClientSecure client;
  // Contoh ini tidak memeriksa sertifikat server. Untuk pemakaian jangka panjang,
  // pasang root CA dengan client.setCACert(...).
  client.setInsecure();

  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  int code = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("POST %d: %s\n", code, response.c_str());
  if (code == 200) {
    JsonDocument cfg;
    if (!deserializeJson(cfg, response)) applyConfig(cfg);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(27, INPUT_PULLUP);
  connectWifi();
}

void loop() {
  static unsigned long lastSend = 0;
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    sendReading();
  }
  // Logika lampu darurat (PWM GPIO25/26) berjalan di sini, terpisah dari pengiriman data.
}

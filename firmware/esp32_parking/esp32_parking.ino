/*
  Smart parking - ESP32 slot sensor node (HC-SR04 / JSN-SR04T ultrasonic)

  What it does
  - Measures the distance to a car for each slot (median of several readings).
  - A slot is "occupied" when a car is closer than OCCUPIED_BELOW_CM.
  - A new state must hold for STABLE_MS before it counts (no flicker when a
    person walks past).
  - Sends to the server immediately when a state changes, and every
    HEARTBEAT_MS even if nothing changed, so the server knows it is alive.

  Wiring (per sensor)
  - VCC  -> 5V (VIN)       GND -> GND
  - TRIG -> the TRIG pin below (3.3V output is fine for the sensor)
  - ECHO -> voltage divider -> ECHO pin below
            ECHO outputs 5V but the ESP32 pins tolerate only 3.3V:
            ECHO --[1k]--+--[2k]-- GND, and the ESP32 pin connects at the "+".

  Libraries: none to install (WiFi and HTTPClient come with the ESP32 board package).
*/

#include <WiFi.h>
#include <HTTPClient.h>

// ---------- Edit these ----------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// IP address of the computer running docker compose (not "localhost").
// Find it with: ipconfig (Windows) or ifconfig / ip a (Linux, macOS).
const char* SERVER_URL = "http://192.168.1.50:5000/api/device/readings";
const char* DEVICE_API_KEY = "change_me_device_key";  // same as DEVICE_API_KEY in .env

const float OCCUPIED_BELOW_CM = 50.0;
const unsigned long STABLE_MS = 3000;
const unsigned long HEARTBEAT_MS = 30000;
const unsigned long SAMPLE_EVERY_MS = 500;
// --------------------------------

struct Slot {
  const char* label;  // must match a slot label in the database
  uint8_t trigPin;
  uint8_t echoPin;
  bool occupied;           // confirmed state
  bool candidate;          // state we are currently watching
  unsigned long candidateSince;
};

Slot slots[] = {
  {"A1", 25, 26, false, false, 0},
  {"A2", 27, 14, false, false, 0},
};
const int SLOT_COUNT = sizeof(slots) / sizeof(slots[0]);

const unsigned long RETRY_MS = 5000;  // wait this long after a failed send

unsigned long lastSend = 0;
unsigned long lastSample = 0;
unsigned long retryAfter = 0;
bool sendNow = true;  // report once right after boot

float readDistanceOnceCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long duration = pulseIn(echoPin, HIGH, 30000);  // 30 ms timeout (~5 m)
  if (duration == 0) return 999.0;                         // no echo = nothing in range
  return duration * 0.0343 / 2.0;
}

// Median of 5 readings ignores one-off bad values.
float readDistanceCm(uint8_t trigPin, uint8_t echoPin) {
  float values[5];
  for (int i = 0; i < 5; i++) {
    values[i] = readDistanceOnceCm(trigPin, echoPin);
    delay(30);
  }
  for (int i = 0; i < 4; i++) {
    for (int j = i + 1; j < 5; j++) {
      if (values[j] < values[i]) {
        float tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
      }
    }
  }
  return values[2];
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nConnected, IP %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi failed, will retry");
  }
}

bool sendReadings() {
  if (WiFi.status() != WL_CONNECTED) return false;

  String body = "{\"readings\":[";
  for (int i = 0; i < SLOT_COUNT; i++) {
    if (i > 0) body += ",";
    body += "{\"slot\":\"";
    body += slots[i].label;
    body += "\",\"status\":\"";
    body += slots[i].occupied ? "occupied" : "free";
    body += "\"}";
  }
  body += "]}";

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  http.setTimeout(5000);
  int code = http.POST(body);
  http.end();

  Serial.printf("POST %s -> %d\n", body.c_str(), code);
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < SLOT_COUNT; i++) {
    pinMode(slots[i].trigPin, OUTPUT);
    pinMode(slots[i].echoPin, INPUT);
  }
  connectWifi();
}

void loop() {
  connectWifi();
  unsigned long now = millis();

  if (now - lastSample >= SAMPLE_EVERY_MS) {
    lastSample = now;

    for (int i = 0; i < SLOT_COUNT; i++) {
      Slot& s = slots[i];
      float cm = readDistanceCm(s.trigPin, s.echoPin);
      bool reading = cm < OCCUPIED_BELOW_CM;

      if (reading != s.candidate) {
        s.candidate = reading;  // state changed, start the stability timer
        s.candidateSince = now;
      } else if (s.candidate != s.occupied && now - s.candidateSince >= STABLE_MS) {
        s.occupied = s.candidate;  // held long enough, accept it
        sendNow = true;
        Serial.printf("Slot %s is now %s (%.0f cm)\n", s.label, s.occupied ? "occupied" : "free", cm);
      }
    }
  }

  bool due = sendNow || now - lastSend >= HEARTBEAT_MS;
  bool retryAllowed = (long)(now - retryAfter) >= 0;

  if (due && retryAllowed) {
    if (sendReadings()) {
      sendNow = false;
      lastSend = now;
    } else {
      retryAfter = now + RETRY_MS;  // failed: keep the pending change, retry soon
    }
  }
}

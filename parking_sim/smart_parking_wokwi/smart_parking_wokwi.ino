#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ========================================
// SETTINGS
// ========================================

const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

// Choose how the simulated ESP32 reaches your backend:
//   0 = Wokwi on your PC with the private gateway (host.wokwi.internal)
//   1 = ngrok tunnel (works with Wokwi in the browser)
#define USE_NGROK 0

const char* SERVER_URL_LOCAL = "http://host.wokwi.internal:5000/api/device/readings";
// If ngrok restarts, paste the new address here (keep /api/device/readings)
const char* SERVER_URL_NGROK = "https://jittery-kerosene-uncharted.ngrok-free.dev/api/device/readings";

#if USE_NGROK
const char* SERVER_URL = SERVER_URL_NGROK;
#else
const char* SERVER_URL = SERVER_URL_LOCAL;
#endif

// Must equal DEVICE_API_KEY used by the backend (same key as simulate.js)
const char* DEVICE_API_KEY = "change_me_device_key";

#define NUM_SENSORS       10
#define OCCUPIED_DISTANCE 15      // cm, <= this means occupied
#define SEND_EVERY_MS     3000    // send all slots this often

const int trigPins[NUM_SENSORS] = {18, 5, 16, 21, 26, 13, 14, 25, 32, 33};
const int echoPins[NUM_SENSORS] = {19, 17, 4, 22, 27, 34, 35, 36, 39, 2};

// Must match the slot labels in the database
const char* slotNames[NUM_SENSORS] = {
  "A01", "A02", "A03", "A04", "A05",
  "A06", "A07", "A08", "A09", "A10"
};

unsigned long lastSend = 0;

// ========================================
// GET DISTANCE (cm), -1 if no echo
// ========================================

float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000UL);
  if (duration == 0) return -1;

  return duration * 0.0343 / 2.0;
}

// ========================================
// WIFI
// ========================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi Connection Failed!");
  }
}

// ========================================
// SEND ALL SLOTS IN ONE REQUEST
// ========================================

void sendToBackend(const String& body) {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  secureClient.setInsecure();   // skip certificate check (fine for testing)

  HTTPClient http;
  bool useHttps = strncmp(SERVER_URL, "https", 5) == 0;

  if (useHttps) {
    http.begin(secureClient, SERVER_URL);
  } else {
    http.begin(plainClient, SERVER_URL);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  http.addHeader("ngrok-skip-browser-warning", "true");
  http.setTimeout(8000);

  int code = http.POST(body);

  Serial.print("POST -> HTTP ");
  Serial.println(code);
  if (code != 200 && code > 0) {
    Serial.println(http.getString());   // shows the backend error message
  }
  if (code < 0) {
    Serial.println(HTTPClient::errorToString(code));
  }

  http.end();
}

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);

  Serial.println();
  Serial.println("================================");
  Serial.println("     SMART PARKING SYSTEM");
  Serial.println("     ESP32 + 10 HC-SR04");
  Serial.println("================================");
  Serial.print("Server: ");
  Serial.println(SERVER_URL);

  for (int i = 0; i < NUM_SENSORS; i++) {
    pinMode(trigPins[i], OUTPUT);
    pinMode(echoPins[i], INPUT);
    digitalWrite(trigPins[i], LOW);
  }

  connectWiFi();
  Serial.println("System Ready!");
}

// ========================================
// LOOP
// ========================================

void loop() {
  int availableSlots = 0;
  int occupiedSlots = 0;

  String body = "{\"readings\":[";
  bool first = true;

  for (int i = 0; i < NUM_SENSORS; i++) {
    float distance = getDistance(trigPins[i], echoPins[i]);

    Serial.print(slotNames[i]);
    Serial.print(" | ");

    if (distance < 0) {
      Serial.println("Sensor Error");   // left out of the payload -> shows as no signal
      delay(100);
      continue;
    }

    bool occupied = distance <= OCCUPIED_DISTANCE;
    if (occupied) occupiedSlots++; else availableSlots++;

    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.print(" cm | ");
    Serial.println(occupied ? "Occupied" : "Available");

    if (!first) body += ",";
    first = false;
    body += "{\"slot\":\"";
    body += slotNames[i];
    body += "\",\"status\":\"";
    body += occupied ? "occupied" : "free";
    body += "\"}";

    delay(100);   // avoid ultrasonic interference
  }
  body += "]}";

  Serial.println("--------------------------------");
  Serial.print("Available : "); Serial.println(availableSlots);
  Serial.print("Occupied  : "); Serial.println(occupiedSlots);

  if (millis() - lastSend >= SEND_EVERY_MS && !first) {
    sendToBackend(body);
    lastSend = millis();
  }

  delay(500);
}

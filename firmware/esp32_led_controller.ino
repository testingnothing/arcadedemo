#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const int LED1_PIN = 5;
const int LED2_PIN = 18;

const char* BACKEND_URL =
    "https://arcadedemo.onrender.com/";

unsigned long lastPoll = 0;
const unsigned long POLL_INTERVAL = 2000;

bool led1State = false;
bool led2State = false;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.begin("Xiaomi 11 Lite NE", "YASH2003");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("Connecting to Wi-Fi...");
  }

  Serial.println("Wi-Fi connected");
}

void pollBackend() {
  WiFiClientSecure client;

  // Prototype only: encrypts traffic but does not verify
  // that the server certificate is trusted.
  client.setInsecure();

  HTTPClient http;
  String url = String(BACKEND_URL) + "/device/commands";

  http.begin(client, url);
  http.addHeader("Authorization",
                 String("Bearer ") + "Wl7qt8kkiRGEIAODhUrIJE5fJkE9-QWgB3xEqzLopJ0");

  int code = http.GET();

  if (code == HTTP_CODE_OK) {
    JsonDocument doc;
    DeserializationError error =
        deserializeJson(doc, http.getString());

    if (!error) {
      led1State = doc["led1"] | false;
      led2State = doc["led2"] | false;

      digitalWrite(LED1_PIN, led1State ? HIGH : LOW);
      digitalWrite(LED2_PIN, led2State ? HIGH : LOW);
    }
  } else {
    Serial.printf("Command request failed: %d\n", code);
  }

  http.end();

  // Report the output states to the backend.
  HTTPClient statusHttp;
  statusHttp.begin(client,
      String(BACKEND_URL) + "/device/status");

  statusHttp.addHeader("Authorization",
                       String("Bearer ") + "Wl7qt8kkiRGEIAODhUrIJE5fJkE9-QWgB3xEqzLopJ0");
  statusHttp.addHeader("Content-Type", "application/json");

  String body = "{\"led1\":";
  body += led1State ? "true" : "false";
  body += ",\"led2\":";
  body += led2State ? "true" : "false";
  body += "}";

  int statusCode = statusHttp.POST(body);

  if (statusCode < 200 || statusCode >= 300) {
    Serial.printf("Status update failed: %d\n", statusCode);
  }

  statusHttp.end();
}

void setup() {
  Serial.begin(115200);

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);

  connectWiFi();
  pollBackend();
}

void loop() {
  connectWiFi();

  if (millis() - lastPoll >= POLL_INTERVAL) {
    lastPoll = millis();
    pollBackend();
  }

  delay(10);
}
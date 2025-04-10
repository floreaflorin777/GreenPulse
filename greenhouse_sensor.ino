#include <WiFiS3.h>
#include <DHT.h>
#include <ArduinoJson.h>

const char* ssid = "Florin's Hotspot";
const char* password = "12345678";
const char* server = "florinm12.pythonanywhere.com";
const int port = 80;
const char* path = "/api/sensor-data";

#define DHTPIN 2
#define DHTTYPE DHT22
#define LDRPIN A0

DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;

void setup() {
  Serial.begin(9600);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
}

void loop() {
  delay(10000);

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int ldrValue = analogRead(LDRPIN);

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Sensor read failed.");
    return;
  }

  // Print values to Serial Monitor
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print(" °C, Humidity: ");
  Serial.print(hum);
  Serial.print(" %, LDR: ");
  Serial.println(ldrValue);

  if (client.connect(server, port)) {
    // Create JSON payload
    StaticJsonDocument<200> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["ldr"] = ldrValue;
    
    String jsonString;
    serializeJson(doc, jsonString);

    // Send HTTP POST request
    client.println("POST " + String(path) + " HTTP/1.1");
    client.println("Host: " + String(server));
    client.println("Content-Type: application/json");
    client.println("Content-Length: " + String(jsonString.length()));
    client.println();
    client.println(jsonString);

    // Read the response
    while (client.connected()) {
      String line = client.readStringUntil('\n');
      if (line == "\r") break; // Headers done
    }

    String response = client.readString();
    Serial.println("Server response:");
    Serial.println(response);

    client.stop();
  } else {
    Serial.println("Connection to server failed.");
  }
}

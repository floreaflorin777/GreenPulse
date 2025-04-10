# Greenhouse Management System

A web-based dashboard for monitoring greenhouse environmental conditions using an Arduino UNO R4 WiFi with DHT22 temperature/humidity sensor and LDR light sensor.

## Project Overview

This system collects temperature, humidity, and light level data from sensors connected to an Arduino, then displays this information on a responsive web dashboard. The dashboard provides:

- Real-time sensor readings
- Historical data charts
- Status indicators for optimal conditions
- Basic statistics

## System Architecture

- **Arduino**: Collects sensor data and sends it to the server
- **Flask Backend**: Receives and stores data, serves the web dashboard
- **SQLite Database**: Stores all sensor readings
- **Web Dashboard**: Displays current and historical data in an intuitive interface

## Setup Instructions

### 1. PythonAnywhere Setup

1. Sign up for a [PythonAnywhere account](https://www.pythonanywhere.com/) if you don't have one
2. Create a new web app:
   - Go to the Web tab
   - Click "Add a new web app"
   - Select "Flask" as the framework
   - Choose Python 3.8 or later

3. Upload project files:
   - Use the Files tab to upload all files from this project
   - Alternatively, clone from a Git repository if you've stored the code there

4. Set up the virtual environment:
   - Open a Bash console
   - Install required packages:
   ```
   pip install flask
   ```

5. Configure the web app:
   - Go to the Web tab
   - Edit the WSGI configuration file
   - Find the Flask section and update the path to point to your app.py
   - Set the working directory to your project folder

6. Get your web app URL:
   - It will be listed in the Web tab (e.g., username.pythonanywhere.com)

### 2. Arduino Setup

1. Connect the sensors to your Arduino UNO R4 WiFi:
   - DHT22 temperature/humidity sensor:
     - Connect VCC to 5V
     - Connect GND to GND
     - Connect data pin to digital pin 2
   - LDR light sensor:
     - Connect one leg to 5V
     - Connect the other leg to analog pin A0
     - Connect a 10K resistor from analog pin A0 to GND

2. Upload the Arduino sketch:
   - Modify the WiFi connection parameters to use your phone's hotspot
   - Update the server URL to your PythonAnywhere URL
   - Set the data transmission interval (30 seconds recommended)

3. Power the Arduino and ensure it's connected to WiFi

### 3. Testing the System

1. Generate test data (optional):
   - Visit `[your-pythonanywhere-url]/api/test-data` to populate the database with sample data for testing

2. View the dashboard:
   - Visit your PythonAnywhere URL in any web browser
   - The dashboard should display the test data or live data from your Arduino

## API Endpoints

- `POST /api/sensor-data`: Endpoint for Arduino to send sensor data
- `GET /api/current-data`: Get the most recent sensor reading
- `GET /api/historical-data?hours=24`: Get historical data from the past 24 hours
- `GET /api/stats?hours=24`: Get statistics (min, max, avg) for the past 24 hours
- `GET /api/test-data`: Generate test data (for development only)

## Data Format for Arduino POST Requests

```json
{
  "temperature": 23.5,
  "humidity": 65.2,
  "light_level": 850
}
```

## Arduino Code Example

```cpp
#include <WiFiS3.h>
#include <DHT.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

// WiFi configuration
const char* ssid = "YourPhoneHotspot";
const char* password = "YourPassword";

// Server configuration
const char* server = "yourusername.pythonanywhere.com";
const int port = 80;
String endpoint = "/api/sensor-data";

// Sensor configuration
#define DHTPIN 2
#define DHTTYPE DHT22
#define LDR_PIN A0
DHT dht(DHTPIN, DHTTYPE);

// Data sending interval (30 seconds)
const unsigned long INTERVAL = 30000;
unsigned long previousMillis = 0;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, server, port);

void setup() {
  Serial.begin(9600);
  delay(1000);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Check if it's time to send data
  if (currentMillis - previousMillis >= INTERVAL) {
    previousMillis = currentMillis;
    sendSensorData();
  }
}

void sendSensorData() {
  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightLevel = analogRead(LDR_PIN);
  
  // Check if any reading failed
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  Serial.println("Sensor readings:");
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
  Serial.print("Light Level: ");
  Serial.println(lightLevel);
  
  // Create JSON document
  StaticJsonDocument<200> jsonDoc;
  jsonDoc["temperature"] = temperature;
  jsonDoc["humidity"] = humidity;
  jsonDoc["light_level"] = lightLevel;
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(jsonDoc, jsonString);
  
  // Send HTTP POST request
  Serial.println("Sending data to server...");
  client.beginRequest();
  client.post(endpoint);
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", jsonString.length());
  client.beginBody();
  client.print(jsonString);
  client.endRequest();
  
  // Read response
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  
  Serial.print("Status code: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(response);
}
```

## Customizing the Dashboard

- The dashboard is set up with default optimal ranges for temperature (18-28°C), humidity (40-80%), and light level (300-800).
- You can customize these ranges in the `dashboard.js` file by editing the constants at the top:
  ```javascript
  const TEMP_RANGES = { min: 18, max: 28 };
  const HUMIDITY_RANGES = { min: 40, max: 80 };
  const LIGHT_RANGES = { min: 300, max: 800 };
  ```

## Troubleshooting

1. **Arduino can't connect to WiFi**:
   - Ensure your phone's hotspot is enabled
   - Check SSID and password in the Arduino code

2. **Arduino can't send data to the server**:
   - Verify the server URL in the Arduino code
   - Check if your PythonAnywhere account has API access

3. **Dashboard not showing data**:
   - Check the browser console for errors (F12 -> Console)
   - Verify that data exists in the database

4. **Server errors**:
   - Check the PythonAnywhere error logs in the Web tab

## Project Structure

```
greenhouse_management/
├── app.py              # Flask application
├── greenhouse.db       # SQLite database
├── static/
│   ├── css/
│   │   └── styles.css  # Dashboard styles
│   └── js/
│       └── dashboard.js # Dashboard functionality
└── templates/
    └── dashboard.html  # Dashboard HTML template

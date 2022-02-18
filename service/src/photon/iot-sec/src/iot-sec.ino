/*
 * Project iot-sec
 * Description: a DIY security system
 * Author: Timothy Baumgartner
 * Date:
 */
#include "Particle.h"
#include "wifi_manager.h"
#include "secrets.h"

#include <algorithm>
#include <iterator>
#include <stdio.h>
#include <string>

#define ENABLE_SERIAL false
#define USE_PARTICLE_CLOUD false

#define STRINGIZER(s) #s
#define STR_VALUE(s) STRINGIZER(s)

std::string serverRouteHeaderMacroValue = STR_VALUE(SERVER_ROUTEHEADER);
std::string serverRouteHeader;
std::string serverHostnameMacroValue = STR_VALUE(SERVER_HOSTNAME);
std::string serverHostname;
std::string serverAuthHeaderMacroValue = STR_VALUE(SERVER_AUTHHEADER);
std::string serverAuthHeader;

const int ledLow = D0;
const int ledHigh = D1;
const int sensor = D6;
int sensorValue;
bool isDoorOpen = true;

TCPClient client;
int counter = 0;
String receivedData;
byte dataBuffer[1024];

SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(SEMI_AUTOMATIC);

// setup() runs once, when the device is first turned on.
void setup()
{
  if (ENABLE_SERIAL)
  {
    WifiManager::EnableSerialDebugging();
  }
  WifiManager::Setup(USE_PARTICLE_CLOUD);

  pinMode(ledLow, OUTPUT);
  pinMode(ledHigh, OUTPUT);
  pinMode(sensor, INPUT_PULLDOWN);

  WiFi.setHostname("iot-sec--photon");

  std::remove_copy(
      serverRouteHeaderMacroValue.begin(),
      serverRouteHeaderMacroValue.end(),
      std::back_inserter(serverRouteHeader),
      '\'');
  std::remove_copy(
      serverHostnameMacroValue.begin(),
      serverHostnameMacroValue.end(),
      std::back_inserter(serverHostname),
      '\'');
  std::remove_copy(
      serverAuthHeaderMacroValue.begin(),
      serverAuthHeaderMacroValue.end(),
      std::back_inserter(serverAuthHeader),
      '\'');
}

// loop() runs over and over again, as quickly as it can execute.
void loop()
{
  WifiManager::Loop();

  sensorValue = digitalRead(sensor);

  digitalWrite(ledLow, !sensorValue);
  digitalWrite(ledHigh, sensorValue);

  if (isDoorOpen != sensorValue)
  {
    if (sensorValue)
      postDoorOpen();

    isDoorOpen = sensorValue;
  }

  delay(100);

  if (ENABLE_SERIAL)
  {
    if (counter++ == 10)
    {
      counter = 0;
      Serial.println(("loop " + std::to_string(millis())).c_str());
    }
  }
}

void postDoorOpen()
{
  if (ENABLE_SERIAL)
    Serial.println("the door is open");

  if (!client.connected())
  {
    if (ENABLE_SERIAL)
      Serial.println(("connecting to " + serverHostname).c_str());

    bool connected = client.connect(serverHostname.c_str(), 80);
    if (ENABLE_SERIAL)
    {
      Serial.println(("connected: " + std::to_string(connected)).c_str());
    }

    if (!connected)
      return;
  }

  client.println(serverRouteHeader.c_str());
  client.println(("Host: " + serverHostname).c_str());
  client.println(serverAuthHeader.c_str());
  client.println();

  if (ENABLE_SERIAL)
  {
    receivedData = "";

    // This does not handle Transfer-Encoding: chunked
    const String httpTerminator = "\r\n\r\n";
    while (receivedData.indexOf(httpTerminator) == -1)
    {
      memset(dataBuffer, 0x00, sizeof(dataBuffer));
      client.read(dataBuffer, sizeof(dataBuffer));
      receivedData += (const char *)dataBuffer;
    }

    Serial.println(receivedData);
  }

  client.stop();
}

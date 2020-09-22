/*
 * Project iot-sec
 * Description:
 * Author: Timothy Baumgartner
 * Date:
 */
#include "Particle.h"
#include "wifi_manager.h"

const int ledLow = D0;
const int ledHigh = D1;
const int sensor = D6;
int sensorValue;
bool isDoorOpen = true;

SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(SEMI_AUTOMATIC);

// setup() runs once, when the device is first turned on.
void setup() {
  WifiManager::Setup();

  pinMode(ledLow, OUTPUT);
  pinMode(ledHigh, OUTPUT);
  pinMode(sensor, INPUT_PULLDOWN);

  Particle.variable("sensorValue", &sensorValue, INT);
}

// loop() runs over and over again, as quickly as it can execute.
void loop() {
  WifiManager::Loop();

  sensorValue = digitalRead(sensor);

  digitalWrite(ledLow, !sensorValue);
  digitalWrite(ledHigh, sensorValue);

  if (isDoorOpen != sensorValue) {
    if (sensorValue)
      Particle.publish("doorOpened", "the door has opened", 60, PRIVATE);

    isDoorOpen = sensorValue;
  }

  delay(100);
}

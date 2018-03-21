int ledLow = D0;
int ledHigh = D1;
int sensor = D6;
int sensorValue;
bool doorOpen = true;

void setup() {
  pinMode(ledLow, OUTPUT);
  pinMode(ledHigh, OUTPUT);
  pinMode(sensor, INPUT_PULLDOWN);

  Particle.variable("sensorValue", &sensorValue, INT);
}

void loop() {
  sensorValue = digitalRead(sensor);

  digitalWrite(ledLow, !sensorValue);
  digitalWrite(ledHigh, sensorValue);

  if (doorOpen != sensorValue) {  // state change
    if (sensorValue)
      Particle.publish("test", "the door has opened", 60, PRIVATE);

    doorOpen = sensorValue;
  }

  delay(100);
}

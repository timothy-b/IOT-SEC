```c++
// Copied from https://community.particle.io/t/solved-tcpclient-intranet-connection-fails-if-no-cloud-connection/24684/8
#include "Particle.h"

SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(SEMI_AUTOMATIC);

const unsigned long SEND_PERIOD_MS = 15000;

enum WifiState { WIFI_STATE_NOT_CONNECTED, WIFI_STATE_CONNECTING, WIFI_STATE_CONNECTED, WIFI_STATE_RUNNING };

IPAddress serverAddr(192,168,2,186);
const int serverPort = 8081;

WifiState wifiState = WIFI_STATE_NOT_CONNECTED;
unsigned long lastSend = 0;
TCPClient client;
int seq = 0;

void setup() {
	Serial.begin(9600);

	WiFi.on();
}

void loop() {
	switch(wifiState) {
	case WIFI_STATE_NOT_CONNECTED:
		Serial.println("connecting");
		WiFi.connect();
		wifiState = WIFI_STATE_CONNECTING;
		break;

	case WIFI_STATE_CONNECTING:
		if (WiFi.ready()) {
			wifiState = WIFI_STATE_CONNECTED;
		}
		// The WiFi.connect() call never times out, it will keep trying forever so there's
		// no need to call WiFi.connect() again here.
		break;

	case WIFI_STATE_CONNECTED:
		// Do any one-time initialization here like calling udp.begin() or tcpServer.begin()
		Serial.println("connected");

		// Also connect to the Particle cloud
		Particle.connect();

		wifiState = WIFI_STATE_RUNNING;
		break;

	case WIFI_STATE_RUNNING:
		if (!WiFi.ready()) {
			Serial.println("Wifi disconnected during connected state");
			wifiState = WIFI_STATE_CONNECTING;

			// No need to call WiFi.connect() again, it will keep retrying forever
			break;
		}

		// Running with WiFi enabled here
		if (millis() - lastSend >=  SEND_PERIOD_MS) {
			lastSend = millis();

			Serial.println("about to connect");
			if (client.connect(serverAddr, serverPort)) {
				Serial.printlnf("sending seq=%d", seq);
				client.printlnf("%d\n", seq++);
				client.stop();
			}
			else {
				Serial.println("connection failed");
			}

			if (Particle.connected()) {
				Serial.println("publishing event");
				Particle.publish("test4", "", PRIVATE);
			}
			else {
				Serial.println("not connected to the cloud, skipping publishing event");
			}
		}
		break;

	}

	// System thread enable mode is used so this is not necessary to keep the cloud
	// connection is alive, but it is necessary to handle the system events, including
	// the button, so it's here, regardless of the connection state.
	Particle.process();
}

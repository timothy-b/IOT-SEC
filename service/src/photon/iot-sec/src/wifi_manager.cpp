// Adapted from https://community.particle.io/t/solved-tcpclient-intranet-connection-fails-if-no-cloud-connection/24684/8
#include "Particle.h"
#include "wifi_manager.h"

void WifiManager::Setup(boolean shouldConnectToParticleCloud)
{
	s_shouldConnectToParticleCloud = shouldConnectToParticleCloud;

	if (s_isSerialDebuggingEnabled)
		Serial.begin();

	WiFi.on();
}

void WifiManager::Loop()
{
	switch (s_wifiState)
	{
	case WIFI_STATE_NOT_CONNECTED:
		if (s_isSerialDebuggingEnabled)
			Serial.println("not connected");

		WiFi.connect();
		s_wifiState = WIFI_STATE_CONNECTING;
		break;

	case WIFI_STATE_CONNECTING:
		if (s_isSerialDebuggingEnabled)
			Serial.println("connecting");

		if (WiFi.ready())
			s_wifiState = WIFI_STATE_CONNECTED;

		// The WiFi.connect() call never times out, it will keep trying forever so there's
		// no need to call WiFi.connect() again here.
		break;

	case WIFI_STATE_CONNECTED:
		// Do any one-time initialization here like calling udp.begin() or tcpServer.begin().
		if (s_isSerialDebuggingEnabled)
			Serial.println("connected");

		if (s_shouldConnectToParticleCloud)
		{
			// Also connect to the Particle cloud.
			Particle.connect();
		}

		s_wifiState = WIFI_STATE_RUNNING;

		// TODO: pass in a callback and call it here.
		break;

	case WIFI_STATE_RUNNING:
		if (!WiFi.ready())
		{
			if (s_isSerialDebuggingEnabled)
				Serial.println("Wifi disconnected during connected state");

			s_wifiState = WIFI_STATE_CONNECTING;

			// No need to call WiFi.connect() again, it will keep retrying forever.
			break;
		}

		// Running with WiFi enabled here.
		if (millis() - s_lastSendTime >= c_sendPeriodMs)
		{
			s_lastSendTime = millis();

			if (s_isServerDebuggingEnabled)
			{
				if (s_isSerialDebuggingEnabled)
					Serial.println("about to connect");

				if (s_client.connect(s_serverAddr, s_serverPort))
				{
					if (s_isSerialDebuggingEnabled)
						Serial.printlnf("sending seq=%lu", s_sequenceId);

					s_client.printlnf("%lu", s_sequenceId);
					s_client.stop();
				}
				else
				{
					if (s_isSerialDebuggingEnabled)
						Serial.println("connection failed");
				}
			}

			if (s_shouldConnectToParticleCloud)
			{
				if (Particle.connected())
				{
					if (s_isSerialDebuggingEnabled)
						Serial.println("publishing event");

					Particle.publish("WifiManager: connected.", "seq=" + s_sequenceId, PRIVATE);

					if (s_isSerialDebuggingEnabled)
						Serial.println("publishing event");
				}
				else
				{
					Serial.println("skipping publishing event, not connected to the cloud");
				}
			}

			s_sequenceId++;
		}
		break;
	}

	// System thread enable mode is used so this is not necessary to keep the cloud
	// connection is alive, but it is necessary to handle the system events, including
	// the button, so it's here, regardless of the connection state.
	Particle.process();
}

void WifiManager::EnablePublishDebugging()
{
	s_isPublishDebuggingEnabled = true;
}

void WifiManager::EnableSerialDebugging()
{
	s_isSerialDebuggingEnabled = true;
}

void WifiManager::EnableServerDebugging(uint8_t firstOctet, uint8_t secondOctet, uint8_t thirdOcted, uint8_t fourthOctet, int portNumber)
{
	s_serverAddr = IPAddress(firstOctet, secondOctet, thirdOcted, fourthOctet);
	s_serverPort = portNumber;
	s_isServerDebuggingEnabled = true;
}

WifiManager::WifiState WifiManager::s_wifiState = WifiState::WIFI_STATE_NOT_CONNECTED;
unsigned long WifiManager::s_lastSendTime = 0;
unsigned long WifiManager::s_sequenceId = 0;
bool WifiManager::s_isServerDebuggingEnabled = false;
bool WifiManager::s_isSerialDebuggingEnabled = false;
bool WifiManager::s_isPublishDebuggingEnabled = false;
bool WifiManager::s_isInitialized = true;
bool WifiManager::s_shouldConnectToParticleCloud = false;

IPAddress WifiManager::s_serverAddr = IPAddress();
int WifiManager::s_serverPort = 80;
TCPClient WifiManager::s_client = TCPClient();

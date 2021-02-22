class WifiManager {
	public:
		enum WifiState { WIFI_STATE_NOT_CONNECTED, WIFI_STATE_CONNECTING, WIFI_STATE_CONNECTED, WIFI_STATE_RUNNING };
		WifiManager(WifiManager const&) = delete;
        void operator=(WifiManager const&) = delete;
        WifiManager();
        static void Setup(boolean shouldConnectToParticleCloud);
        static void Loop();
        static void EnablePublishDebugging();
        static void EnableSerialDebugging();
        static void EnableServerDebugging(uint8_t firstOctet, uint8_t secondOctet, uint8_t thirdOcted, uint8_t fourthOctet, int portNumber);
    private:
        static WifiState s_wifiState;

        static const unsigned long c_sendPeriodMs = 15000UL;

        static IPAddress s_serverAddr;
        static int s_serverPort;
        static TCPClient s_client;

        static unsigned long s_lastSendTime;
        static unsigned long s_sequenceId;
        static bool s_isPublishDebuggingEnabled;
        static bool s_isSerialDebuggingEnabled;
        static bool s_isServerDebuggingEnabled;
        static bool s_isInitialized;
        static bool s_shouldConnectToParticleCloud;

        static void Initialize() {
            s_wifiState = WifiManager::WifiState::WIFI_STATE_NOT_CONNECTED;
            s_lastSendTime = 0;
            s_sequenceId = 0;
            s_isServerDebuggingEnabled = false;
            s_isSerialDebuggingEnabled = false;
            s_isPublishDebuggingEnabled = false;
            s_isInitialized = true;
            s_shouldConnectToParticleCloud = false;
        }
};

SPECTRS // Tactical RF Signal Intelligence & EMCON Suite
Executive Summary
SPECTRS (Spectrum Passive Emergency, Crisis & Tactical Response System) is a modular, tactical-grade RF signal monitoring and analysis framework. The system is designed to provide high-fidelity spectrum awareness and cellular infrastructure intelligence in contested or infrastructure-denied environments. By bypassing proprietary firmware limitations through low-level socket programming, SPECTRS offers a transparent look at signal health, carrier infrastructure, and tactical communications.

Technical Architecture
SPECTRS operates as a bridge between closed-source hardware gateways and a centralized telemetry dashboard.

graph LR
    A[Hardware Gateway] -- "Raw TCP / goform" --> B[Node.js Bridge]
    B -- "Session Management" --> B
    B -- "Metric Normalization" --> C[React Telemetry Dashboard]

    
Current Technical Specifications (v1.0.0)
The following capabilities are fully implemented in the current production release:

Raw Telemetry Extraction: Low-latency polling of RSRP, RSRQ, and RSSI signal metrics.

Infrastructure Intelligence: Automated normalization of cellular telemetry, including network provider identification and frequency band calculation (e.g., Band 3, 7, 20).

Protocol-Level Authentication: Custom MD5/SHA-256 challenge-response engine for seamless hardware session token (stok) rotation.

Gateway Stability: Intelligent "OFFLINE_REFRESHING" state management to ensure dashboard responsiveness during hardware re-handshakes.

Engineering Post-Mortem & Implementation Log
Development of the SPECTRS engine involved significant technical challenges related to proprietary, closed-source hardware firmware:

Watchdog Mitigation: Direct hardware status polling often triggered modem watchdog timers. Resolution: Implemented a 15ms "breath-loop" pacing algorithm to extract metrics without disrupting device uptime.

Firmware Abstraction: Standard API calls were restricted. Resolution: Developed a raw TCP socket bridge to perform direct payload injection, effectively bypassing high-level HTTP client restrictions.

Session Persistence: The hardware forces frequent token rotation. Resolution: Engineered a background authentication proxy to manage the full challenge-response lifecycle, abstracting complexity from the user interface.

Development Roadmap (Future Tactical Modules)
This framework is architected for transition to software-defined radio (SDR) platforms (e.g., RTL-SDR, LimeSDR). Future tactical modules include:

[PLANNED] Offline Triangulation Engine: Utilizing neighbor-cell RSSI mapping against offline topography databases to achieve GNSS-independent positioning.

[PLANNED] Automated EMCON (Emissions Control): Programmatic power throttling and burst-transmission protocols (e.g., <3s TX windows) to minimize electromagnetic signatures.

[PLANNED] IMSI-Catcher Detection: Heuristic-based anomaly detection for base station spoofing, forced protocol downgrades, and transmission power irregularities.

[PLANNED] RF Shadow Mapping: Utilizing digital elevation models (DEM) to map real-time "Shadow Corridors"—geographic areas where terrain physically blocks signals from interception.

[PLANNED] Mesh C2 Gateway: Implementing secondary transport layers (SMS/Mesh-Wi-Fi) to maintain team communications during infrastructure degradation.

Getting Started
Prerequisites
Runtime: Node.js, React

Dependencies: npm install express axios cors dotenv

Configuration
1. Clone the repository and initialize the environment:

npm install

2. Create a .env file in the root directory:

MODEM_IP=192.168.0.1
MODEM_PASSWORD=your_modem_password
PORT=4000

3. Run the engine:

node server.cjs

SPECTRS is a technical demonstration of systems-level integration and embedded hardware engineering.
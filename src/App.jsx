import { useState, useEffect } from "react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("modem_stok") || "");

  const [telemetry, setTelemetry] = useState({
    rsrp: -140,
    rsrq: -20,
    rssi: -110,
    dataUsed: "0.0 GB",
    connectedDevices: 0,
    networkOperator: "AWAITING TOKEN INJECTION...",
    band: "INITIALIZING LINK...",
  });

  const [alerts, setAlerts] = useState([
    { id: 1, sender: "Network Provider", time: "10 min ago", text: "" },
    { id: 2, sender: "ALERT_RCB", time: "1 hour ago", text: "" },
  ]);

  const [hardwareStatus, setHardwareStatus] = useState("OFFLINE");

  // Dynamic bar math utilities to visually reflect link metrics accurately
  const getRsrpPercentage = (rsrp) => {
    const min = -140;
    const max = -60;
    const percentage = ((rsrp - min) / (max - min)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const getRsrqPercentage = (rsrq) => {
    const min = -20;
    const max = -3;
    const percentage = ((rsrq - min) / (max - min)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  // Live Polling Engine Initialization with POST payload syncing
  useEffect(() => {
    const fetchModemData = async () => {
      // If there's no token yet, don't execute an invalid fetch request
      if (!token) {
        setHardwareStatus("OFFLINE");
        return;
      }

      try {
        const res = await fetch("http://localhost:4000/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stok: token }),
        });
        const data = await res.json();

        setTelemetry(data);

        // If the backend falls back to its offline visual indicators, update the system state
        if (data.status === "OFFLINE_BUFFER") {
          setHardwareStatus("OFFLINE");
        } else {
          setHardwareStatus(data.status);
        }
      } catch (err) {
        console.error("Connection error:", err);
        setHardwareStatus("OFFLINE");
      }
    };

    fetchModemData(); // Initial execution
    const interval = setInterval(fetchModemData, 10000); // Sample every 10 seconds
    return () => clearInterval(interval);
  }, [token]); // Triggers instantly when a user inputs a fresh token string

  const handleTokenChange = (e) => {
    const input = e.target.value.trim();
    setToken(input);
    localStorage.setItem("modem_stok", input); // Caches it locally inside the browser profile
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-mono p-6 selection:bg-emerald-500 selection:text-black">
      {/* HEADER BAR */}
      <header className="border-b border-neutral-800 pb-4 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-emerald-400">
            SPECTRS // v1.0.0
          </h1>
          <p className="text-sm text-neutral-500">
            Spectrum Passive Emergency, Crisis & Tactical Response System
          </p>
        </div>

        {/* AUTOMATED AUTH CONTROL INJECTION BELT */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-neutral-900 border border-neutral-800 p-2 rounded">
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase whitespace-nowrap">
              Secure Token:
            </span>
            <input
              type="text"
              value={token}
              onChange={handleTokenChange}
              placeholder="Paste signature text from address bar..."
              className="w-full sm:w-64 bg-neutral-950 text-emerald-400 text-xs border border-neutral-800 focus:border-emerald-500 focus:outline-none px-2 py-1.5 rounded font-mono"
            />
          </div>
          <div className="flex items-center justify-center gap-3 bg-neutral-950 border border-neutral-800 px-4 py-1.5 rounded">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hardwareStatus === "ONLINE" ? "bg-emerald-400" : "bg-rose-500"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${hardwareStatus === "ONLINE" ? "bg-emerald-500" : "bg-rose-500"}`}
              ></span>
            </span>
            <span className="text-xs font-semibold tracking-widest text-neutral-300 whitespace-nowrap">
              NODE: {hardwareStatus}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN GRID CONTROL PANEL */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ROW 1: PRIMARY SIGNAL METRICS */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* RSRP CARD */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded flex flex-col justify-between">
            <span className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">
              Signal Power (RSRP)
            </span>
            <span className="text-3xl font-bold text-emerald-400 my-4">
              {hardwareStatus === "ONLINE" ? telemetry.rsrp : "---"}{" "}
              <span className="text-sm text-neutral-500 font-normal">dBm</span>
            </span>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 duration-500 transition-all ease-out"
                style={{ width: `${getRsrpPercentage(telemetry.rsrp)}%` }}
              ></div>
            </div>
          </div>

          {/* RSRQ CARD */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded flex flex-col justify-between">
            <span className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">
              Signal Quality (RSRQ)
            </span>
            <span className="text-3xl font-bold text-amber-400 my-4">
              {hardwareStatus === "ONLINE" ? telemetry.rsrq : "---"}{" "}
              <span className="text-sm text-neutral-500 font-normal">dB</span>
            </span>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 duration-500 transition-all ease-out"
                style={{ width: `${getRsrqPercentage(telemetry.rsrq)}%` }}
              ></div>
            </div>
          </div>

          {/* LINK STATUS CARD */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded flex flex-col justify-between">
            <span className="text-xs text-neutral-400 font-semibold tracking-wider uppercase">
              Network Link
            </span>
            <div className="my-3">
              <span className="text-lg font-bold block text-neutral-200">
                {telemetry.networkOperator}
              </span>
              <span className="text-xs text-neutral-500 block mt-0.5">
                {telemetry.band}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded self-start border ${hardwareStatus === "ONLINE" ? "bg-neutral-800 text-neutral-300 border-neutral-700" : "bg-neutral-950 text-neutral-600 border-neutral-900"}`}
            >
              {hardwareStatus === "ONLINE" ? "LTE ACTIVE" : "LINK OFFLINE"}
            </span>
          </div>
        </div>

        {/* SYSTEM OVERVIEW */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded row-span-2">
          <h2 className="text-sm font-bold tracking-wider text-emerald-400 border-b border-neutral-800 pb-2 mb-4 uppercase">
            Node Overview
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs text-neutral-400">
                Data Cycle Logged
              </span>
              <span className="text-sm font-bold text-neutral-200">
                {telemetry.dataUsed} / 500GB
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs text-neutral-400">
                Tethered Interfaces
              </span>
              <span className="text-sm font-bold text-neutral-200">
                {telemetry.connectedDevices} Nodes
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-xs text-neutral-400">Hardware Gateway</span>
              <span className="text-sm font-bold text-neutral-500">
                192.168.0.1
              </span>
            </div>
          </div>
          <div className="mt-8 p-3 bg-neutral-950 border border-neutral-800 rounded text-center">
            <span className="text-xs text-neutral-500 uppercase tracking-widest block mb-1">
              RF Shadow Assessment
            </span>
            <span
              className={`text-xs font-bold ${hardwareStatus === "ONLINE" ? "text-emerald-400" : "text-rose-500"}`}
            >
              {hardwareStatus === "ONLINE"
                ? "CLEAR INFRASTRUCTURE SIGHTLINE"
                : "GATEWAY UNREACHABLE"}
            </span>
          </div>
        </div>

        {/* ROW 2: COMMS ALERTS */}
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 p-5 rounded">
          <h2 className="text-sm font-bold tracking-wider text-rose-400 border-b border-neutral-800 pb-2 mb-4 uppercase">
            Emergency Comms & Intercepted SMS
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col sm:flex-row justify-between gap-2 items-start sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-300">
                      [{alert.sender}]
                    </span>
                    <span className="text-xs text-neutral-600 font-semibold uppercase tracking-wider">
                      {alert.time}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {alert.text}
                  </p>
                </div>
                <button className="text-xs tracking-widest uppercase bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded duration-150">
                  Copy Payload
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

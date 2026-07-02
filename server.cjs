require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const MODEM_IP = process.env.MODEM_IP;
const PLAIN_PASSWORD = process.env.MODEM_PASSWORD;

let automatedStok = "";

function sha256(string) {
  return crypto.createHash("sha256").update(string).digest("hex");
}

// Helper function for MD5 hashing (Required for this ZTE firmware family)
function md5(string) {
  return crypto.createHash("md5").update(string).digest("hex");
}

const net = require("net");

async function fetchTokenAutomatically() {
  try {
    console.log(
      "SPECTRS Authentication: Fetching single tokens sequentially...",
    );

    // 1. Fetch tokens sequentially using standard Axios
    const ldRes = await axios.get(
      `http://${MODEM_IP}/goform/goform_get_cmd_process`,
      {
        params: { cmd: "LD", _: Date.now() },
        headers: { Referer: `http://${MODEM_IP}/index.html` },
        timeout: 2000,
      },
    );
    const LD = ldRes.data ? ldRes.data.LD : null;

    if (!LD) {
      console.log("SPECTRS: Base token handshake refused.");
      return null;
    }

    const rdRes = await axios
      .get(`http://${MODEM_IP}/goform/goform_get_cmd_process`, {
        params: { cmd: "RD", _: Date.now() },
        headers: { Referer: `http://${MODEM_IP}/index.html` },
      })
      .catch(() => null);
    const waRes = await axios
      .get(`http://${MODEM_IP}/goform/goform_get_cmd_process`, {
        params: { cmd: "wa_inner_version", _: Date.now() },
        headers: { Referer: `http://${MODEM_IP}/index.html` },
      })
      .catch(() => null);
    const crRes = await axios
      .get(`http://${MODEM_IP}/goform/goform_get_cmd_process`, {
        params: { cmd: "cr_version", _: Date.now() },
        headers: { Referer: `http://${MODEM_IP}/index.html` },
      })
      .catch(() => null);

    const RD = rdRes?.data?.RD;
    const wa_inner_version = waRes?.data?.wa_inner_version;
    const cr_version = crRes?.data?.cr_version;

    console.log(`SPECTRS: Verified Challenge Parameters -> LD: ${LD}`);

    // Compute the ZTE Complex SHA-256 Hash
    const firstHash = sha256(PLAIN_PASSWORD).toUpperCase();
    const finalPasswordHash = sha256(firstHash + LD).toUpperCase();

    // Build AD Token Matrix
    let adToken = "";
    if (RD && wa_inner_version) {
      const versionCombo = String(wa_inner_version) + String(cr_version || "");
      adToken = sha256(sha256(versionCombo) + RD);
    }

    // Construct the raw form URL string
    const payload = new URLSearchParams();
    payload.append("isTest", "false");
    payload.append("goformId", "LOGIN");
    payload.append("password", finalPasswordHash);
    if (adToken) {
      payload.append("AD", adToken);
    }
    const payloadString = payload.toString();

    // 5. Bypass Node's HTTP client completely using a raw TCP socket
    console.log("Opening raw TCP socket bypass...");
    const rawResponse = await new Promise((resolve, reject) => {
      const client = new net.Socket();
      let responseData = "";

      client.connect(80, MODEM_IP, () => {
        // Construct a raw string HTTP request manually
        let httpRequest = `POST /goform/goform_set_cmd_process HTTP/1.1\r\n`;
        httpRequest += `Host: ${MODEM_IP}\r\n`;
        httpRequest += `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`;
        httpRequest += `Content-Type: application/x-www-form-urlencoded; charset=UTF-8\r\n`;
        httpRequest += `Referer: http://${MODEM_IP}/index.html\r\n`;
        httpRequest += `Content-Length: ${Buffer.byteLength(payloadString)}\r\n`;
        httpRequest += `Connection: close\r\n\r\n`;
        httpRequest += payloadString;

        client.write(httpRequest);
      });

      client.on("data", (data) => {
        responseData += data.toString();
      });

      client.on("end", () => {
        resolve(responseData);
      });

      client.on("error", (err) => {
        reject(err);
      });
    });

    // Manual Regex string matching on the raw TCP data stream
    console.log("Raw Network Data Captured successfully.");

    // Search raw response body text for a "stok" property
    const stokMatch = rawResponse.match(/"stok"\s*:\s*"([^"]+)"/);
    if (stokMatch && stokMatch[1]) {
      automatedStok = stokMatch[1];
      console.log(
        `SPECTRS: Socket Bypass Successful! Session STOK: ${automatedStok}`,
      );
      return automatedStok;
    }

    // Search raw response headers text for a Cookie "stok"
    const cookieMatch = rawResponse.match(/stok=([^;\s\r\n]+)/);
    if (cookieMatch && cookieMatch[1]) {
      automatedStok = cookieMatch[1];
      console.log(
        `SPECTRS: Socket Bypass Successful via Header Match! Token: ${automatedStok}`,
      );
      return automatedStok;
    }

    console.log(
      "SPECTRS: Credentials processed, but no login token found in raw output string.",
    );
    if (rawResponse.includes("result")) {
      console.log("Details:", rawResponse.substring(rawResponse.indexOf("{")));
    }
    return null;
  } catch (err) {
    console.log("Handshake Error:", err.message);
    return null;
  }
}

function computeBand(cellId) {
  if (!cellId) return "Unknown Band";
  const decId = parseInt(cellId, 16);
  const lastDigit = decId % 10;
  if (lastDigit === 1 || lastDigit === 2) return "Band 3 (1800 MHz)";
  if (lastDigit === 3) return "Band 7 (2600 MHz)";
  if (lastDigit === 4 || lastDigit === 5) return "Band 1 (2100 MHz)";
  return "Band 20 (800 MHz)";
}

// Helper function to query a single parameter via raw TCP sockets
function queryModemMetricViaSocket(cmd, stok) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let responseData = "";

    client.connect(80, MODEM_IP, () => {
      let httpRequest = `GET /goform/goform_get_cmd_process?cmd=${cmd}&multi_data=1&isTest=false&stok=${stok}&_=${Date.now()} HTTP/1.1\r\n`;
      httpRequest += `Host: ${MODEM_IP}\r\n`;
      httpRequest += `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`;
      httpRequest += `Referer: http://${MODEM_IP}/index.html\r\n`;
      httpRequest += `Cookie: stok=${stok};\r\n`;
      httpRequest += `Connection: close\r\n\r\n`;

      client.write(httpRequest);
    });

    client.on("data", (data) => {
      responseData += data.toString();
    });

    client.on("end", () => {
      try {
        const jsonStart = responseData.indexOf("{");
        if (jsonStart !== -1) {
          const jsonString = responseData.substring(jsonStart);
          const parsed = JSON.parse(jsonString);
          resolve(parsed);
        }
      } catch (e) {
        console.log(`Error parsing JSON for command ${cmd}:`, e.message);
      }
      resolve({});
    });

    client.on("error", () => {
      resolve({});
    });
  });
}

app.post("/api/telemetry", async (req, res) => {
  try {
    if (!automatedStok) {
      const tokenCheck = await fetchTokenAutomatically();
      if (!tokenCheck) throw new Error("Auth sync failed.");
    }

    const targetCommands = [
      "lte_rsrp",
      "lte_rsrq",
      "lte_snr",
      "lte_rssi",
      "network_type",
      "network_provider",
      "cell_id",
      "wifi_access_sta_num",
      "monthly_rx_bytes",
      "monthly_tx_bytes",
    ];

    const data = {};
    console.log("SPECTRS: Polling modem metrics via Raw Sockets...");

    // Query each metric one-by-one safely through the socket pipeline
    for (const cmd of targetCommands) {
      const result = await queryModemMetricViaSocket(cmd, automatedStok);
      if (result && result[cmd] !== undefined) {
        data[cmd] = result[cmd];
      }
      await new Promise((r) => setTimeout(r, 15)); // 15ms breath loop
    }

    // Validate core link parameters
    if (data.lte_rsrp !== undefined && data.lte_rsrp !== "") {
      const rx = parseInt(data.monthly_rx_bytes) || 0;
      const tx = parseInt(data.monthly_tx_bytes) || 0;
      let displayData = "0 MB";

      if (rx + tx > 0) {
        displayData = `${((rx + tx) / (1024 * 1024)).toFixed(0)} MB`;
      }

      return res.json({
        status: "ONLINE",
        rsrp: parseInt(data.lte_rsrp),
        rsrq: parseInt(data.lte_rsrq) || -10,
        rssi: parseInt(data.lte_rssi) || -68,
        dataUsed: displayData,
        connectedDevices: parseInt(data.wifi_access_sta_num) || 0,
        networkOperator: data.network_provider || "Network Provider",
        band: computeBand(data.cell_id),
      });
    }

    throw new Error("Session explicitly dropped by gateway tracking.");
  } catch (error) {
    console.log("Telemetry stream severed. Invalidating token context...");
    automatedStok = "";

    res.json({
      status: "OFFLINE_REFRESHING",
      rsrp: -140,
      rsrq: -20,
      rssi: -113,
      dataUsed: "--- MB",
      connectedDevices: 0,
      networkOperator: "SPECTRS (Rebuilding Socket...)",
      band: "Scanning...",
    });
  }
});

app.listen(4000, () =>
  console.log("SPECTRS Native Engine active on port 4000"),
);

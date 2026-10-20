
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.PLC_API_KEY;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(__dirname));

let latestData = null;

function validApiKey(receivedKey) {
    if (!API_KEY || !receivedKey) return false;

    const expected = Buffer.from(API_KEY);
    const received = Buffer.from(receivedKey);

    return expected.length === received.length &&
        crypto.timingSafeEqual(expected, received);
}

app.post("/api/plc-data", (req, res) => {
    if (!validApiKey(req.get("x-api-key"))) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { year, month, day, hour, minute, second } = req.body;

    const values = [year, month, day, hour, minute, second];

    if (!values.every(Number.isInteger)) {
        return res.status(400).json({ error: "Invalid PLC values" });
    }

    latestData = {
        year, month, day, hour, minute, second,
        receivedAt: new Date().toISOString()
    };

    res.json({ success: true });
});

app.get("/api/plc-data", (req, res) => {
    if (!latestData) {
        return res.json({ connected: false, data: null });
    }

    const age = Date.now() - Date.parse(latestData.receivedAt);

    res.json({
        connected: age < 5000,
        data: latestData
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "running" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`PLC dashboard server listening on port ${PORT}`);
});

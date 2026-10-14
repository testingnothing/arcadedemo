const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;

if (!ADMIN_TOKEN || !DEVICE_TOKEN) {
    throw new Error("Set ADMIN_TOKEN and DEVICE_TOKEN environment variables");
}

app.use(express.json());

// Serve index.html from the repository root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function requireToken(expected) {
    return (req, res, next) => {
        if (req.get("Authorization") !== `Bearer ${expected}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        next();
    };
}

let desired = { led1: false, led2: false };
let actual = { led1: false, led2: false };
let lastSeen = null;

// Dashboard reads LED states
app.get("/api/leds", requireToken(ADMIN_TOKEN), (req, res) => {
    res.json({
        led1: actual.led1,
        led2: actual.led2,
        deviceOnline: lastSeen !== null &&
            Date.now() - lastSeen < 15000
    });
});

// Dashboard requests LED changes
app.post("/api/leds", requireToken(ADMIN_TOKEN), (req, res) => {
    if (typeof req.body.led1 === "boolean") {
        desired.led1 = req.body.led1;
    }

    if (typeof req.body.led2 === "boolean") {
        desired.led2 = req.body.led2;
    }

    res.json({ accepted: true });
});

// ESP32 retrieves requested LED states
app.get("/device/commands", requireToken(DEVICE_TOKEN), (req, res) => {
    res.json(desired);
});

// ESP32 reports actual LED states
app.post("/device/status", requireToken(DEVICE_TOKEN), (req, res) => {
    if (typeof req.body.led1 === "boolean") actual.led1 = req.body.led1;
    if (typeof req.body.led2 === "boolean") actual.led2 = req.body.led2;

    lastSeen = Date.now();
    res.json({ received: true });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
});

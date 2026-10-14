const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DEVICE_TOKEN = process.env.DEVICE_TOKEN;

if (!ADMIN_TOKEN || !DEVICE_TOKEN) {
    throw new Error("Set ADMIN_TOKEN and DEVICE_TOKEN environment variables");
}

let desired = { led1: false, led2: false };
let actual = { led1: false, led2: false };
let lastSeen = null;

function authorized(token) {
    return token === `Bearer ${token === null ? "" : token}`;
}

function requireToken(expected) {
    return (req, res, next) => {
        const supplied = req.get("Authorization");
        if (!supplied || supplied !== `Bearer ${expected}`) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        next();
    };
}

// Dashboard reads the latest device status.
app.get("/api/leds", requireToken(ADMIN_TOKEN), (req, res) => {
    res.json({
        led1: actual.led1,
        led2: actual.led2,
        deviceOnline: lastSeen !== null &&
            Date.now() - lastSeen < 15000
    });
});

// Dashboard requests LED changes.
app.post("/api/leds", requireToken(ADMIN_TOKEN), (req, res) => {
    if (typeof req.body.led1 === "boolean") {
        desired.led1 = req.body.led1;
    }

    if (typeof req.body.led2 === "boolean") {
        desired.led2 = req.body.led2;
    }

    res.json({ accepted: true });
});

// ESP32 polls for the latest desired states.
app.get("/device/commands", requireToken(DEVICE_TOKEN), (req, res) => {
    res.json(desired);
});

// ESP32 reports its current output states.
app.post("/device/status", requireToken(DEVICE_TOKEN), (req, res) => {
    if (typeof req.body.led1 === "boolean") actual.led1 = req.body.led1;
    if (typeof req.body.led2 === "boolean") actual.led2 = req.body.led2;

    lastSeen = Date.now();
    res.json({ received: true });
});

app.get("/", (req, res) => {
    res.send("LED control backend is running");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`LED backend listening on port ${PORT}`);
});
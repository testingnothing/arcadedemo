
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the webpage from the repository root.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Requested LED states and reported physical states.
let desired = { led1: false, led2: false };
let actual = { led1: false, led2: false };
let lastSeen = null;

// Website reads the current state.
app.get("/api/leds", (req, res) => {
    res.json({
        led1: actual.led1,
        led2: actual.led2,
        deviceOnline: lastSeen !== null &&
            Date.now() - lastSeen < 15000
    });
});

// Website requests a change.
app.post("/api/leds", (req, res) => {
    if (typeof req.body.led1 === "boolean") {
        desired.led1 = req.body.led1;
    }

    if (typeof req.body.led2 === "boolean") {
        desired.led2 = req.body.led2;
    }

    res.json({ accepted: true });
});

// ESP32 retrieves the requested states.
app.get("/device/commands", (req, res) => {
    res.json(desired);
});

// ESP32 reports its current output states.
app.post("/device/status", (req, res) => {
    if (typeof req.body.led1 === "boolean") {
        actual.led1 = req.body.led1;
    }

    if (typeof req.body.led2 === "boolean") {
        actual.led2 = req.body.led2;
    }

    lastSeen = Date.now();

    res.json({ received: true });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`LED server running on port ${PORT}`);
});

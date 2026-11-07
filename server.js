const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy
app.set("trust proxy", 1);

// Log file location
const DATA_DIR = path.join(__dirname, "data");
const LOG_FILE = path.join(DATA_DIR, "visitors.txt");

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Serialize writes to avoid simultaneous requests overwriting each other
let writeQueue = Promise.resolve();

function logVisitor(ip) {
    writeQueue = writeQueue.then(async () => {
        const timestamp = new Date().toISOString();

        const entry =
            `IP: ${ip} | Timestamp: ${timestamp}\n`;

        let existingData = "";

        try {
            existingData = await fs.promises.readFile(
                LOG_FILE,
                "utf8"
            );
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }

        // Newest entry goes first
        const updatedData = entry + existingData;

        const tempFile = LOG_FILE + ".tmp";

        await fs.promises.writeFile(
            tempFile,
            updatedData,
            "utf8"
        );

        await fs.promises.rename(tempFile, LOG_FILE);
    });

    return writeQueue;
}

// Homepage
app.get("/", async (req, res) => {
    try {
        const visitorIP = req.ip || "Unknown";

        await logVisitor(visitorIP);

        res.set("Cache-Control", "no-store");

        res.sendFile(
            path.join(__dirname, "public", "index.html")
        );

    } catch (error) {
        console.error("Logging error:", error);
        res.status(500).send("Unable to record visit.");
    }
});

// Health check
app.get("/health", (req, res) => {
    res.send("Server is running");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});

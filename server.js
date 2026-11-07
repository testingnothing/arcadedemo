
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing");
}

const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
});

let visitors;

// Connect to MongoDB
async function connectDB() {
    await client.connect();

    const db = client.db("visitor_logger");
    visitors = db.collection("visitors");

    await visitors.createIndex({ createdAt: -1 });

    console.log("Connected to MongoDB Atlas");
}

// Get visitor IP
function getVisitorIP(req) {
    const forwardedFor = req.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || "Unknown";
}

// Record visitor
async function recordVisitor(req) {
    const ip = getVisitorIP(req);

    await visitors.insertOne({
        ip: ip,
        createdAt: new Date()
    });

    console.log("Visitor recorded:", ip);
}

// Homepage
app.get("/", async (req, res) => {
    try {
        await recordVisitor(req);

        res.set("Cache-Control", "no-store");

        res.sendFile(
            path.join(__dirname, "public", "index.html")
        );

    } catch (error) {
        console.error("Visitor logging failed:", error);

        res.status(500).send(
            "Unable to load the website. Please try again."
        );
    }
});

// Admin page
app.get("/admin", (req, res) => {
    res.set("X-Robots-Tag", "noindex, nofollow");

    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

// Visitor records API
app.get("/api/visitors", async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 50, 1),
            100
        );

        const skip = Math.max(
            parseInt(req.query.skip) || 0,
            0
        );

        const [records, total] = await Promise.all([
            visitors.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),

            visitors.countDocuments()
        ]);

        res.set("Cache-Control", "no-store");

        res.json({
            total,
            limit,
            skip,
            records: records.map(record => ({
                ip: record.ip,
                timestamp: record.createdAt
            }))
        });

    } catch (error) {
        console.error("Admin API error:", error);

        res.status(500).json({
            error: "Unable to retrieve visitor records"
        });
    }
});

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "running" });
});

// Serve photo and other static assets
app.use(express.static(
    path.join(__dirname, "public")
));

// Start server only after database connection
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}

startServer();

import { config } from 'dotenv';
config();

process.env.TZ = "UTC";

import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { UAParser } from "ua-parser-js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import auth from "#routes/auth.routes.js";
import admin from "#routes/admin.routes.js";
import web from "#routes/web.routes.js";
import passport from 'passport';
import sessionMiddleware from '#config/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;
const APP_VERSION = "v1";
const REQUEST_SIZE_LIMIT = `${process.env.REQUEST_SIZE_LIMIT || 10}mb`;

// Security
app.use(helmet());
app.set("trust proxy", 1);

// Rate limiting — applied before body parsing
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(o => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        const formatted = origin.trim().replace(/\/$/, "");
        if (allowedOrigins.includes(formatted)) return callback(null, true);
        console.error(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
app.options("/{*splat}", cors());

// Parsing
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(bodyParser.json({ limit: REQUEST_SIZE_LIMIT }));
app.use(bodyParser.urlencoded({ limit: REQUEST_SIZE_LIMIT, extended: true }));
app.use(passport.initialize());

// Static assets
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Routes
app.use(`/${APP_VERSION}/auth`, auth);
app.use(`/${APP_VERSION}/admin`, admin);
app.use(`/${APP_VERSION}`, web);

// Root — UA parser (consider removing or restricting in production)
app.get("/", (req, res) => {
    const parsedData = new UAParser(req.headers["user-agent"]).getResult();
    res.json({ success: true, data: parsedData });
});

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running.",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Global error handler:", err);

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            success: false,
            message: "CORS policy violation",
            error: err.message,
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

// Startup
const shutdown = (signal) => {
    console.log(`${signal} received: closing server`);
    server.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
};

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} — http://localhost:${PORT}/`);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export default app;
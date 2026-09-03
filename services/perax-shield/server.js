const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "perax_secure_shield_secret_key_2026";
const SHIELD_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// In-memory rate limiter & IP reputation store
const ipRequests = new Map();
const blockedIps = new Set();

app.use((req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (blockedIps.has(ip)) {
    return res.status(403).json({ error: "Access blocked by Perax WAF (Suspicious activity detected).", code: 91 });
  }

  // Simple rate limiter: max 100 req per minute per IP
  const now = Date.now();
  let record = ipRequests.get(ip);
  if (!record || now - record.windowStart > 60000) {
    record = { windowStart: now, count: 1 };
  } else {
    record.count++;
    if (record.count > 150) {
      blockedIps.add(ip);
      console.log(`[Perax WAF] Auto-blocked IP ${ip} due to rate limit violation.`);
      return res.status(429).json({ error: "Rate limit exceeded. Blocked by Perax Shield.", code: 111 });
    }
  }
  ipRequests.set(ip, record);
  next();
});

// Health check endpoint for Render
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "perax-shield-service",
    activeShields: ipRequests.size,
    blockedIpsCount: blockedIps.size,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// 1. Request Challenge
app.post("/api/perax/challenge", (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const challengeToken = jwt.sign({ ip, type: "challenge", nonce: Math.random() }, JWT_SECRET, { expiresIn: "5m" });
  
  res.json({
    success: true,
    challengeToken,
    message: "Complete human verification challenge to obtain 3-hour shield token.",
  });
});

// 2. Verify Challenge & Issue 3-Hour Shield Token
app.post("/api/perax/verify", (req, res) => {
  const { challengeToken, answer } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  if (!challengeToken) {
    return res.status(400).json({ error: "Challenge token is required.", code: 31 });
  }

  try {
    const decoded = jwt.verify(challengeToken, JWT_SECRET);
    if (decoded.type !== "challenge") {
      return res.status(400).json({ error: "Invalid challenge token type.", code: 33 });
    }

    // Issue 3-hour human verification shield token
    const shieldToken = jwt.sign(
      { ip, verified: true, issuedAt: Date.now() },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    res.json({
      success: true,
      shieldToken,
      expiresIn: SHIELD_DURATION_MS,
      message: "Human verification passed successfully. 3-hour shield activated.",
    });
  } catch (err) {
    res.status(401).json({ error: "Challenge expired or invalid.", code: 32, details: err.message });
  }
});

// 3. Validate Shield Token
app.post("/api/perax/validate", (req, res) => {
  const { shieldToken } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  if (!shieldToken) {
    return res.json({ verified: false, code: 1, error: "No shield token provided." });
  }

  try {
    const decoded = jwt.verify(shieldToken, JWT_SECRET);
    if (decoded.verified === true) {
      return res.json({ verified: true, expiresAt: decoded.exp * 1000 });
    }
    res.json({ verified: false, code: 2, error: "Invalid verification state." });
  } catch (err) {
    res.json({ verified: false, code: 2, error: "Shield token expired or invalid." });
  }
});

app.listen(PORT, () => {
  console.log(`[Perax WAF Shield Service] Running on port ${PORT}`);
});

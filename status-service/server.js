const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const MAIN_URL = (process.env.MAIN_URL || "https://parax-vqqb.onrender.com").replace(/\/$/, "");

app.set("trust proxy", 1);
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "parax-status", upstream: MAIN_URL });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "status.html"));
});

// Proxy the live summary from the main server so this service
// needs no Firebase credentials and can never drift from it.
app.get("/api/status/summary", async (_req, res) => {
  try {
    const r = await fetch(MAIN_URL + "/api/status/summary");
    if (!r.ok) {
      res.status(502).json({ error: "Upstream status unavailable" });
      return;
    }
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ error: "Upstream status unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`[Parax Status] Running on port ${PORT}, upstream ${MAIN_URL}`);
});

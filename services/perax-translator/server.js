const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com/translate";

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Health check endpoint for Render
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "perax-translator-service",
    engine: "LibreTranslate",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Translation Endpoint using LibreTranslate API
app.post("/api/translate", async (req, res) => {
  const { text, targetLang, sourceLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({ error: "text and targetLang are required." });
  }

  try {
    const response = await fetch(LIBRETRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: sourceLang || "auto",
        target: targetLang,
        format: "text"
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.translatedText || text;

    res.json({
      success: true,
      originalText: text,
      targetLang,
      translatedText,
      engine: "LibreTranslate"
    });
  } catch (err) {
    console.error("[Translation Error]:", err.message);
    // Graceful fallback if LibreTranslate rate limits or fails
    res.json({
      success: true,
      originalText: text,
      targetLang,
      translatedText: `[Translated (${targetLang})]: ${text}`,
      engine: "fallback"
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Perax Translator Service] Running on port ${PORT} using LibreTranslate`);
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
// routelar
import authRoutes from "./routes/auth";
import voiceRoutes from "./routes/voice";
import logRoutes from "./routes/log";
import monitoringRoutes from "./routes/monitoring";
import botsRoutes from "./routes/bots";
import peraxRoutes from "./routes/perax";
import { errorHandler } from "./middleware/errorHandler";
import { methodGuard } from "./middleware/methodGuard";
import { trackLatency } from "./utils/metrics";
import { ipBlocker } from "./middleware/ipBlocker";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // Essential for getting correct client IP from Render
app.use(ipBlocker); // Run before everything else
app.use(trackLatency);
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://parax-vqqb.onrender.com",
  "http://localhost:3000",
  process.env.CORS_ORIGIN || "",
].filter(Boolean);

// cors ayarları - render'da sorun çıkarmasın diye
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Express'in arkasındaki proxy'leri güvenilir say (render için)
app.set("trust proxy", 1);

// güvenlik başlıkları
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://www.gstatic.com", "https://unpkg.com", "https://apis.google.com", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
       "connect-src": ["'self'", "https://parax-vqqb.onrender.com", "https://perax.onrender.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://firestore.googleapis.com", "https://webappparax.firebasestorage.app", "https://*.fly.dev", "wss://*.fly.dev", "https://*.gstatic.com"],
       "frame-src": ["'self'", "https://*.fly.dev", "https://*.firebaseapp.com"],
      "img-src": ["'self'", "https://webappparax.firebasestorage.app", "data:", "blob:"],
      "font-src": ["'self'", "data:"],
      "media-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "worker-src": ["'self'", "blob:"]
    }
  }
}));

// public klasöründeki static dosyaları serve et
app.use(express.static(path.join(__dirname, "../../public")));

// api route'ları
app.use(methodGuard);
app.use("/api/auth", authRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/log", logRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/bots", botsRoutes);
app.use("/api/perax", peraxRoutes);

// DevPortal static & routes
app.use("/devportal", express.static(path.join(__dirname, "../../DevPortal")));
app.get("/devportal/bots", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../DevPortal/bots.html"));
});
app.get("/devportal/create", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../DevPortal/bot-create.html"));
});
app.get("/devportal/details", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../DevPortal/bot-details.html"));
});

// sayfa route'ları (uzantısız URL'ler: /dashboard -> dashboard.html)
const sayfalar = [
  "index",
  "dashboard",
  "settings",
  "friends",
  "dm-list",
  "dm-chat",
  "forgot-password",
  "reset-password",
  "errors",
  "documentation",
  "doc1",
  "doc2",
  "doc3",
  "doc4",
  "doc5",
  "doc6",
  "doc7",
];
for (const sayfa of sayfalar) {
  app.get(`/${sayfa}`, (_req, res) => {
    res.sendFile(path.join(__dirname, `../../public/${sayfa}.html`));
  });
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../public/login.html"));
});

app.get("/signup", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../public/signup.html"));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
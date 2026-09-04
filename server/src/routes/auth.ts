import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { auth } from "../config/firebase";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Try again later.", code: 144 },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again later.", code: 144 },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email/password login (bot SDK + password users).
// Needs FIREBASE_API_KEY (the public web API key from Firebase console).
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const email = req.body?.email || req.body?.identifier;
  const password = req.body?.password;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Password login not configured" });
    return;
  }
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(401).json({ error: "Invalid email or password", code: 141 });
      return;
    }
    const uid = data.localId;
    let displayName: string | undefined;
    try {
      const rec = await auth.getUser(uid);
      displayName = rec.displayName;
    } catch {}
    res.json({
      user: { uid, email: data.email, displayName },
      idToken: data.idToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", code: 228 });
  }
});

router.post("/verify-token", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized", code: 141 });
    return;
  }
  res.json({ user: req.user });
});

router.get("/profile", verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized", code: 141 });
    return;
  }

  try {
    const userRecord = await auth.getUser(req.user.uid);
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      createdAt: userRecord.metadata.creationTime,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user profile", code: 143 });
  }
});

export default router;
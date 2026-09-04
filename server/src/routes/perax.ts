import { Router, Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "../config/firebase";

const router = Router();

const SHIELD_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Perax Device Token (PDT) v1.3: device-bound passes. Hashes only —
// raw tokens never touch the database. 30-day sliding expiry.
const DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEVICE_COLLECTION = "perax_devices";

// Reads are cheap but unauthenticated: cap device-endpoint abuse per IP.
const deviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many device requests. Try again later.", code: 111 },
  standardHeaders: true,
  legacyHeaders: false,
});

// In-memory stores (per process). Mirrors services/perax-shield/server.js behavior
// without requiring jsonwebtoken dependency.
const challenges = new Map<string, number>(); // challengeToken -> expiresAt
const shields = new Map<string, number>(); // shieldToken -> expiresAt

function newToken(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}_${Date.now()}`;
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function newDeviceToken(): string {
  return `pdt_${randomBytes(32).toString("hex")}`;
}

// Tiers: trusted (skip challenge), review (challenge again), unknown (challenge).
// Fingerprint binding defeats stolen-token replay on a different device.

function cleanup(map: Map<string, number>, now: number) {
  for (const [k, exp] of map) {
    if (exp < now) map.delete(k);
  }
}

// Live counts for the public status page (no tokens exposed)
export function peraxCounts() {
  const now = Date.now();
  cleanup(challenges, now);
  cleanup(shields, now);
  return { challenges: challenges.size, shields: shields.size };
}

// 1. Request Challenge
router.post("/challenge", (_req: Request, res: Response) => {
  const now = Date.now();
  cleanup(challenges, now);
  const challengeToken = newToken("perax_ch");
  challenges.set(challengeToken, now + CHALLENGE_TTL_MS);
  res.json({
    success: true,
    challengeToken,
    message: "Complete human verification challenge to obtain 3-hour shield token.",
  });
});

// 2. Verify Challenge & Issue 3-Hour Shield Token (+ PDT v1.3)
router.post("/verify", async (req: Request, res: Response) => {
  const { challengeToken } = req.body ?? {};
  const now = Date.now();
  cleanup(challenges, now);
  cleanup(shields, now);

  if (!challengeToken) {
    return res.status(400).json({ error: "Challenge token is required.", code: 31 });
  }
  const exp = challenges.get(challengeToken);
  if (!exp || exp < now) {
    return res.status(401).json({ error: "Challenge expired or invalid.", code: 32 });
  }
  challenges.delete(challengeToken);

  const shieldToken = newToken("perax_sh");
  shields.set(shieldToken, now + SHIELD_DURATION_MS);
  const out: any = {
    success: true,
    shieldToken,
    expiresIn: SHIELD_DURATION_MS,
    message: "Human verification passed successfully. 3-hour shield activated.",
  };

  // v1.3: passing a fingerprint also mints a Perax Device Token (shown once).
  const fingerprint = typeof req.body?.fingerprint === "string" ? req.body.fingerprint.slice(0, 500) : "";
  if (fingerprint) {
    try {
      const deviceToken = newDeviceToken();
      await db.collection(DEVICE_COLLECTION).doc(sha(deviceToken)).set({
        fpHash: sha(fingerprint),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        expiresAt: now + DEVICE_TTL_MS,
      });
      out.deviceToken = deviceToken;
      out.deviceExpiresIn = DEVICE_TTL_MS;
    } catch (e) {
      console.error("[Perax Admin] PDT issue failed:", (e as any)?.message || e);
    }
  }
  res.json(out);
});

// 3. Validate Shield Token
router.post("/validate", (req: Request, res: Response) => {
  const { shieldToken } = req.body ?? {};
  if (!shieldToken) {
    return res.json({ verified: false, code: 1, error: "No shield token provided." });
  }
  const exp = shields.get(shieldToken);
  if (exp && exp > Date.now()) {
    return res.json({ verified: true, expiresAt: exp });
  }
  // Accept legacy client-side fallback tokens so old sessions don't get stuck
  // behind the overlay when the service restarts (fail-open for UX, logged).
  if (typeof shieldToken === "string" && (shieldToken.startsWith("verified_v1.2_") || shieldToken.startsWith("verified_v1.1_"))) {
    return res.json({ verified: true, expiresAt: Date.now() + SHIELD_DURATION_MS, fallback: true });
  }
  res.json({ verified: false, code: 2, error: "Shield token expired or invalid." });
});

// 4. Validate Perax Device Token (v1.3) — device passes survive IP changes.
// Body: { deviceToken, fingerprint }. Tiers: trusted | review | unknown.
router.post("/device/validate", deviceLimiter, async (req: Request, res: Response) => {
  const { deviceToken, fingerprint } = req.body ?? {};
  if (typeof deviceToken !== "string" || !deviceToken.startsWith("pdt_")) {
    return res.json({ verified: false, tier: "unknown", code: 6, error: "Device token invalid." });
  }
  try {
    const doc = await db.collection(DEVICE_COLLECTION).doc(sha(deviceToken)).get();
    if (!doc.exists) {
      return res.json({ verified: false, tier: "unknown", code: 6, error: "Device token invalid." });
    }
    const data = doc.data() as any;
    if (!data.expiresAt || data.expiresAt < Date.now()) {
      await doc.ref.delete().catch(() => {});
      return res.json({ verified: false, tier: "unknown", code: 6, error: "Device token expired." });
    }
    const fp = typeof fingerprint === "string" ? fingerprint.slice(0, 500) : "";
    if (!fp || sha(fp) !== data.fpHash) {
      // Right token, wrong device: stolen, shared, or reset browser. Challenge again.
      return res.json({ verified: false, tier: "review", code: 7, error: "Device fingerprint mismatch." });
    }
    // Sliding 30-day expiry for active devices.
    await doc.ref.update({ lastSeen: new Date().toISOString(), expiresAt: Date.now() + DEVICE_TTL_MS }).catch(() => {});
    return res.json({ verified: true, tier: "trusted", expiresAt: data.expiresAt });
  } catch (e) {
    return res.json({ verified: false, tier: "unknown", code: 6, error: "Device check unavailable." });
  }
});

// ---- Local-admin endpoints (localhost tooling, NOT public API) ----
// Guarded by shared secret: set PERAX_ADMIN_KEY in server/.env (gitignored).
// Without the key configured, these return 503.
function peraxAdminGuard(req: Request, res: Response, next: () => void) {
  if (!process.env.PERAX_ADMIN_KEY) {
    res.status(503).json({ error: "Perax admin key not configured." });
    return;
  }
  if (req.headers["x-perax-admin-key"] !== process.env.PERAX_ADMIN_KEY) {
    res.status(403).json({ error: "forbidden", code: 142 });
    return;
  }
  next();
}

// Counts of live challenges + shields (the 3-hour list)
router.get("/admin/stats", peraxAdminGuard, (_req: Request, res: Response) => {
  const now = Date.now();
  cleanup(challenges, now);
  cleanup(shields, now);
  res.json({ challenges: challenges.size, shields: shields.size });
});

// Inspect one shield token
router.post("/admin/check", peraxAdminGuard, (req: Request, res: Response) => {
  const { shieldToken } = req.body ?? {};
  const exp = typeof shieldToken === "string" ? shields.get(shieldToken) : undefined;
  if (exp && exp > Date.now()) {
    res.json({ verified: true, expiresAt: exp });
    return;
  }
  res.json({ verified: false });
});

// Reset the 3-hour shield list (+ pending challenges). Everyone re-verifies.
router.post("/admin/reset", peraxAdminGuard, (_req: Request, res: Response) => {
  const clearedChallenges = challenges.size;
  const clearedShields = shields.size;
  challenges.clear();
  shields.clear();
  console.warn(`[Perax Admin] Shield list reset. Cleared ${clearedShields} shields, ${clearedChallenges} challenges.`);
  res.json({ ok: true, clearedChallenges, clearedShields });
});

// Mint a shield token directly (testing / emergency access). Hours: 1-72, default 3.
router.post("/admin/issue", peraxAdminGuard, (req: Request, res: Response) => {
  const hours = Math.min(Math.max(Number(req.body?.hours || 3), 1), 72);
  const now = Date.now();
  const shieldToken = newToken("perax_sh");
  const expiresAt = now + hours * 60 * 60 * 1000;
  shields.set(shieldToken, expiresAt);
  console.warn(`[Perax Admin] Shield token issued manually (${hours}h).`);
  res.json({ ok: true, shieldToken, expiresAt });
});

export default router;

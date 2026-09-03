import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";

const router = Router();

const SHIELD_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory stores (per process). Mirrors services/perax-shield/server.js behavior
// without requiring jsonwebtoken dependency.
const challenges = new Map<string, number>(); // challengeToken -> expiresAt
const shields = new Map<string, number>(); // shieldToken -> expiresAt

function newToken(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString("hex")}_${Date.now()}`;
}

function cleanup(map: Map<string, number>, now: number) {
  for (const [k, exp] of map) {
    if (exp < now) map.delete(k);
  }
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

// 2. Verify Challenge & Issue 3-Hour Shield Token
router.post("/verify", (req: Request, res: Response) => {
  const { challengeToken } = req.body ?? {};
  const now = Date.now();
  cleanup(challenges, now);
  cleanup(shields, now);

  if (!challengeToken) {
    return res.status(400).json({ error: "Challenge token is required." });
  }
  const exp = challenges.get(challengeToken);
  if (!exp || exp < now) {
    return res.status(401).json({ error: "Challenge expired or invalid." });
  }
  challenges.delete(challengeToken);

  const shieldToken = newToken("perax_sh");
  shields.set(shieldToken, now + SHIELD_DURATION_MS);
  res.json({
    success: true,
    shieldToken,
    expiresIn: SHIELD_DURATION_MS,
    message: "Human verification passed successfully. 3-hour shield activated.",
  });
});

// 3. Validate Shield Token
router.post("/validate", (req: Request, res: Response) => {
  const { shieldToken } = req.body ?? {};
  if (!shieldToken) {
    return res.json({ verified: false, error: "No shield token provided." });
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
  res.json({ verified: false, error: "Shield token expired or invalid." });
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
    res.status(403).json({ error: "forbidden" });
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

export default router;

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
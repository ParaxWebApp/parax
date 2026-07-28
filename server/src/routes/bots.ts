import { Router, Response } from "express";
import { db } from "../config/firebase";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import * as crypto from "crypto";

const router = Router();

// Register a new bot
router.post("/register", verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, scopes } = req.body;
    const ownerId = req.user?.uid;

    if (!name) {
      res.status(400).json({ error: "Bot name is required" });
      return;
    }

    const clientId = "bot_" + crypto.randomBytes(8).toString("hex");
    const rawToken = "parax_bot_" + crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const botData = {
      clientId,
      tokenHash,
      name: name.trim(),
      description: description ? description.trim() : "",
      scopes: Array.isArray(scopes) ? scopes : ["message.read", "message.write"],
      ownerId,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    const docRef = await db.collection("bots").add(botData);

    res.status(201).json({
      id: docRef.id,
      clientId,
      botToken: rawToken, // Shown ONLY once!
      name: botData.name,
      description: botData.description,
      scopes: botData.scopes,
      createdAt: botData.createdAt,
    });
  } catch (error: any) {
    console.error("Error registering bot:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List developer's bots
router.get("/", verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.uid;
    const snapshot = await db.collection("bots").where("ownerId", "==", ownerId).get();

    const bots: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      bots.push({
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        description: data.description,
        scopes: data.scopes,
        createdAt: data.createdAt,
        status: data.status,
      });
    });

    res.json({ bots });
  } catch (error: any) {
    console.error("Error listing bots:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Regenerate bot token
router.post("/:id/regenerate", verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const botId = req.params.id;
    const ownerId = req.user?.uid;

    const botRef = db.collection("bots").doc(botId);
    const botDoc = await botRef.get();

    if (!botDoc.exists) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    if (botDoc.data()?.ownerId !== ownerId) {
      res.status(403).json({ error: "Forbidden: You do not own this bot" });
      return;
    }

    const rawToken = "parax_bot_" + crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await botRef.update({ tokenHash });

    res.json({
      success: true,
      botToken: rawToken, // Shown ONLY once!
    });
  } catch (error: any) {
    console.error("Error regenerating bot token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete/revoke bot
router.delete("/:id", verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const botId = req.params.id;
    const ownerId = req.user?.uid;

    const botRef = db.collection("bots").doc(botId);
    const botDoc = await botRef.get();

    if (!botDoc.exists) {
      res.status(404).json({ error: "Bot not found" });
      return;
    }

    if (botDoc.data()?.ownerId !== ownerId) {
      res.status(403).json({ error: "Forbidden: You do not own this bot" });
      return;
    }

    await botRef.delete();

    res.json({ success: true, message: "Bot deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting bot:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

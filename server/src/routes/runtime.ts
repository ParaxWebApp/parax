import { Router, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { verifyBotToken, requireBotScope, BotRequest } from "../middleware/botAuth";

export const messagesRouter = Router();
export const serversRouter = Router();

// Bot sends a message: POST /api/messages { serverCode?, channelId?, roomCode?, text }
messagesRouter.post("/", verifyBotToken, requireBotScope("send"), async (req: BotRequest, res: Response): Promise<void> => {
  try {
    const { serverCode, channelId, roomCode, text } = req.body ?? {};
    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    if (text.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 chars)" });
      return;
    }
    if (!channelId && !roomCode) {
      res.status(400).json({ error: "channelId or roomCode is required" });
      return;
    }

    // If a channel is targeted, it must exist.
    if (channelId) {
      if (!serverCode) {
        res.status(400).json({ error: "serverCode is required with channelId" });
        return;
      }
      const ch = await db.collection("servers").doc(serverCode).collection("channels").doc(channelId).get();
      if (!ch.exists) {
        res.status(404).json({ error: "Channel not found", code: 172 });
        return;
      }
    }

    const doc: any = {
      senderId: `bot:${req.bot!.clientId}`,
      senderName: req.bot!.name,
      text: text.trim(),
      createdAt: FieldValue.serverTimestamp(),
      viaBot: true,
      botId: req.bot!.id,
    };
    if (channelId) {
      doc.channelId = channelId;
      doc.serverCode = serverCode;
    } else {
      doc.roomCode = roomCode;
    }
    const ref = await db.collection("messages").add(doc);
    res.status(201).json({ id: ref.id, channelId: channelId || null, roomCode: roomCode || null, text: doc.text });
  } catch (error: any) {
    console.error("Error sending bot message:", error);
    res.status(500).json({ error: "Internal server error", code: 228 });
  }
});

// Bot lists channels: GET /api/servers/:code/channels
serversRouter.get("/:code/channels", verifyBotToken, requireBotScope("read"), async (req: BotRequest, res: Response): Promise<void> => {
  try {
    const code = req.params.code;
    const serverDoc = await db.collection("servers").doc(code).get();
    if (!serverDoc.exists) {
      res.status(404).json({ error: "Server not found", code: 172 });
      return;
    }
    const snap = await db.collection("servers").doc(code).collection("channels").get();
    res.json({
      channels: snap.docs.map((d) => {
        const c = d.data() as any;
        return { id: d.id, name: c.name, type: c.type || "text" };
      }),
    });
  } catch (error: any) {
    console.error("Error listing bot channels:", error);
    res.status(500).json({ error: "Internal server error", code: 228 });
  }
});

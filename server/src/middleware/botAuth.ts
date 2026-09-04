import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../config/firebase";

export interface BotRequest extends Request {
  bot?: {
    id: string;
    clientId: string;
    name: string;
    scopes: string[];
  };
}

// Bot token auth: Authorization: Bearer parax_bot_<secret>.
// Token hashes only — raw secrets never touch the database.
export const verifyBotToken = async (
  req: BotRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No bot token provided", code: 401 });
    return;
  }
  const raw = header.slice("Bearer ".length).trim();
  if (!raw.startsWith("parax_bot_")) {
    res.status(401).json({ error: "Unauthorized: Invalid bot token", code: 141 });
    return;
  }
  try {
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const snap = await db.collection("bots").where("tokenHash", "==", tokenHash).limit(1).get();
    if (snap.empty) {
      res.status(401).json({ error: "Unauthorized: Unknown bot token", code: 141 });
      return;
    }
    const doc = snap.docs[0];
    const data = doc.data() as any;
    if (data.status !== "active") {
      res.status(403).json({ error: "Forbidden: Bot is disabled", code: 142 });
      return;
    }
    req.bot = {
      id: doc.id,
      clientId: data.clientId,
      name: data.name,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    };
    next();
  } catch (error) {
    res.status(500).json({ error: "Bot authentication failed", code: 228 });
  }
};

// Scope gate. Accepts any of the bot's granted scopes.
// Both scope vocabularies work: DevPortal form scopes (read/send/...)
// and API scopes (message.read/message.write).
const SCOPE_ALIASES: Record<string, string[]> = {
  read: ["read", "message.read"],
  send: ["send", "message.write"],
};
export const requireBotScope = (scope: string) => {
  return (req: BotRequest, res: Response, next: NextFunction): void => {
    if (!req.bot) {
      res.status(401).json({ error: "Unauthorized", code: 141 });
      return;
    }
    const accepted = SCOPE_ALIASES[scope] || [scope];
    const ok = req.bot.scopes.includes("administrator") || accepted.some((s) => req.bot!.scopes.includes(s));
    if (!ok) {
      res.status(403).json({ error: `Forbidden: Missing scope ${scope}`, code: 142 });
      return;
    }
    next();
  };
};

import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createHash } from "crypto";
import { db } from "./config/firebase";

interface GatewayClient {
  ws: WebSocket;
  botId: string;
  clientId: string;
  name: string;
  scopes: string[];
}

const clients = new Set<GatewayClient>();
let fanoutStarted = false;

async function verifyBotWsToken(raw: string): Promise<Omit<GatewayClient, "ws"> | null> {
  if (!raw.startsWith("parax_bot_")) return null;
  try {
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const snap = await db.collection("bots").where("tokenHash", "==", tokenHash).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as any;
    if (data.status !== "active") return null;
    return {
      botId: doc.id,
      clientId: data.clientId,
      name: data.name,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
    };
  } catch {
    return null;
  }
}

function canRead(scopes: string[]): boolean {
  return scopes.includes("read") || scopes.includes("message.read") || scopes.includes("administrator");
}

// Fan-out: new chat messages -> connected bots with read scope.
// v1 listens at collection level (fine at current scale; shard per-channel later).
function startFanout() {
  if (fanoutStarted) return;
  fanoutStarted = true;
  try {
    db.collection("messages").onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;
          const m = change.doc.data() as any;
          const payload = JSON.stringify({
            type: "MESSAGE_CREATE",
            data: {
              id: change.doc.id,
              content: m.text,
              text: m.text,
              channelId: m.channelId || null,
              serverCode: m.serverCode || null,
              roomCode: m.roomCode || null,
              senderId: m.senderId,
              senderName: m.senderName,
            },
          });
          for (const c of clients) {
            if (c.ws.readyState === WebSocket.OPEN && canRead(c.scopes)) {
              try { c.ws.send(payload); } catch {}
            }
          }
        }
      },
      () => {}
    );
  } catch {}
}

// Bot gateway: clients connect wss://host?token=parax_bot_* (matches the JS SDK).
export function attachGateway(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });
  startFanout();

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = new URL(req.url || "", "http://x");
      if (url.pathname !== "/") {
        socket.destroy();
        return;
      }
      const bot = await verifyBotWsToken(url.searchParams.get("token") || "");
      if (!bot) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const client: GatewayClient = { ws, ...bot };
        clients.add(client);
        ws.send(JSON.stringify({
          t: "ready",
          bot: { clientId: bot.clientId, name: bot.name, scopes: bot.scopes },
        }));
        ws.on("message", (raw) => {
          try {
            const m = JSON.parse(String(raw));
            if (m && m.t === "ping") ws.send(JSON.stringify({ t: "pong" }));
          } catch {}
        });
        ws.on("close", () => clients.delete(client));
        ws.on("error", () => clients.delete(client));
      });
    } catch {
      try { socket.destroy(); } catch {}
    }
  });
}

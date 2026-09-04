import { Router, Request, Response } from "express";
import { db } from "../config/firebase";
import { getRequestStats } from "../utils/metrics";
import { peraxCounts } from "./perax";
import { listBlockedIPs } from "../middleware/ipBlocker";

const router = Router();

// Timezone -> approximate city point. Sourced from the visitor's own browser
// (presence heartbeat), city-level only, aggregated — never who.
const TZ: Record<string, { city: string; lat: number; lon: number }> = {
  "Europe/Istanbul": { city: "Istanbul", lat: 41.0, lon: 28.9 },
  "Europe/Moscow": { city: "Moscow", lat: 55.7, lon: 37.6 },
  "Europe/London": { city: "London", lat: 51.5, lon: -0.1 },
  "Europe/Paris": { city: "Paris", lat: 48.8, lon: 2.3 },
  "Europe/Berlin": { city: "Berlin", lat: 52.5, lon: 13.4 },
  "Europe/Madrid": { city: "Madrid", lat: 40.4, lon: -3.7 },
  "Europe/Rome": { city: "Rome", lat: 41.9, lon: 12.5 },
  "Europe/Athens": { city: "Athens", lat: 37.9, lon: 23.7 },
  "Europe/Bucharest": { city: "Bucharest", lat: 44.4, lon: 26.1 },
  "Europe/Kyiv": { city: "Kyiv", lat: 50.4, lon: 30.5 },
  "Europe/Warsaw": { city: "Warsaw", lat: 52.2, lon: 21.0 },
  "Africa/Cairo": { city: "Cairo", lat: 30.0, lon: 31.2 },
  "Africa/Lagos": { city: "Lagos", lat: 6.5, lon: 3.3 },
  "Africa/Johannesburg": { city: "Johannesburg", lat: -26.2, lon: 28.0 },
  "Asia/Dubai": { city: "Dubai", lat: 25.2, lon: 55.2 },
  "Asia/Baghdad": { city: "Baghdad", lat: 33.3, lon: 44.3 },
  "Asia/Riyadh": { city: "Riyadh", lat: 24.6, lon: 46.6 },
  "Asia/Tehran": { city: "Tehran", lat: 35.6, lon: 51.4 },
  "Asia/Karachi": { city: "Karachi", lat: 24.8, lon: 67.0 },
  "Asia/Kolkata": { city: "Kolkata", lat: 22.5, lon: 88.3 },
  "Asia/Dhaka": { city: "Dhaka", lat: 23.8, lon: 90.4 },
  "Asia/Bangkok": { city: "Bangkok", lat: 13.7, lon: 100.5 },
  "Asia/Singapore": { city: "Singapore", lat: 1.3, lon: 103.8 },
  "Asia/Kuala_Lumpur": { city: "Kuala Lumpur", lat: 3.1, lon: 101.6 },
  "Asia/Jakarta": { city: "Jakarta", lat: -6.2, lon: 106.8 },
  "Asia/Manila": { city: "Manila", lat: 14.5, lon: 120.9 },
  "Asia/Taipei": { city: "Taipei", lat: 25.0, lon: 121.5 },
  "Asia/Seoul": { city: "Seoul", lat: 37.5, lon: 127.0 },
  "Asia/Tokyo": { city: "Tokyo", lat: 35.6, lon: 139.6 },
  "Asia/Shanghai": { city: "Shanghai", lat: 31.2, lon: 121.4 },
  "Asia/Almaty": { city: "Almaty", lat: 43.2, lon: 76.9 },
  "Australia/Sydney": { city: "Sydney", lat: -33.8, lon: 151.2 },
  "Pacific/Auckland": { city: "Auckland", lat: -36.8, lon: 174.7 },
  "America/New_York": { city: "New York", lat: 40.7, lon: -74.0 },
  "America/Chicago": { city: "Chicago", lat: 41.8, lon: -87.6 },
  "America/Denver": { city: "Denver", lat: 39.7, lon: -105.0 },
  "America/Los_Angeles": { city: "Los Angeles", lat: 34.0, lon: -118.2 },
  "America/Anchorage": { city: "Anchorage", lat: 61.2, lon: -149.9 },
  "Pacific/Honolulu": { city: "Honolulu", lat: 21.3, lon: -157.8 },
  "America/Toronto": { city: "Toronto", lat: 43.6, lon: -79.3 },
  "America/Mexico_City": { city: "Mexico City", lat: 19.4, lon: -99.1 },
  "America/Bogota": { city: "Bogota", lat: 4.7, lon: -74.0 },
  "America/Sao_Paulo": { city: "Sao Paulo", lat: -23.5, lon: -46.6 },
};

// Public status snapshot for the live status page. Aggregates only —
// no user ids, no tokens, no IPs leave this endpoint.
router.get("/summary", async (_req: Request, res: Response) => {
  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      console.error(`[status] ${label} failed:`, e?.message || e);
      return fallback;
    }
  }

  try {
    const [onSnap, idleSnap, usersCount] = await Promise.all([
      safe("presence-online", () => db.collection("presence").where("status", "==", "online").limit(1000).get(), { docs: [] as any[], size: 0 } as any),
      safe("presence-idle", () => db.collection("presence").where("status", "==", "idle").limit(1000).get(), { docs: [] as any[], size: 0 } as any),
      safe("users-count", () => db.collection("users").count().get(), { data: () => ({ count: -1 }) } as any),
    ]);

    const byCity: Record<string, number> = {};
    for (const doc of [...onSnap.docs, ...idleSnap.docs]) {
      const tz = (doc.data() as any).tz;
      const place = typeof tz === "string" ? TZ[tz] : undefined;
      if (place) byCity[place.city] = (byCity[place.city] || 0) + 1;
    }
    const cityIndex: Record<string, { lat: number; lon: number }> = {};
    for (const z of Object.values(TZ)) cityIndex[z.city] = { lat: z.lat, lon: z.lon };
    const cities = Object.entries(byCity)
      .map(([name, n]) => ({ name, n, ...(cityIndex[name] || { lat: 0, lon: 0 }) }))
      .sort((a, b) => b.n - a.n);

    const stats = getRequestStats();
    const shield = peraxCounts();

    res.json({
      online: onSnap.size,
      idle: idleSnap.size,
      users: usersCount.data().count,
      shields: shield.shields,
      blocked: listBlockedIPs().length,
      uptimeSec: Math.floor(process.uptime()),
      avgMs: stats.avgMs,
      totalRequests: stats.total,
      cities,
    });
  } catch (e) {
    res.status(500).json({ error: "status unavailable", code: 227 });
  }
});

export default router;

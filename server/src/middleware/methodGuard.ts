import { Request, Response, NextFunction } from "express";

// Oddiss 405/406 guard for known API routes.
// 405: right path, wrong method (e.g. POST to a GET-only route).
// 406: client demands (via Accept) a format the JSON-only API cannot return.
const ROUTES: [RegExp, string[]][] = [
  [/^\/api\/auth\/verify-token$/, ["POST"]],
  [/^\/api\/auth\/profile$/, ["GET"]],
  [/^\/api\/voice\/token$/, ["POST"]],
  [/^\/api\/log$/, ["POST"]],
  [/^\/api\/monitoring\/(system|users|logs)$/, ["GET"]],
  [/^\/api\/bots$/, ["GET"]],
  [/^\/api\/bots\/register$/, ["POST"]],
  [/^\/api\/bots\/[^/]+\/regenerate$/, ["POST"]],
  [/^\/api\/bots\/[^/]+$/, ["DELETE"]],
  [/^\/api\/perax\/challenge$/, ["POST"]],
  [/^\/api\/perax\/verify$/, ["POST"]],
  [/^\/api\/perax\/validate$/, ["POST"]],
  [/^\/api\/perax\/admin\/stats$/, ["GET"]],
  [/^\/api\/perax\/admin\/(check|reset|issue)$/, ["POST"]],
];

export const methodGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/api/")) {
    next();
    return;
  }

  // 406 first: unsatisfiable Accept header (narrow demands without JSON or */*)
  const accept = req.headers.accept || "";
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) {
    res.status(406).json({ error: "Not Acceptable: this API only returns application/json", code: 406 });
    return;
  }

  // 405: known path, disallowed method (tolerate one trailing slash)
  const clean = req.path.length > 1 ? req.path.replace(/\/$/, "") : req.path;
  for (const [re, methods] of ROUTES) {
    if (re.test(clean)) {
      if (!methods.includes(req.method)) {
        res.set("Allow", methods.join(", "));
        res.status(405).json({ error: `Method Not Allowed: use ${methods.join(" or ")}`, code: 405 });
        return;
      }
      break;
    }
  }
  next();
};

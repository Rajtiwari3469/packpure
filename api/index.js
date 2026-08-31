// Vercel serverless entry point.
// Routes all /api/* requests into the PackPure Express app.
//
// IMPORTANT: Do not commit real secrets here. All configuration comes from
// Vercel project environment variables (NEON_DATABASE_URL, ADMIN_EMAIL, ...).
import app, { initDb } from "../server/index.js";

// Initialize schema + seed once, before serving the first request.
const ready = initDb().catch((err) => {
  console.error("[vercel] DB init failed:", err);
  return null;
});

export default async function handler(req, res) {
  const dbStatus = await ready;
  if (dbStatus === null) {
    return res.status(503).json({ error: "Database not available." });
  }
  app(req, res);
}

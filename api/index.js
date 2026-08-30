// Vercel serverless entry point.
// Routes all /api/* requests into the PackPure Express app.
//
// IMPORTANT: Do not commit real secrets here. All configuration comes from
// Vercel project environment variables (NEON_DATABASE_URL, ADMIN_EMAIL, ...).
import app, { initDb } from "../server/index.js";

// Initialize schema + seed once, before serving the first request.
const ready = initDb().catch((err) => {
  console.error("[vercel] DB init failed:", err);
});

export default async function handler(req, res) {
  await ready;
  app(req, res);
}

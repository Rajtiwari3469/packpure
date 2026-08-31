// Vercel serverless entry point.
// Routes all /api/* requests into the PackPure Express app.
//
// IMPORTANT: Do not commit real secrets here. All configuration comes from
// Vercel project environment variables (NEON_DATABASE_URL, ADMIN_EMAIL, ...).
import app, { initDb } from "../server/index.js";

// Initialize schema + seed once, before serving the first request.
// On failure, retry on the next invocation instead of permanently blocking all requests.
let dbReady = initDb().catch((err) => {
  console.error("[vercel] DB init failed:", err);
  return false;
});

export default async function handler(req, res) {
  const status = await dbReady;
  if (status === false) {
    // Retry init on this request
    dbReady = initDb().catch((err) => {
      console.error("[vercel] DB init retry failed:", err);
      return false;
    });
    const retryStatus = await dbReady;
    if (retryStatus === false) {
      return res.status(503).json({
        error: "Database not available. Ensure NEON_DATABASE_URL is set in Vercel environment variables.",
      });
    }
  }
  app(req, res);
}

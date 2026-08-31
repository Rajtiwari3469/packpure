import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import db from "./db.js";
import {
  hashPassword,
  comparePassword,
  createSession,
  destroySession,
  getSessionUser,
  cookieOptions,
  COOKIE_NAME,
} from "./auth.js";
import adminRouter from "./admin.js";
import {
  addActivity,
  addNotification,
  addUserNotification,
  addLogin,
  recordAudit,
  isAdminRole,
  getContentMap,
  getSection,
  activeAnnouncementMessage,
} from "./helpers.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

/* ---------------------------------------------------------
   AUTH MIDDLEWARE
-------------------------------------------------------- */

async function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  const user = await getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName ?? user.full_name ?? "",
    email: user.email,
    phone: user.phone ?? "",
    organization: user.organization ?? "",
    age: user.age,
    role: user.role,
    createdAt: user.createdAt ?? user.created_at,
  };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  // Accept 10-15 digit phone numbers with optional +, spaces, dashes
  return /^[+]?[\d\s-]{10,15}$/.test(phone);
}

/* ---------------------------------------------------------
   HEALTH
-------------------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/_debug/admin", async (req, res) => {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@packpure.com";
    const row = await db.get(`SELECT id, email, role, status, password_hash FROM users WHERE lower(email) = lower(?)`, [email]);
    if (!row) return res.json({ email, found: false });
    const expectedPass = process.env.ADMIN_PASSWORD || "Admin@12345";
    const matches = await comparePassword(expectedPass, row.password_hash);
    res.json({
      email: row.email, role: row.role, status: row.status, found: true,
      passwordMatchesExpected: matches,
      envEmail: email, envHasPassword: Boolean(process.env.ADMIN_PASSWORD),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------------
   ADMIN ROUTES
-------------------------------------------------------- */

async function adminSession(req, res, next) {
  const adminPath = req.originalUrl.replace(/^\/api\/admin/, "");
  if (adminPath === "/auth/login" || adminPath === "/auth/login?") return next();
  const token = req.cookies[COOKIE_NAME];
  const user = await getSessionUser(token);
  if (!user) return res.status(401).json({ error: "Authentication required." });
  req.user = user;
  next();
}

app.use("/api/admin", adminSession, adminRouter);

/* ---------------------------------------------------------
   PUBLIC WEBSITE CONTENT
-------------------------------------------------------- */

app.get("/api/public/site", async (req, res) => {
  const content = await getContentMap();
  const announcement = await activeAnnouncementMessage();
  res.json({ content, announcement });
});

app.get("/api/public/section/:section", async (req, res) => {
  res.json({ section: req.params.section, content: await getSection(req.params.section) });
});

/* ---------------------------------------------------------
   AUTH ROUTES
-------------------------------------------------------- */

app.post("/api/auth/signup", async (req, res) => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    phone,
    organization,
    age,
  } = req.body || {};

  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (!phone || !validatePhone(phone)) {
    return res
      .status(400)
      .json({ error: "A valid phone number is required." });
  }
  if (!password || String(password).length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  const existing = await db.get(`SELECT id FROM users WHERE lower(email) = lower(?)`, [
    email,
  ]);
  if (existing) {
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  }

  const passwordHash = await hashPassword(password);

  const id = await db.insert(
    `INSERT INTO users (full_name, email, phone, password_hash, organization, age)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      String(fullName).trim(),
      String(email).trim().toLowerCase(),
      String(phone).trim(),
      passwordHash,
      (organization || "").trim(),
      age ? Number(age) : null,
    ]
  );
  if (!id) {
    return res.status(500).json({ error: "Could not create the account. Please try again." });
  }

  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!user) {
    return res.status(500).json({ error: "Could not create the account. Please try again." });
  }
  const token = await createSession(user.id);

  await addActivity({ userId: user.id, type: "account", title: "Account created", detail: `${user.full_name} registered as a new user.` });
  await addUserNotification({
    userId: user.id,
    type: "account",
    title: "Welcome to PackPure",
    message: `Your account was created successfully. Start scanning product labels to check compliance.`,
    severity: "low",
    linkType: "scanner",
    dedupKey: `signup-${user.id}`,
  });
  await addNotification({
    userId: user.id,
    category: "NEW USER",
    title: "New user registered",
    detail: `${user.full_name} created an account.`,
    linkType: "user",
    linkId: user.id,
  });
  await recordAudit({ adminId: null, action: "user_registered", category: "user", detail: `${user.full_name} (${user.email})` });

  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password are required." });
  }

  const user = await db.get(`SELECT * FROM users WHERE lower(email) = lower(?)`, [
    email,
  ]);
  if (!user || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.status && user.status !== "active") {
    return res.status(403).json({ error: "This account has been disabled." });
  }

  await addLogin(user.id);
  await addActivity({ userId: user.id, type: "login", title: "User logged in", detail: `${user.full_name} signed in.` });
  await addUserNotification({
    userId: user.id,
    type: "security",
    title: "New login detected",
    message: `Your PackPure account was just used to log in. If this wasn't you, change your password immediately.`,
    severity: "medium",
  });
  if (isAdminRole(user.role)) {
    await addNotification({
      userId: user.id,
      category: "SECURITY",
      title: "Admin login detected",
      detail: `${user.full_name} logged in to the admin dashboard.`,
    });
  }

  const token = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await destroySession(req.sessionToken);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ---------------------------------------------------------
   ACCOUNT
-------------------------------------------------------- */

app.get("/api/account", requireAuth, async (req, res) => {
  const user = publicUser(req.user);
  const scans = await db.get(
    `SELECT COUNT(*) AS c FROM scans WHERE user_id = ?`,
    [user.id]
  );
  res.json({ user, scanCount: scans ? Number(scans.c) : 0 });
});

app.patch("/api/account", requireAuth, async (req, res) => {
  const { fullName, phone, organization, age } = req.body || {};
  const updates = [];
  const params = [];

  if (fullName !== undefined) {
    if (!String(fullName).trim())
      return res.status(400).json({ error: "Full name is required." });
    updates.push("full_name = ?");
    params.push(String(fullName).trim());
  }
  if (phone !== undefined) {
    if (!validatePhone(phone))
      return res
        .status(400)
        .json({ error: "A valid phone number is required." });
    updates.push("phone = ?");
    params.push(String(phone).trim());
  }
  if (organization !== undefined) {
    updates.push("organization = ?");
    params.push(String(organization).trim());
  }
  if (age !== undefined) {
    if (age !== null && age !== "" && (Number(age) < 1 || Number(age) > 150)) {
      return res.status(400).json({ error: "Invalid age." });
    }
    updates.push("age = ?");
    params.push(age === "" || age === null ? null : Number(age));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  params.push(req.user.id);
  await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

  const fresh = await db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
  res.json({ user: publicUser(fresh) });
});

/* ---------------------------------------------------------
   USER (dashboard / profile / settings)
-------------------------------------------------------- */

app.get("/api/user/me", requireAuth, async (req, res) => {
  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
  res.json({ user: publicUser(user) });
});

app.patch("/api/user/profile", requireAuth, async (req, res) => {
  const { fullName, phone, organization, age } = req.body || {};
  const updates = [];
  const params = [];

  if (fullName !== undefined) {
    if (!String(fullName).trim())
      return res.status(400).json({ error: "Full name is required." });
    updates.push("full_name = ?");
    params.push(String(fullName).trim());
  }
  if (phone !== undefined) {
    if (!validatePhone(phone))
      return res
        .status(400)
        .json({ error: "A valid phone number is required." });
    updates.push("phone = ?");
    params.push(String(phone).trim());
  }
  if (organization !== undefined) {
    updates.push("organization = ?");
    params.push(String(organization).trim());
  }
  if (age !== undefined) {
    if (age !== null && age !== "" && (Number(age) < 1 || Number(age) > 150)) {
      return res.status(400).json({ error: "Invalid age." });
    }
    updates.push("age = ?");
    params.push(age === "" || age === null ? null : Number(age));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  params.push(req.user.id);
  await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

  await addActivity({ userId: req.user.id, type: "profile", title: "Profile updated", detail: `${req.user.fullName} updated their profile.` });

  const fresh = await db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
  res.json({ user: publicUser(fresh) });
});

app.get("/api/user/stats", requireAuth, async (req, res) => {
  const totals = await db.get(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN checks LIKE '%"status":"fail"%' THEN 0 ELSE 1 END) AS compliant,
       SUM(CASE WHEN checks LIKE '%"status":"fail"%' THEN 1 ELSE 0 END) AS nonCompliant
     FROM scans WHERE user_id = ?`,
    [req.user.id]
  );

  const recent = await db.get(
    `SELECT id, product_name, status, created_at
     FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [req.user.id]
  );

  res.json({
    stats: {
      total: totals ? Number(totals.total) : 0,
      compliant: totals ? Number(totals.compliant || 0) : 0,
      nonCompliant: totals ? Number(totals.nonCompliant || 0) : 0,
      pending: 0,
    },
    recentScan: recent
      ? {
          id: recent.id,
          productName: recent.product_name,
          status: recent.status,
          createdAt: recent.created_at,
        }
      : null,
  });
});

app.patch("/api/user/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword) {
    return res.status(400).json({ error: "Current password is required." });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "New passwords do not match." });
  }

  const user = await db.get(
    `SELECT id, password_hash FROM users WHERE id = ?`,
    [req.user.id]
  );
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const valid = await comparePassword(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }

  const newHash = await hashPassword(newPassword);
  await db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [
    newHash,
    req.user.id,
  ]);

  await addUserNotification({
    userId: req.user.id,
    type: "security",
    title: "Password changed",
    message: "Your PackPure password was changed successfully.",
    severity: "high",
    dedupKey: `password-change-${Date.now().toString(36)}`,
  });

  res.json({ ok: true });
});

/* ---------------------------------------------------------
   CONTACT / HELP
-------------------------------------------------------- */

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (String(message).trim().length > 2000) {
    return res
      .status(400)
      .json({ error: "Message must be 2000 characters or fewer." });
  }
  if (subject && String(subject).trim().length > 100) {
    return res.status(400).json({ error: "Subject is too long." });
  }

  let userId = null;
  let userEmail = "";
  const token = req.cookies[COOKIE_NAME];
  const user = await getSessionUser(token);
  if (user) {
    userId = user.id;
    userEmail = user.email;
  }

  const contactEmail = String(email || userEmail).trim();
  if (contactEmail && !validateEmail(contactEmail)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  await db.insert(
    `INSERT INTO contact_messages (user_id, name, email, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      String(name || "").trim(),
      contactEmail,
      String(subject || "").trim(),
      String(message).trim(),
    ]
  );

  await addNotification({
    userId,
    category: "FEEDBACK",
    title: "Support request received",
    detail: `${String(name || contactEmail).trim()} sent a message: ${String(subject || "General").trim()}`,
    linkType: "message",
  });
  if (userId) {
    await addActivity({ userId, type: "feedback", title: "Submitted feedback", detail: `${String(subject || "General").trim()}` });
  }

  res.json({ ok: true });
});

/* ---------------------------------------------------------
   SCANS
-------------------------------------------------------- */

app.get("/api/scans", requireAuth, async (req, res) => {
  const rows = await db.all(
    `SELECT id, product_name, image, extracted_data, checks, status, created_at
     FROM scans WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id]
  );

  const scans = rows.map((row) => ({
    id: row.id,
    productName: row.product_name,
    image: row.image,
    extractedData: JSON.parse(row.extracted_data || "{}"),
    checks: JSON.parse(row.checks || "[]"),
    status: row.status,
    createdAt: row.created_at,
  }));

  res.json({ scans });
});

app.get("/api/scans/:id", requireAuth, async (req, res) => {
  const row = await db.get(
    `SELECT id, product_name, image, extracted_data, checks, status, created_at
     FROM scans WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!row) {
    return res.status(404).json({ error: "Scan not found." });
  }
  res.json({
    scan: {
      id: row.id,
      productName: row.product_name,
      image: row.image,
      extractedData: JSON.parse(row.extracted_data || "{}"),
      checks: JSON.parse(row.checks || "[]"),
      status: row.status,
      createdAt: row.created_at,
    },
  });
});

app.post("/api/scans", requireAuth, async (req, res) => {
  const { productName, image, extractedData, checks, status } = req.body || {};

  const name = productName || "Uploaded Product";
  const statusValue = status === "NON-COMPLIANT" ? "NON-COMPLIANT" : "COMPLIANT";

  const id = await db.insert(
    `INSERT INTO scans (user_id, product_name, image, extracted_data, checks, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      name,
      image || "",
      JSON.stringify(extractedData || {}),
      JSON.stringify(checks || []),
      statusValue,
    ]
  );

  const row = await db.get(
    `SELECT id, product_name, image, extracted_data, checks, status, created_at, user_id
     FROM scans WHERE id = ?`,
    [id]
  );

  const scanChecks = JSON.parse(row.checks || "[]");
  const hasIssues = scanChecks.some((c) => c.status === "fail");
  const issueCount = scanChecks.filter((c) => c.status === "fail").length;
  await addActivity({
    userId: req.user.id,
    type: "scan",
    title: hasIssues ? "Scan flagged issues" : "Scan completed",
    detail: `${name} — ${hasIssues ? "issues found" : "compliant"}`,
  });
  await addUserNotification({
    userId: req.user.id,
    type: hasIssues ? "compliance" : "scan",
    title: hasIssues ? "Compliance issue detected" : "Scan completed",
    message: hasIssues
      ? `${issueCount} compliance issue${issueCount === 1 ? "" : "s"} detected in "${name}". Review the scan results.`
      : `Your scan of "${name}" completed successfully — no compliance issues found.`,
    severity: hasIssues ? "high" : "low",
    linkType: "scan",
    linkId: id,
    relatedEntityType: "scan",
    relatedEntityId: id,
    dedupKey: `scan-${id}`,
  });
  await addNotification({
    userId: req.user.id,
    category: hasIssues ? "COMPLIANCE ISSUE" : "NEW SCAN",
    title: hasIssues ? "Compliance issue detected" : "New scan completed",
    detail: `${req.user.fullName} scanned ${name} — ${hasIssues ? "issues found" : "compliant"}.`,
    linkType: "scan",
    linkId: id,
  });

  res.status(201).json({
    scan: {
      id: row.id,
      productName: row.product_name,
      image: row.image,
      extractedData: JSON.parse(row.extracted_data || "{}"),
      checks: scanChecks,
      status: row.status,
      createdAt: row.created_at,
    },
  });
});

app.delete("/api/scans/:id", requireAuth, async (req, res) => {
  const row = await db.get(
    `SELECT id FROM scans WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!row) {
    return res.status(404).json({ error: "Scan not found." });
  }
  await db.run(`DELETE FROM scans WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   USER NOTIFICATIONS (owner-only)
-------------------------------------------------------- */

app.get("/api/notifications", requireAuth, async (req, res) => {
  const { archived = "0" } = req.query;
  const where = archived === "1"
    ? "WHERE user_id = ? AND archived = 1"
    : "WHERE user_id = ? AND archived = 0";
  const rows = await db.all(
    `SELECT * FROM user_notifications ${where} ORDER BY id DESC LIMIT 50`,
    [req.user.id]
  );
  const unread = await db.get(
    `SELECT COUNT(*) AS c FROM user_notifications WHERE user_id = ? AND read = 0 AND archived = 0`,
    [req.user.id]
  );
  res.json({
    notifications: rows,
    unread: Number(unread?.c || 0),
  });
});

app.get("/api/notifications/unread", requireAuth, async (req, res) => {
  const unread = await db.get(
    `SELECT COUNT(*) AS c FROM user_notifications WHERE user_id = ? AND read = 0 AND archived = 0`,
    [req.user.id]
  );
  res.json({ unread: Number(unread?.c || 0) });
});

async function ownedNotification(id, userId) {
  return db.get(
    `SELECT id FROM user_notifications WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
}

app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
  if (!(await ownedNotification(req.params.id, req.user.id))) {
    return res.status(404).json({ error: "Notification not found." });
  }
  await db.run(
    `UPDATE user_notifications SET read = 1, updated_at = datetime('now')
     WHERE id = ?`,
    [req.params.id]
  );
  res.json({ ok: true });
});

app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  await db.run(
    `UPDATE user_notifications SET read = 1, updated_at = datetime('now')
     WHERE user_id = ? AND read = 0`,
    [req.user.id]
  );
  res.json({ ok: true });
});

app.post("/api/notifications/:id/archive", requireAuth, async (req, res) => {
  if (!(await ownedNotification(req.params.id, req.user.id))) {
    return res.status(404).json({ error: "Notification not found." });
  }
  await db.run(
    `UPDATE user_notifications SET archived = 1, updated_at = datetime('now')
     WHERE id = ?`,
    [req.params.id]
  );
  res.json({ ok: true });
});

app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  if (!(await ownedNotification(req.params.id, req.user.id))) {
    return res.status(404).json({ error: "Notification not found." });
  }
  await db.run(
    `DELETE FROM user_notifications WHERE id = ?`,
    [req.params.id]
  );
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   STARTUP
-------------------------------------------------------- */

export async function initDb() {
  await db.init();
  try {
    await seedAdmin();
  } catch (err) {
    console.error("[db] seedAdmin failed:", err.message);
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@packpure.com";
  const pass = process.env.ADMIN_PASSWORD || "Admin@12345";
  const hash = await hashPassword(pass);
  const id = await db.insert(
    `INSERT INTO users (full_name, email, phone, password_hash, organization, role, status)
     VALUES (?, ?, ?, ?, ?, 'super_admin', 'active')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'super_admin',
       status = 'active'`,
    ["PackPure Administrator", email, "+1 000 000 0000", hash, "PackPure"]
  );
  console.log(`Seed: admin ready -> ${email} (id=${id})`);
}

export default app;

// Run the HTTP server only when executed directly (e.g. `node server/index.js`),
// NOT when imported by the Vercel serverless wrapper (api/index.js).
const isMain =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1]));

if (isMain) {
  await initDb();
  app.listen(PORT, () => {
    console.log(`PackPure API running on http://localhost:${PORT}`);
  });
}

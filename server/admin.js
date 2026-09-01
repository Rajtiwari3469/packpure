import { Router } from "express";
import db from "./db.js";
import { comparePassword, createSession, destroySession, cookieOptions, COOKIE_NAME } from "./auth.js";
import {
  isAdminRole,
  recordAudit,
  addNotification,
  addUserNotification,
  addActivity,
  addLogin,
  setContent,
  getContentMap,
  getSection,
  getAnnouncements,
  getActiveAnnouncement,
} from "./helpers.js";

const router = Router();

/* ---------------------------------------------------------
   ADMIN AUTH MIDDLEWARE
-------------------------------------------------------- */

function requireAdmin(req, res, next) {
  const sessionUser = req.user;
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Access denied. Super admin required." });
  }
  next();
}

/* ---------------------------------------------------------
   ADMIN AUTH
-------------------------------------------------------- */

router.get("/auth/me", (req, res) => {
  const sessionUser = req.user;
  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return res.status(401).json({ error: "Not authenticated as admin." });
  }
  res.json({
    user: {
      id: sessionUser.id,
      fullName: sessionUser.fullName,
      email: sessionUser.email,
      role: sessionUser.role,
    },
  });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await db.get(`SELECT * FROM users WHERE lower(email) = lower(?)`, [email]);
  if (!user || !isAdminRole(user.role)) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }
  if (user.status !== "active") {
    return res.status(403).json({ error: "This admin account is disabled." });
  }
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }
  await addLogin(user.id);
  const token = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({
    user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
  });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  await destroySession(token);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   OVERVIEW
-------------------------------------------------------- */

router.get("/overview", requireAdmin, async (req, res) => {
  const totals = await db.get(
    `SELECT
       COUNT(DISTINCT u.id) AS "totalUsers",
       SUM(CASE WHEN u.status='active' THEN 1 ELSE 0 END) AS "activeUsers",
       SUM(CASE WHEN u.status='suspended' THEN 1 ELSE 0 END) AS "suspendedUsers",
       SUM(CASE WHEN u.status='deleted' THEN 1 ELSE 0 END) AS "binUsers",
       (SELECT COUNT(*) FROM scans) AS "totalScans",
       (SELECT COUNT(*) FROM scans WHERE checks NOT LIKE '%"status":"fail"%') AS "compScans",
       (SELECT COUNT(*) FROM scans WHERE checks LIKE '%"status":"fail"%') AS "nonCompScans",
       (SELECT COUNT(*) FROM scans WHERE created_at >= date('now')) AS "todayScans",
       (SELECT COUNT(*) FROM scans WHERE extracted_data LIKE '%"pending"%' OR checks LIKE '%"status":"pending"%') AS pending
     FROM users u`
  );
  const alerts = await db.get(`SELECT COUNT(*) AS c FROM admin_notifications WHERE read = 0 AND archived = 0`);
  const unreadMessages = await db.get(`SELECT COUNT(*) AS c FROM contact_messages WHERE status = 'open'`);
  const role = req.user.role;
  res.json({
    stats: {
      totalUsers: totals ? Number(totals.totalUsers || 0) : 0,
      activeUsers: totals ? Number(totals.activeUsers || 0) : 0,
      suspendedUsers: totals ? Number(totals.suspendedUsers || 0) : 0,
      binUsers: totals ? Number(totals.binUsers || 0) : 0,
      totalScans: totals ? Number(totals.totalScans || 0) : 0,
      compliantScans: totals ? Number(totals.compScans || 0) : 0,
      nonCompliantScans: totals ? Number(totals.nonCompScans || 0) : 0,
      todayScans: totals ? Number(totals.todayScans || 0) : 0,
      pendingReviews: totals ? Number(totals.pending || 0) : 0,
      systemAlerts: alerts ? Number(alerts.c || 0) : 0,
      unreadMessages: unreadMessages ? Number(unreadMessages.c || 0) : 0,
    },
    role,
  });
});

/* ---------------------------------------------------------
   ACTIVITY FEED (recent)
-------------------------------------------------------- */

router.get("/activity", requireAdmin, async (req, res) => {
  const notifications = await db.all(
    `SELECT n.*, u.full_name AS user_name
     FROM admin_notifications n
     LEFT JOIN users u ON u.id = n.user_id
     ORDER BY n.id DESC LIMIT 30`
  );
  res.json({ notifications });
});

/* ---------------------------------------------------------
   USERS
-------------------------------------------------------- */

function userPublic(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    age: row.age,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

router.get("/users", requireAdmin, async (req, res) => {
  const { q = "", filter = "all", sort = "newest", kind = "" } = req.query;
  let where = "WHERE 1=1";
  const params = [];

  if (kind === "admins") where += ` AND u.role IN ('admin','super_admin')`;
  else if (kind === "users") where += ` AND u.role = 'user'`;

  if (q) {
    where += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.organization LIKE ? OR CAST(u.id AS TEXT) = ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like, q);
  }

  if (filter === "active") where += ` AND u.status = 'active'`;
  else if (filter === "inactive") where += ` AND (u.status = 'suspended' OR u.status = 'deleted')`;
  else if (filter === "suspended") where += ` AND u.status = 'suspended'`;
  else if (filter === "bin") where += ` AND u.status = 'deleted'`;
  else if (filter === "new") where += ` AND u.created_at >= datetime('now', '-7 days')`;
  else if (filter === "with_scans") where += ` AND (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) > 0`;
  else if (filter === "with_issues") where += ` AND (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id AND s.checks LIKE '%"status":"fail"%') > 0`;

  const orderMap = {
    newest: "u.id DESC",
    oldest: "u.id ASC",
    name: "u.full_name ASC",
    recent_activity: "(SELECT MAX(created_at) FROM user_activities a WHERE a.user_id = u.id) DESC",
    most_scans: "(SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) DESC",
  };
  const orderBy = orderMap[sort] || orderMap.newest;

  const rows = await db.all(
    `SELECT u.*,
       (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) AS scan_count,
       (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id AND s.checks LIKE '%"status":"fail"%') AS issue_count,
       (SELECT MAX(created_at) FROM user_activities a WHERE a.user_id = u.id) AS last_activity,
       (SELECT MAX(created_at) FROM user_logins l WHERE l.user_id = u.id) AS last_login,
       u.created_at
     FROM users u ${where} ORDER BY ${orderBy}`,
    params
  );

  const users = rows.map((r) => ({
    ...userPublic(r),
    scanCount: Number(r.scan_count || 0),
    issueCount: Number(r.issue_count || 0),
    lastActivity: r.last_activity,
    lastLogin: r.last_login,
  }));

  res.json({ users });
});

 router.get("/users/tree", requireAdmin, async (req, res) => {
  const rows = await db.all(`SELECT u.* FROM users u ORDER BY u.created_at DESC`);
  const tree = {};
  rows.forEach((r) => {
    const ts = String(r.created_at || "").trim();
    const norm = ts.replace(" ", "T")
      .replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
      .replace(/([+-]\d{2})$/, "$1:00");
    const d = new Date(norm);
    if (!ts || isNaN(d.getTime())) return;
    const TZ = "Asia/Kolkata";
    const year = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(d);
    const month = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long" }).format(d);
    const dateKey = new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "2-digit", month: "short" }).format(d);
    const timeKey = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    if (!tree[year]) tree[year] = {};
    if (!tree[year][month]) tree[year][month] = {};
    if (!tree[year][month][dateKey]) tree[year][month][dateKey] = {};
    if (!tree[year][month][dateKey][timeKey]) tree[year][month][dateKey][timeKey] = [];
    tree[year][month][dateKey][timeKey].push({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      status: r.status,
      createdAt: r.created_at,
    });
  });
  res.json({ tree });
});

router.get("/users/:id", requireAdmin, async (req, res) => {
  const row = await db.get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "User not found." });

  const scanCount = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE user_id = ?`, [row.id]);
  const comp = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE user_id = ? AND checks NOT LIKE '%"status":"fail"%'`, [row.id]);
  const nonComp = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE user_id = ? AND checks LIKE '%"status":"fail"%'`, [row.id]);

  const lastLogin = await db.get(`SELECT MAX(created_at) AS m FROM user_logins WHERE user_id = ?`, [row.id]);
  const lastActivity = await db.get(`SELECT MAX(created_at) AS m FROM user_activities WHERE user_id = ?`, [row.id]);

  const recentScans = await db.all(
    `SELECT id, product_name, image, extracted_data, checks, status, created_at
     FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT 10`,
    [row.id]
  );

  res.json({
    user: userPublic(row),
    stats: {
      total: Number(scanCount?.c || 0),
      compliant: Number(comp?.c || 0),
      nonCompliant: Number(nonComp?.c || 0),
      lastLogin: lastLogin?.m || null,
      lastActivity: lastActivity?.m || null,
    },
    recentScans: recentScans.map((s) => ({
      id: s.id,
      productName: s.product_name,
      image: s.image,
      status: s.status,
      createdAt: s.created_at,
    })),
  });
});

router.patch("/users/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["active", "suspended", "deleted"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  const row = await db.get(`SELECT id, full_name FROM users WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "User not found." });
  await db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, row.id]);
  await addNotification({ category: "SECURITY", title: "User status changed", detail: `${row.full_name} → ${status}`, linkType: "user", linkId: row.id });
  await addUserNotification({
    userId: row.id,
    type: "account",
    title: status === "active" ? "Account re-activated" : "Account action required",
    message: status === "active"
      ? "Your PackPure account has been re-activated."
      : `Your PackPure account has been ${status}. If you believe this is a mistake, please contact support.`,
    severity: status === "active" ? "medium" : "high",
    linkType: "help",
    dedupKey: `status-${row.id}-${status}`,
  });
  await recordAudit({ adminId: req.user.id, action: "user_status_changed", detail: `${row.full_name} (${row.id}) set to ${status}` });
  res.json({ ok: true });
});

router.delete("/users/:id", requireSuperAdmin, async (req, res) => {
  const row = await db.get(`SELECT id, full_name, email, role FROM users WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "User not found." });
  if (Number(row.id) === Number(req.user.id)) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }
  if (isAdminRole(row.role)) {
    return res.status(400).json({ error: "Admin accounts cannot be deleted through the user list." });
  }
  await db.run(`UPDATE users SET status = 'deleted' WHERE id = ?`, [row.id]);
  await db.run(`DELETE FROM sessions WHERE user_id = ?`, [row.id]);
  await addNotification({ category: "SECURITY", title: "User moved to bin", detail: `${row.full_name} (${row.id}) moved to bin`, linkType: "user", linkId: row.id });
  await recordAudit({ adminId: req.user.id, action: "user_moved_to_bin", category: "users", detail: `${row.full_name} (${row.id}, ${row.email}) moved to bin` });
  res.json({ ok: true, movedToBin: true });
});

router.post("/users/:id/restore", requireSuperAdmin, async (req, res) => {
  const row = await db.get(`SELECT id, full_name, email, status FROM users WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "User not found." });
  if (row.status !== "deleted") {
    return res.status(400).json({ error: "Only deleted users can be restored." });
  }
  await db.run(`UPDATE users SET status = 'active' WHERE id = ?`, [row.id]);
  await addUserNotification({
    userId: row.id,
    type: "account",
    title: "Account restored",
    message: "Your PackPure account has been restored. You can sign in again.",
    severity: "medium",
    linkType: "help",
    dedupKey: `restore-${row.id}`,
  });
  await recordAudit({ adminId: req.user.id, action: "user_restored", category: "users", detail: `${row.full_name} (${row.id}, ${row.email}) restored from bin` });
  res.json({ ok: true, restored: true });
});

router.get("/users/:id/activities", requireAdmin, async (req, res) => {
  const rows = await db.all(
    `SELECT * FROM user_activities WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
    [req.params.id]
  );
  res.json({ activities: rows });
});

router.get("/users/:id/logins", requireAdmin, async (req, res) => {
  const rows = await db.all(
    `SELECT id, created_at FROM user_logins WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    [req.params.id]
  );
  res.json({ logins: rows });
});

/* ---------------------------------------------------------
   SCANS
-------------------------------------------------------- */

router.get("/scans", requireAdmin, async (req, res) => {
  const { q = "", status = "all", issue = "all" } = req.query;
  let where = "WHERE 1=1";
  const params = [];

  if (q) {
    where += ` AND (s.product_name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR CAST(s.id AS TEXT) = ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, q);
  }
  if (status === "COMPLIANT") where += ` AND s.status = 'COMPLIANT'`;
  else if (status === "NON-COMPLIANT") where += ` AND s.status = 'NON-COMPLIANT'`;
  else if (status === "pending") where += ` AND (s.checks LIKE '%"status":"pending"%')`;
  if (issue === "with_issues") where += ` AND s.checks LIKE '%"status":"fail"%'`;

  const rows = await db.all(
    `SELECT s.id, s.product_name, s.image, s.extracted_data, s.checks, s.status, s.created_at,
       u.full_name AS user_name, u.email AS user_email, u.id AS user_id
     FROM scans s JOIN users u ON u.id = s.user_id
     ${where} ORDER BY s.id DESC`,
    params
  );

  const scans = rows.map((r) => {
    const checks = JSON.parse(r.checks || "[]");
    return {
      id: r.id,
      productName: r.product_name,
      image: r.image,
      status: r.status,
      createdAt: r.created_at,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      issueCount: checks.filter((c) => c.status === "fail").length,
    };
  });

  res.json({ scans });
});

router.get("/scans/:id", requireAdmin, async (req, res) => {
  const row = await db.get(
    `SELECT s.*, u.full_name AS user_name, u.email AS user_email
     FROM scans s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "Scan not found." });
  res.json({
    scan: {
      id: row.id,
      productName: row.product_name,
      image: row.image,
      extractedData: JSON.parse(row.extracted_data || "{}"),
      checks: JSON.parse(row.checks || "[]"),
      status: row.status,
      createdAt: row.created_at,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
    },
  });
});

router.delete("/scans/:id", requireAdmin, async (req, res) => {
  const row = await db.get(`SELECT id, product_name FROM scans WHERE id = ?`, [req.params.id]);
  if (!row) return res.status(404).json({ error: "Scan not found." });
  await db.run(`DELETE FROM scans WHERE id = ?`, [row.id]);
  await recordAudit({ adminId: req.user.id, action: "scan_deleted", detail: `Scan ${row.id} (${row.product_name}) deleted` });
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   COMPLIANCE RULES
-------------------------------------------------------- */

router.get("/compliance", requireAdmin, async (req, res) => {
  const rules = await db.all(`SELECT * FROM compliance_rules ORDER BY id ASC`);
  res.json({ rules });
});

router.post("/compliance", requireAdmin, async (req, res) => {
  const { code, name, description = "", severity = "medium", enabled = 1 } = req.body || {};
  if (!code || !name) return res.status(400).json({ error: "Code and name are required." });
  await db.insert(
    `INSERT INTO compliance_rules (code, name, description, severity, enabled, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code, name, description, severity, enabled ? 1 : 0, req.user.id]
  );
  await recordAudit({ adminId: req.user.id, action: "rule_created", detail: `Rule ${code}` });
  res.status(201).json({ ok: true });
});

router.patch("/compliance/:id", requireAdmin, async (req, res) => {
  const { name, description, severity, enabled, archived } = req.body || {};
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (description !== undefined) { sets.push("description = ?"); params.push(description); }
  if (severity !== undefined) { sets.push("severity = ?"); params.push(severity); }
  if (enabled !== undefined) { sets.push("enabled = ?"); params.push(enabled ? 1 : 0); }
  if (archived !== undefined) { sets.push("archived = ?"); params.push(archived ? 1 : 0); }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update." });
  sets.push("updated_by = ?"); params.push(req.user.id);
  sets.push("version = version + 1");
  sets.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.run(`UPDATE compliance_rules SET ${sets.join(", ")} WHERE id = ?`, params);
  await recordAudit({ adminId: req.user.id, action: "rule_updated", detail: `Rule id ${req.params.id}` });
  res.json({ ok: true });
});

router.delete("/compliance/:id", requireAdmin, async (req, res) => {
  const existing = await db.get(`SELECT id, code FROM compliance_rules WHERE id = ?`, [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Compliance rule not found." });
  await db.run(`DELETE FROM compliance_rules WHERE id = ?`, [req.params.id]);
  await recordAudit({ adminId: req.user.id, action: "rule_deleted", detail: `Rule ${existing.code} (id ${existing.id})` });
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   WEBSITE CONTENT
-------------------------------------------------------- */

router.get("/website", requireAdmin, async (req, res) => {
  const sections = ["home", "about", "features", "branding", "general", "footer", "announcement", "legal"];
  const full = {};
  for (const s of sections) {
    full[s] = await getSection(s);
  }
  res.json({ content: full });
});

router.post("/website", requireAdmin, async (req, res) => {
  const { section, key, value, status = "published" } = req.body || {};
  if (!section || !key) return res.status(400).json({ error: "section and key required." });
  const old = await db.get(`SELECT value FROM website_content WHERE section = ? AND key = ?`, [section, key]);
  const oldValue = old ? old.value : "";
  await setContent(section, key, value, req.user.id, status);
  if (oldValue !== String(value)) {
    await recordAudit({ adminId: req.user.id, action: "content_changed", category: "website", detail: `${section}.${key}: "${oldValue}" → "${value}"` });
    await addNotification({ category: "WEBSITE CHANGE", title: "Website content changed", detail: `${section}.${key} updated`, linkType: "website" });
  }
  res.json({ ok: true });
});

router.post("/website/publish", requireAdmin, async (req, res) => {
  await db.run(`UPDATE website_content SET status = 'published'`);
  await addNotification({
    category: "WEBSITE CHANGE",
    title: "Website content published",
    detail: "The public website content was published.",
    linkType: "website",
  });
  await recordAudit({ adminId: req.user.id, action: "content_published", category: "website", detail: "Website content published" });
  res.json({ ok: true });
});

/* version history for a key */
router.get("/content/versions", requireAdmin, async (req, res) => {
  const { section, key } = req.query;
  if (!section || !key) return res.status(400).json({ error: "section and key required." });
  const rows = await db.all(
    `SELECT v.*, u.full_name AS changed_by_name
     FROM website_content_versions v LEFT JOIN users u ON u.id = v.changed_by
     WHERE v.section = ? AND v.key = ?
     ORDER BY v.id DESC`,
    [section, key]
  );
  res.json({ versions: rows });
});

/* ---------------------------------------------------------
   MESSAGES (contact / support)
-------------------------------------------------------- */

router.get("/messages", requireAdmin, async (req, res) => {
  const { status = "all" } = req.query;
  let where = "WHERE 1=1";
  const params = [];
  if (status !== "all") {
    where += ` AND m.status = ?`;
    params.push(status);
  }
  const rows = await db.all(
    `SELECT m.*, u.full_name AS user_name
     FROM contact_messages m LEFT JOIN users u ON u.id = m.user_id
     ${where} ORDER BY m.id DESC`,
    params
  );
  res.json({ messages: rows });
});

router.patch("/messages/:id", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["open", "pending", "resolved", "closed"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status." });
  const msg = await db.get(`SELECT id, user_id, subject FROM contact_messages WHERE id = ?`, [req.params.id]);
  if (!msg) return res.status(404).json({ error: "Message not found." });
  await db.run(`UPDATE contact_messages SET status = ? WHERE id = ?`, [status, req.params.id]);
  if (msg.user_id && status === "resolved") {
    await addUserNotification({
      userId: msg.user_id,
      type: "support",
      title: "Support request resolved",
      message: msg.subject ? `Your support request "${msg.subject}" has been marked as resolved.` : "Your support request has been marked as resolved.",
      severity: "medium",
      linkType: "help",
      dedupKey: `msg-resolved-${msg.id}`,
    });
  }
  res.json({ ok: true });
});

router.delete("/messages/:id", requireAdmin, async (req, res) => {
  await db.run(`DELETE FROM contact_messages WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   NOTIFICATIONS
-------------------------------------------------------- */

router.get("/notifications", requireAdmin, async (req, res) => {
  const { archived = "0" } = req.query;
  const where = archived === "1" ? "WHERE n.archived = 1" : "WHERE n.archived = 0";
  const rows = await db.all(
    `SELECT n.*, u.full_name AS user_name
     FROM admin_notifications n LEFT JOIN users u ON u.id = n.user_id
     ${where} ORDER BY n.id DESC LIMIT 100`
  );
  const unread = await db.get(`SELECT COUNT(*) AS c FROM admin_notifications WHERE read = 0 AND archived = 0`);
  res.json({ notifications: rows, unread: Number(unread?.c || 0) });
});

router.post("/notifications/:id/toggle", requireAdmin, async (req, res) => {
  const n = await db.get(`SELECT read FROM admin_notifications WHERE id = ?`, [req.params.id]);
  if (!n) return res.status(404).json({ error: "Notification not found." });
  await db.run(`UPDATE admin_notifications SET read = ? WHERE id = ?`, [n.read ? 0 : 1, req.params.id]);
  res.json({ ok: true });
});

router.post("/notifications/:id/read", requireAdmin, async (req, res) => {
  await db.run(`UPDATE admin_notifications SET read = 1 WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

router.post("/notifications/read-all", requireAdmin, async (req, res) => {
  await db.run(`UPDATE admin_notifications SET read = 1 WHERE read = 0`);
  res.json({ ok: true });
});

router.post("/notifications/:id/archive", requireAdmin, async (req, res) => {
  await db.run(`UPDATE admin_notifications SET archived = 1 WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

router.get("/badges", requireAdmin, async (req, res) => {
  const users = await db.get(`SELECT COUNT(*) AS c FROM users WHERE status = 'active'`);
  const bin = await db.get(`SELECT COUNT(*) AS c FROM users WHERE status = 'deleted'`);
  const scans = await db.get(`SELECT COUNT(*) AS c FROM scans`);
  const messages = await db.get(`SELECT COUNT(*) AS c FROM contact_messages WHERE status = 'open'`);
  const alerts = await db.get(`SELECT COUNT(*) AS c FROM admin_notifications WHERE read = 0 AND archived = 0`);
  res.json({
    users: Number(users?.c || 0),
    bin: Number(bin?.c || 0),
    scans: Number(scans?.c || 0),
    messages: Number(messages?.c || 0),
    alerts: Number(alerts?.c || 0),
  });
});

/* ---------------------------------------------------------
   ANALYTICS
-------------------------------------------------------- */

router.get("/analytics", requireAdmin, async (req, res) => {
  const { range = "30" } = req.query;
  const days = parseInt(range, 10) || 30;
  const since = `datetime('now', '-${days} days')`;

  const usersOverTime = await db.all(
    `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS c
     FROM users WHERE created_at >= ${since} GROUP BY date ORDER BY date`
  );
  const scansOverTime = await db.all(
    `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS c
     FROM scans WHERE created_at >= ${since} GROUP BY date ORDER BY date`
  );

  const comp = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE checks NOT LIKE '%"status":"fail"%'`);
  const nonComp = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE checks LIKE '%"status":"fail"%'`);
  const totalScans = await db.get(`SELECT COUNT(*) AS c FROM scans`);

  const topProducts = await db.all(
    `SELECT product_name, COUNT(*) AS c FROM scans GROUP BY product_name ORDER BY c DESC LIMIT 10`
  );

  const commonIssues = await db.all(
    `SELECT product_name, COUNT(*) AS c FROM scans WHERE checks LIKE '%"status":"fail"%' GROUP BY product_name ORDER BY c DESC LIMIT 10`
  );

  const registrations = await db.get(`SELECT COUNT(*) AS c FROM users WHERE created_at >= ${since}`);
  const activeUsers = await db.get(`SELECT COUNT(*) AS c FROM users WHERE status='active' AND (SELECT COUNT(*) FROM user_logins l WHERE l.user_id = users.id AND l.created_at >= ${since}) > 0`);
  const dailyScans = await db.get(`SELECT COUNT(*) AS c FROM scans WHERE created_at >= ${since}`);

  const total = Number(totalScans?.c || 0);
  const compliant = Number(comp?.c || 0);
  const non = Number(nonComp?.c || 0);
  const complianceRate = total ? Math.round((compliant / total) * 100) : 0;

  res.json({
    range: days,
    usersOverTime,
    scansOverTime,
    totals: {
      totalScans: total,
      compliant,
      nonCompliant: non,
      complianceRate,
      nonComplianceRate: 100 - complianceRate,
      registrations: Number(registrations?.c || 0),
      activeUsers: Number(activeUsers?.c || 0),
      dailyScans: Number(dailyScans?.c || 0),
    },
    topProducts,
    commonIssues,
  });
});

/* ---------------------------------------------------------
   REPORTS
-------------------------------------------------------- */

router.get("/reports", requireAdmin, async (req, res) => {
  const type = req.query.type || "users";
  const days = parseInt(req.query.range || "0", 10);
  const since = days > 0 ? `datetime('now', '-${days} days')` : null;

  let rows = [];
  if (type === "users") {
    rows = await db.all(`SELECT u.id, u.full_name, u.email, u.phone, u.organization, u.role, u.status, u.created_at, (SELECT COUNT(*) FROM scans s WHERE s.user_id = u.id) AS scan_count FROM users u ORDER BY u.id`);
  } else if (type === "scans") {
    rows = await db.all(`SELECT s.id, s.product_name, s.status, s.created_at, u.full_name AS user_name FROM scans s JOIN users u ON u.id = s.user_id ORDER BY s.id`);
  } else if (type === "compliance" || type === "noncompliance") {
    const issue = type === "noncompliance" ? "LIKE '%\"status\":\"fail\"%'" : "NOT LIKE '%\"status\":\"fail\"%'";
    rows = await db.all(`SELECT s.id, s.product_name, s.status, s.created_at, u.full_name AS user_name, s.checks FROM scans s JOIN users u ON u.id = s.user_id WHERE s.checks ${issue} ORDER BY s.id`);
  } else if (type === "activity") {
    rows = await db.all(`SELECT a.id, a.user_id, a.type, a.title, a.detail, a.created_at, u.full_name AS user_name FROM user_activities a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC`);
  }
  if (since && rows && rows.length && rows[0].created_at !== undefined) {
    rows = rows.filter((r) => new Date(String(r.created_at).replace(" ", "T")) >= new Date(Date.now() - days * 86400000));
  }
  res.json({ type, rows });
});

/* ---------------------------------------------------------
   AUDIT LOGS
-------------------------------------------------------- */

router.get("/audit-logs", requireAdmin, async (req, res) => {
  const rows = await db.all(
    `SELECT a.*, u.full_name AS admin_name
     FROM audit_logs a LEFT JOIN users u ON u.id = a.admin_id
     ORDER BY a.id DESC LIMIT 200`
  );
  res.json({ logs: rows });
});

/* ---------------------------------------------------------
   SETTINGS
-------------------------------------------------------- */

router.get("/settings", requireAdmin, async (req, res) => {
  const sections = ["branding", "general", "footer", "announcement"];
  const content = {};
  for (const s of sections) content[s] = await getSection(s);
  res.json({ content });
});

router.post("/settings", requireAdmin, async (req, res) => {
  const { section, key, value } = req.body || {};
  if (!section || !key) return res.status(400).json({ error: "section and key required." });
  await setContent(section, key, value, req.user.id);
  await recordAudit({ adminId: req.user.id, action: "setting_changed", category: "settings", detail: `${section}.${key} updated` });
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   ANNOUNCEMENTS
-------------------------------------------------------- */

router.get("/announcements", requireAdmin, async (req, res) => {
  res.json({ announcements: await getAnnouncements() });
});

router.post("/announcements", requireAdmin, async (req, res) => {
  const { title = "", message = "", status = "draft", priority = "normal", start_at = null, end_at = null } = req.body || {};
  const id = await db.insert(
    `INSERT INTO announcements (title, message, status, priority, start_at, end_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, message, status, priority, start_at, end_at, req.user.id]
  );
  if (status === "published") {
    const users = await db.all(`SELECT id FROM users WHERE status = 'active' AND role = 'user'`);
    for (const u of users) {
      await addUserNotification({
        userId: u.id,
        type: "update",
        title: "System announcement",
        message: title || message || "A new PackPure announcement was published.",
        severity: priority === "high" ? "high" : "medium",
        linkType: "home",
        dedupKey: `announcement-${id}`,
      });
    }
  }
  await recordAudit({ adminId: req.user.id, action: "announcement_created", category: "website", detail: title });
  res.status(201).json({ ok: true });
});

router.patch("/announcements/:id", requireAdmin, async (req, res) => {
  const { title, message, status, priority, start_at, end_at } = req.body || {};
  const sets = [];
  const params = [];
  if (title !== undefined) { sets.push("title = ?"); params.push(title); }
  if (message !== undefined) { sets.push("message = ?"); params.push(message); }
  if (status !== undefined) { sets.push("status = ?"); params.push(status); }
  if (priority !== undefined) { sets.push("priority = ?"); params.push(priority); }
  if (start_at !== undefined) { sets.push("start_at = ?"); params.push(start_at || null); }
  if (end_at !== undefined) { sets.push("end_at = ?"); params.push(end_at || null); }
  if (sets.length === 0) return res.status(400).json({ error: "No fields." });
  params.push(req.params.id);
  await db.run(`UPDATE announcements SET ${sets.join(", ")} WHERE id = ?`, params);
  if (status === "published") {
    const users = await db.all(`SELECT id FROM users WHERE status = 'active' AND role = 'user'`);
    for (const u of users) {
      await addUserNotification({
        userId: u.id,
        type: "update",
        title: "System announcement",
        message: title || message || "A new PackPure announcement was published.",
        severity: priority === "high" ? "high" : "medium",
        linkType: "home",
        dedupKey: `announcement-${req.params.id}`,
      });
    }
  }
  res.json({ ok: true });
});

router.delete("/announcements/:id", requireAdmin, async (req, res) => {
  await db.run(`DELETE FROM announcements WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   GLOBAL SEARCH
-------------------------------------------------------- */

router.get("/search", requireAdmin, async (req, res) => {
  const { q = "" } = req.query;
  if (!q) return res.json({ users: [], scans: [], messages: [], rules: [], announcements: [] });
  const like = `%${q}%`;
  const users = await db.all(`SELECT id, full_name, email FROM users WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? LIMIT 10`, [like, like, like]);
  const scans = await db.all(`SELECT s.id, s.product_name, s.status, u.full_name AS user_name FROM scans s JOIN users u ON u.id = s.user_id WHERE s.product_name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? LIMIT 10`, [like, like, like]);
  const messages = await db.all(`SELECT id, name, email, subject, message, status FROM contact_messages WHERE message LIKE ? OR name LIKE ? OR email LIKE ? OR subject LIKE ? LIMIT 10`, [like, like, like, like]);
  const rules = await db.all(`SELECT id, code, name FROM compliance_rules WHERE code LIKE ? OR name LIKE ? LIMIT 10`, [like, like]);
  const announcements = await db.all(`SELECT id, title, status FROM announcements WHERE title LIKE ? OR message LIKE ? LIMIT 10`, [like, like]);
  res.json({ users, scans, messages, rules, announcements });
});

export default router;

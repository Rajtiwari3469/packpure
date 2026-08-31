import db from "./db.js";

export async function addActivity({ userId, type = "activity", title = "", detail = "" }) {
  if (!userId) return null;
  return db.insert(
    `INSERT INTO user_activities (user_id, type, title, detail)
     VALUES (?, ?, ?, ?)`,
    [userId, type, title, detail]
  );
}

export async function addNotification({
  userId = null,
  category = "SYSTEM",
  title = "",
  detail = "",
  linkType = "",
  linkId = null,
}) {
  return db.insert(
    `INSERT INTO admin_notifications (user_id, category, title, detail, link_type, link_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, category, title, detail, linkType, linkId]
  );
}

export async function addUserNotification({
  userId,
  type = "info",
  title = "",
  message = "",
  severity = "medium",
  linkType = "",
  linkId = null,
  relatedEntityType = "",
  relatedEntityId = null,
  dedupKey = "",
}) {
  if (!userId) return null;

  if (dedupKey) {
    const existing = await db.get(
      `SELECT id FROM user_notifications
       WHERE user_id = ? AND dedup_key = ? AND archived = 0
         AND created_at >= datetime('now', '-60 seconds')
       LIMIT 1`,
      [userId, dedupKey]
    );
    if (existing) return existing.id;
  }

  return db.insert(
    `INSERT INTO user_notifications
       (user_id, type, title, message, severity, link_type, link_id, related_entity_type, related_entity_id, dedup_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, severity, linkType, linkId, relatedEntityType, relatedEntityId, dedupKey]
  );
}

export async function addLogin(userId) {
  if (!userId) return;
  await db.insert(`INSERT INTO user_logins (user_id) VALUES (?)`, [userId]);
}

export async function recordAudit({
  adminId = null,
  action = "",
  category = "admin",
  detail = "",
}) {
  return db.insert(
    `INSERT INTO audit_logs (admin_id, action, category, detail)
     VALUES (?, ?, ?, ?)`,
    [adminId, action, category, detail]
  );
}

export function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(String(iso).replace(" ", "T"));
  if (isNaN(d.getTime())) return iso;
  return d;
}

export async function getContentMap() {
  const rows = await db.all(
    `SELECT section, key, value FROM website_content WHERE status = 'published'`
  );
  const map = {};
  rows.forEach((r) => {
    map[`${r.section}.${r.key}`] = r.value;
  });
  return map;
}

export async function getSection(section) {
  const rows = await db.all(
    `SELECT key, value FROM website_content WHERE section = ? ORDER BY id`,
    [section]
  );
  const out = {};
  rows.forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

export async function setContent(section, key, value, updatedBy, status = "published") {
  const existing = await db.get(
    `SELECT id, value FROM website_content WHERE section = ? AND key = ?`,
    [section, key]
  );
  if (existing) {
    if (existing.value !== String(value)) {
      await db.insert(
        `INSERT INTO website_content_versions (section, key, old_value, new_value, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [section, key, String(existing.value), String(value), updatedBy]
      );
    }
    await db.run(
      `UPDATE website_content SET value = ?, status = ?, updated_by = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [String(value), status, updatedBy, existing.id]
    );
  } else {
    await db.insert(
      `INSERT INTO website_content (section, key, value, status, updated_by)
       VALUES (?, ?, ?, ?, ?)`,
      [section, key, String(value), status, updatedBy]
    );
  }
}

export async function getActiveAnnouncement() {
  const enabled = await db.get(
    `SELECT value FROM website_content WHERE section = 'announcement' AND key = 'enabled'`
  );
  if (!enabled || enabled.value !== "1") return null;
  const text = await db.get(
    `SELECT value FROM website_content WHERE section = 'announcement' AND key = 'text'`
  );
  return text?.value || null;
}

export async function getAnnouncements() {
  return db.all(
    `SELECT * FROM announcements ORDER BY id DESC`
  );
}

export async function activeAnnouncementMessage() {
  // Prefer published + currently-scheduled announcements table
  const rows = await db.all(
    `SELECT * FROM announcements
     WHERE status = 'published'
       AND (start_at IS NULL OR start_at::timestamptz <= now())
       AND (end_at IS NULL OR end_at::timestamptz >= now())
     ORDER BY id DESC LIMIT 1`
  );
  if (rows.length) return rows[0];
  return null;
}

export const ADMIN_CATEGORIES = [
  "NEW USER",
  "NEW SCAN",
  "COMPLIANCE ISSUE",
  "SYSTEM ERROR",
  "FEEDBACK",
  "SUPPORT",
  "SECURITY",
  "WEBSITE CHANGE",
];

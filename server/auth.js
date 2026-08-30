import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import db from "./db.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_NAME = "packpure_session";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isoFromMs(ms) {
  return new Date(ms).toISOString();
}

function expiresAtMs() {
  return new Date(Date.now() + SESSION_TTL_MS).getTime();
}

export async function createSession(userId) {
  const token = generateToken();
  await db.insert(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [token, userId, isoFromMs(expiresAtMs())]
  );
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
}

export async function getSessionUser(token) {
  if (!token) return null;
  const session = await db.get(
    `SELECT s.token, s.expires_at, u.id, u.full_name, u.email,
            u.phone, u.organization, u.age, u.role, u.status, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [token]
  );
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }
  if (session.status && session.status !== "active") {
    await destroySession(token);
    return null;
  }
  return {
    id: session.id,
    fullName: session.full_name,
    email: session.email,
    phone: session.phone,
    organization: session.organization,
    age: session.age,
    role: session.role,
    status: session.status,
    createdAt: session.created_at,
  };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

export { COOKIE_NAME };

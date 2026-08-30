import { useEffect } from "react";

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "User",
};

export const STATUS_LABEL = {
  active: "Active",
  suspended: "Suspended",
  deleted: "Deleted",
  inactive: "Inactive",
};

export function StatusPill({ value, label }) {
  const map = {
    active: "ok",
    COMPLIANT: "ok",
    resolved: "ok",
    published: "ok",
    pass: "ok",
    open: "warn",
    pending: "warn",
    suspended: "warn",
    fail: "bad",
    deleted: "bad",
    "NON-COMPLIANT": "bad",
    closed: "muted",
    draft: "muted",
    unknown: "muted",
  };
  const tone = map[String(value).toLowerCase()] || (String(value).toLowerCase() === "true" ? "ok" : "muted");
  return <span className={`adm-pill adm-pill-${tone}`}>{label || value}</span>;
}

export function Spinner() {
  return (
    <div className="adm-spinner-wrap">
      <span className="adm-spinner" />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="adm-empty">
      <p>{message || "Something went wrong while loading."}</p>
      {onRetry && (
        <button className="adm-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, sub }) {
  return (
    <div className="adm-empty">
      <div className="adm-empty-icon">🗂</div>
      <h3>{title || "Nothing here yet"}</h3>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="adm-page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, tone }) {
  return (
    <div className="adm-stat-card">
      <div className={`adm-stat-icon ${tone ? `adm-ton-${tone}` : ""}`}>{icon}</div>
      <div className="adm-stat-meta">
        <span className="adm-stat-value">{value}</span>
        <span className="adm-stat-label">{label}</span>
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmText = "Confirm", tone = "danger", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="adm-modal-overlay" onClick={onCancel}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`adm-btn adm-btn-${tone}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} · PackPure Admin`;
  }, [title]);
}

export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { NOTIF_ICONS } from "../notify.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString();
}

function targetFor(n) {
  switch (n.link_type) {
    case "scan":
      return n.link_id ? `/my-scans/${n.link_id}` : "/my-scans";
    case "user":
      return "/account";
    case "scanner":
      return "/scanner";
    case "help":
      return "/help";
    case "home":
      return "/";
    case "website":
    case "announcement":
    case "update":
      return "/";
    default:
      return null;
  }
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const d = await api.getNotifications();
      setData({ notifications: d.notifications || [], unread: Number(d.unread || 0) });
    } catch {
      // ignore — user may just be signing out
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isAuthenticated) return null;

  const openItem = async (n) => {
    const target = targetFor(n);
    if (!n.read) {
      try {
        await api.markNotifRead(n.id);
        setData((d) => ({
          ...d,
          unread: Math.max(0, d.unread - 1),
          notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: 1 } : x)),
        }));
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (target) navigate(target);
  };

  const markRead = async (n) => {
    try {
      await api.markNotifRead(n.id);
      setData((d) => ({
        ...d,
        unread: Math.max(0, d.unread - 1),
        notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: 1 } : x)),
      }));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api.markAllNotifsRead();
      setData((d) => ({
        unread: 0,
        notifications: d.notifications.map((x) => ({ ...x, read: 1 })),
      }));
    } catch {
      /* ignore */
    }
  };

  const archive = async (n) => {
    try {
      await api.archiveNotif(n.id);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pp-notif-bell" ref={bellRef}>
      <button
        className="pp-notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={data.unread ? `Notifications (${data.unread} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="pp-notif-bell-ico" aria-hidden="true">🔔</span>
        {data.unread > 0 && (
          <span className="pp-notif-bell-dot" aria-hidden="true">
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="pp-notif-panel" role="dialog" aria-label="Notifications">
          <div className="pp-notif-panel-head">
            <strong>Notifications</strong>
            <div className="pp-notif-panel-head-actions">
              {data.unread > 0 && (
                <button className="pp-notif-action" onClick={markAll}>
                  Mark all read
                </button>
              )}
              <button className="pp-notif-action" onClick={() => setOpen(false)} aria-label="Close notifications">
                ✕
              </button>
            </div>
          </div>

          <div className="pp-notif-panel-body">
            {loading ? (
              <p className="pp-notif-empty">Loading…</p>
            ) : data.notifications.length === 0 ? (
              <p className="pp-notif-empty">No notifications yet.</p>
            ) : (
              data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`pp-notif-item${n.read ? " read" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openItem(n);
                    }
                  }}
                >
                  <span className={`pp-notif-ico pp-notif-ico-${n.type}`} aria-hidden="true">
                    {NOTIF_ICONS[n.type] || NOTIF_ICONS.info}
                  </span>
                  <div className="pp-notif-item-body">
                    <div className="pp-notif-item-top">
                      <strong>{n.title}</strong>
                      {!n.read && <span className="pp-notif-unread">New</span>}
                    </div>
                    {n.message && <p>{n.message}</p>}
                    <div className="pp-notif-item-meta">
                      <span>{timeAgo(n.created_at)}</span>
                      {targetFor(n) && (
                        <span className="pp-notif-open">Open →</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="pp-notif-archive"
                    title="Archive notification"
                    aria-label="Archive notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      archive(n);
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
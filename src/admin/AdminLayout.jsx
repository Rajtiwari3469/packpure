import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Navigate, Link, useNavigate } from "react-router-dom";
import { showSuccess } from "../notify.jsx";
import { useAdmin } from "./AdminContext.jsx";
import { adminApi } from "./adminApi.js";
import { useTheme } from "../useTheme.js";
import { initials } from "./ui.jsx";

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (n & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 3600)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString();
}

function AdminBell({ badgeCount }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    adminApi
      .notifications()
      .then((d) => {
        setData({
          notifications: d.notifications || [],
          unread: Number(d.unread || d.alerts || 0),
        });
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
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

  return (
    <div className="adm-bell-wrap" ref={wrapRef}>
      <button
        className="adm-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={(badgeCount || data.unread) ? `Notifications (${data.unread || badgeCount} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        🔔
        {badgeCount > 0 && <span className="adm-bell-dot">{badgeCount}</span>}
      </button>

      {open && (
        <div className="adm-notif-pop" role="dialog" aria-label="Admin notifications">
          <div className="adm-notif-pop-head">
            <strong>Admin Alerts</strong>
            {data.unread > 0 && (
              <button
                className="adm-notif-mini"
                onClick={async () => {
                  await adminApi.readAllNotifications();
                  setData((d) => ({ ...d, unread: 0 }));
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="adm-notif-pop-body">
            {data.notifications.length === 0 ? (
              <p className="adm-notif-empty">No notifications.</p>
            ) : (
              data.notifications.map((n) => (
                <div key={n.id} className="adm-notif-row">
                  <div className="adm-notif-row-body">
                    <strong>{n.title}</strong>
                    {n.detail && <p>{n.detail}</p>}
                    <span className="adm-notif-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <div className="adm-notif-actions">
                    {!n.read && (
                      <button
                        className="adm-notif-btn"
                        title="Mark as read"
                        aria-label="Mark as read"
                        onClick={async () => {
                          await adminApi.markNotificationRead(n.id);
                          setData((d) => ({
                            ...d,
                            unread: Math.max(0, d.unread - 1),
                            notifications: d.notifications.map((x) =>
                              x.id === n.id ? { ...x, read: 1 } : x
                            ),
                          }));
                        }}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="adm-notif-btn danger"
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={async () => {
                        await adminApi.archiveNotification(n.id);
                        setData((d) => ({
                          ...d,
                          unread: n.read ? d.unread : Math.max(0, d.unread - 1),
                          notifications: d.notifications.filter((x) => x.id !== n.id),
                        }));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { to: "/admin", label: "Overview", icon: "📊", exact: true },
  { to: "/admin/users", label: "Users", icon: "👥" },
  { to: "/admin/scans", label: "Scans", icon: "🔍" },
  { to: "/admin/compliance", label: "Compliance", icon: "⚖️" },
  { to: "/admin/website", label: "Website", icon: "🌐" },
  { to: "/admin/messages", label: "Messages", icon: "✉️" },
  { to: "/admin/notifications", label: "Notifications", icon: "🔔" },
  { to: "/admin/analytics", label: "Analytics", icon: "📈" },
  { to: "/admin/reports", label: "Reports", icon: "📄" },
  { to: "/admin/audit", label: "Audit Logs", icon: "🛡️" },
  { to: "/admin/settings", label: "Settings", icon: "⚙️" },
  { to: "/admin/announcements", label: "Announcements", icon: "📣" },
  { to: "/admin/search", label: "Search", icon: "🔎" },
];

function SideContent({ badges, onNavigate }) {
  return (
    <nav className="adm-nav">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact}
          className={({ isActive }) => `adm-nav-item${isActive ? " active" : ""}`}
          onClick={onNavigate}
        >
          <span className="adm-nav-icon">{item.icon}</span>
          <span className="adm-nav-label">{item.label}</span>
          {badges &&
            ((item.to === "/admin/users" && badges.users) ||
              (item.to === "/admin/scans" && badges.scans) ||
              (item.to === "/admin/messages" && badges.messages) ||
              (item.to === "/admin/notifications" && badges.alerts)) && (
              <span className="adm-nav-badge">
                {item.to === "/admin/users"
                  ? badges.users
                  : item.to === "/admin/scans"
                  ? badges.scans
                  : item.to === "/admin/messages"
                  ? badges.messages
                  : badges.alerts}
              </span>
            )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { admin, loading, logout } = useAdmin();
  const [theme, toggleTheme] = useTheme();
  const [badges, setBadges] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#1b7a43");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    async function loadBadges() {
      try {
        const [b, s] = await Promise.all([adminApi.badges(), adminApi.settings()]);
        setBadges(b);
        const color = s?.content?.branding?.primary_color;
        if (/^#[0-9a-fA-F]{6}$/.test(color || "")) setPrimaryColor(color);
      } catch {
        setBadges(null);
      }
    }
    loadBadges();
    timerRef.current = setInterval(loadBadges, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--adm-g", primaryColor);
    el.style.setProperty("--adm-g-hover", shade(primaryColor, -12));
  }, [primaryColor]);

  if (loading) {
    return (
      <div className="adm-root adm-center-whole">
        <span className="adm-spinner" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout() {
    await logout();
    showSuccess("Logged out", "You have been logged out of the admin dashboard.");
    navigate("/admin/login");
  }

  return (
    <div className={`adm-root${collapsed ? " adm-collapsed" : ""}`} ref={rootRef}>
      <aside className={`adm-sidebar${drawerOpen ? " open" : ""}`}>
        <div className="adm-brand">
          <span className="adm-brand-mark">PP</span>
          <span className="adm-brand-text">PackPure<span>Admin</span></span>
          <button
            className="adm-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <SideContent badges={badges} onNavigate={() => setDrawerOpen(false)} />
        <div className="adm-side-foot">
          <Link
            to="/"
            className="adm-nav-item"
            onClick={() => setDrawerOpen(false)}
          >
            <span className="adm-nav-icon">🏠</span>
            <span className="adm-nav-label">View Site</span>
          </Link>
        </div>
      </aside>

      {drawerOpen && <div className="adm-scrim" onClick={() => setDrawerOpen(false)} />}

      <div className="adm-main">
        <header className="adm-topbar">
          <button className="adm-burger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
          <div className="adm-topbar-search">
            <input
              placeholder="Search users, scans, messages…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate("/admin/search?q=" + encodeURIComponent(e.target.value));
                }
              }}
            />
            <Link to="/admin/search" className="adm-topbar-search-btn">⌕</Link>
          </div>
          <div className="adm-topbar-right">
            <button
              className="adm-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <AdminBell badgeCount={badges ? badges.alerts : 0} />
            <button
              className="adm-logout-btn"
              onClick={handleLogout}
              title="Log out"
            >
              Logout
            </button>
            <div className="adm-user-menu-wrap">
              <button
                className="adm-user-chip"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span className="adm-avatar">{initials(admin.fullName)}</span>
                <span className="adm-user-chip-name">{admin.fullName}</span>
                <span className="adm-caret">▾</span>
              </button>
              {userMenuOpen && (
                <div className="adm-user-menu" role="menu">
                  <div className="adm-user-menu-head">
                    <strong>{admin.fullName}</strong>
                    <span>{admin.email}</span>
                    <span className="adm-role">{admin.role}</span>
                  </div>
                  <Link to="/" className="adm-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                    View Public Site
                  </Link>
                  <button className="adm-user-menu-item danger" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, PageHeader, formatDate, useTitle,
} from "../ui.jsx";

export default function AdminNotifications() {
  const { isSuperAdmin } = useAdmin();
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("active");
  useTitle("Notifications");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.notifications(filter === "archived" ? "1" : "0");
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function toggle(n) {
    await adminApi.toggleNotification(n.id);
    load();
  }
  async function archive(n) {
    await adminApi.archiveNotification(n.id);
    load();
  }
  async function readAll() {
    await adminApi.readAllNotifications();
    load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        sub={`${data.unread} unread`}
        actions={
          isSuperAdmin ? (
            <button className="adm-btn" onClick={readAll}>Mark all read</button>
          ) : null
        }
      />
      <div className="adm-toolbar">
        <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data.notifications.length === 0 ? (
        <EmptyState title="No notifications" sub="Nothing to show in this view." />
      ) : (
        <ul className="adm-notif-list">
          {data.notifications.map((n) => (
            <li key={n.id} className={`adm-notif${n.read ? " read" : ""}`}>
              <span className={`adm-activity-dot adm-dot-${String(n.category || "info").toLowerCase().replace(/[^a-z]/g, "") || "info"}`} />
              <div className="adm-notif-body">
                <div className="adm-notif-top">
                  <strong>{n.title}</strong>
                  {!n.read && <span className="adm-unread-badge">New</span>}
                </div>
                <p>{n.detail}</p>
                <div className="adm-notif-meta">
                  <span>{n.category}</span>
                  <span>{formatDate(n.created_at)}</span>
                  {n.user_name && <span>{n.user_name}</span>}
                </div>
              </div>
              <div className="adm-notif-actions">
                {isSuperAdmin && (
                  <>
                    <button className="adm-btn adm-btn-xs" onClick={() => toggle(n)}>
                      {n.read ? "Mark unread" : "Mark read"}
                    </button>
                    {!n.archived && (
                      <button className="adm-btn adm-btn-xs adm-btn-ghost" onClick={() => archive(n)}>Archive</button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import { StatCard, PageHeader, Spinner, ErrorState, EmptyState, formatDate, useTitle } from "../ui.jsx";

export default function AdminOverview() {
  const { admin } = useAdmin();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useTitle("Overview");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [o, a] = await Promise.all([adminApi.overview(), adminApi.activity()]);
      setStats(o.stats);
      setActivity(a.notifications || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <EmptyState />;

  return (
    <div>
      <PageHeader
        title={`Hello, ${admin?.fullName?.split(" ")[0] || "Admin"} 👋`}
        sub="Here's what's happening on PackPure."
        actions={
          <div className="adm-head-time">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        }
      />

      <div className="adm-stats-grid">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} tone="teal" />
        <StatCard icon="🗂" label="Total Scans" value={stats.totalScans} tone="blue" />
        <StatCard icon="✅" label="Compliant" value={stats.compliantScans} tone="green" />
        <StatCard icon="⚠️" label="Non-Compliant" value={stats.nonCompliantScans} tone="red" />
        <StatCard icon="⚡" label="Scans Today" value={stats.todayScans} tone="amber" />
        <StatCard icon="📝" label="Pending Reviews" value={stats.pendingReviews} tone="violet" />
      </div>

      <div className="adm-overview-grid">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Recent Activity</h2>
            <Link to="/admin/notifications" className="adm-link">View all →</Link>
          </div>
          {activity.length === 0 ? (
            <EmptyState title="No recent activity" sub="Notifications from users and scans will appear here." />
          ) : (
            <ul className="adm-activity">
              {activity.map((n) => (
                <li key={n.id}>
                  <span className={`adm-activity-dot adm-dot-${String(n.category || "info").toLowerCase().replace(/[^a-z]/g, "") || "info"}`} />
                  <div className="adm-activity-body">
                    <div className="adm-activity-title">
                      <strong>{n.title}</strong>
                      <span className="adm-activity-time">{formatDate(n.created_at)}</span>
                    </div>
                    <p>{n.detail}</p>
                    <span className="adm-activity-meta">{n.category}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Quick Actions</h2>
          </div>
          <div className="adm-quick-grid">
            <Link className="adm-quick" to="/admin/users"><span>👥</span>Manage Users</Link>
            <Link className="adm-quick" to="/admin/scans"><span>🔍</span>View Scans</Link>
            <Link className="adm-quick" to="/admin/website"><span>🌐</span>Edit Website</Link>
            <Link className="adm-quick" to="/admin/messages"><span>✉️</span>Messages {stats.unreadMessages > 0 && `(${stats.unreadMessages})`}</Link>
            <Link className="adm-quick" to="/admin/notifications"><span>🔔</span>Notifications {stats.systemAlerts > 0 && `(${stats.systemAlerts})`}</Link>
            <Link className="adm-quick" to="/admin/reports"><span>📄</span>Export Reports</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

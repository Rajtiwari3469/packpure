import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, ROLE_LABEL,
  STATUS_LABEL, PageHeader, formatDate, formatDateOnly, initials, useTitle,
} from "../ui.jsx";

export default function AdminUserDetail() {
  const { id } = useParams();
  const { isSuperAdmin } = useAdmin();
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  useTitle("User Detail");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, a] = await Promise.all([adminApi.user(id), adminApi.userActivities(id)]);
      setData(d);
      setActivities(a.activities || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  const { user, stats, recentScans } = data;

  async function changeStatus(next) {
    await adminApi.setUserStatus(user.id, next);
    setConfirm(null);
    load();
  }

  async function removeUser() {
    await adminApi.deleteUser(user.id);
    window.location.href = "/admin/users";
  }

  const statusActions =
    isSuperAdmin && user.role === "user" ? (
      <>
        <button className="adm-btn adm-btn-ok" onClick={() => setConfirm({ next: "active" })}>Active</button>
        <button className="adm-btn adm-btn-warn" onClick={() => setConfirm({ next: "suspended" })}>Suspend</button>
        <button className="adm-btn adm-btn-danger" onClick={() => setConfirm({ next: "delete" })}>Delete</button>
      </>
    ) : null;

  return (
    <div>
      <PageHeader
        title={user.fullName}
        sub={user.email}
        actions={
          <>
            <Link className="adm-btn adm-btn-ghost" to="/admin/users">← Users</Link>
            {statusActions}
          </>
        }
      />

      <div className="adm-cards-3">
        <div className="adm-card">
          <div className="adm-profile">
            <span className="adm-avatar-lg">{initials(user.fullName)}</span>
            <div>
              <h3>{user.fullName}</h3>
              <p>{user.email}</p>
              <div className="adm-profile-pills">
                <StatusPill value={user.role} label={ROLE_LABEL[user.role] || user.role} />
                <StatusPill value={user.status} label={STATUS_LABEL[user.status] || user.status} />
              </div>
            </div>
          </div>
          <dl className="adm-dl">
            <div><dt>Phone</dt><dd>{user.phone || "—"}</dd></div>
            <div><dt>Organization</dt><dd>{user.organization || "—"}</dd></div>
            <div><dt>Age</dt><dd>{user.age ?? "—"}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(user.createdAt)}</dd></div>
            <div><dt>Last Login</dt><dd>{formatDate(stats.lastLogin)}</dd></div>
            <div><dt>Last Activity</dt><dd>{formatDate(stats.lastActivity)}</dd></div>
          </dl>
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">Scan Stats</h3>
          <div className="adm-stats-grid adm-stats-grid-sm">
            <div className="adm-stat-tile"><b>{stats.total}</b><span>Total</span></div>
            <div className="adm-stat-tile ok"><b>{stats.compliant}</b><span>Compliant</span></div>
            <div className="adm-stat-tile bad"><b>{stats.nonCompliant}</b><span>Non-Compliant</span></div>
          </div>
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">Recent Scans ({recentScans.length})</h3>
          {recentScans.length === 0 ? (
            <EmptyState title="No scans yet" />
          ) : (
            <ul className="adm-scan-mini">
              {recentScans.map((s) => (
                <li key={s.id}>
                  <Link to={`/admin/scans/${s.id}`} className="adm-scan-mini-name">{s.productName}</Link>
                  <StatusPill value={s.status} label={s.status} />
                  <span className="adm-muted">{formatDateOnly(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="adm-card">
        <h3 className="adm-card-title">Activity Log</h3>
        {activities.length === 0 ? (
          <EmptyState title="No recorded activity" sub="Login, scan, and profile events appear here." />
        ) : (
          <ul className="adm-activity">
            {activities.map((a) => (
              <li key={a.id}>
                <span className="adm-activity-dot" />
                <div className="adm-activity-body">
                  <div className="adm-activity-title">
                    <strong>{a.title}</strong>
                    <span className="adm-activity-time">{formatDate(a.created_at)}</span>
                  </div>
                  <p>{a.detail}</p>
                  <span className="adm-activity-meta">{a.type}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.next === "delete" ? "Delete permanently?"
            : confirm?.next === "suspended" ? "Suspend user?"
            : "Set user active?"
        }
        message={
          confirm?.next === "delete"
            ? `This will permanently delete ${user.fullName} and remove all their data (scans, activity, notifications). This cannot be undone.`
            : confirm?.next === "suspended"
            ? `Are you sure you want to suspend ${user.fullName}? They will not be able to sign in.`
            : `Are you sure you want to set ${user.fullName} to active?`
        }
        confirmText={confirm?.next === "delete" ? "Delete permanently" : "Confirm"}
        tone={confirm?.next === "delete" ? "danger" : confirm?.next === "suspended" ? "warn" : "ok"}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.next === "delete" ? () => removeUser() : () => changeStatus(confirm.next)}
      />
    </div>
  );
}

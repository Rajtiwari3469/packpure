import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, ROLE_LABEL,
  STATUS_LABEL, PageHeader, formatDateOnly, initials, useTitle,
} from "../ui.jsx";

function TreeFolder({ label, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="adm-tree-folder">
      <button className="adm-tree-folder-head" onClick={() => setOpen((v) => !v)}>
        <span className={`adm-tree-arrow${open ? " open" : ""}`}>▸</span>
        <span className="adm-folder-icon">📁</span>
        <span className="adm-folder-label">{label}</span>
        <span className="adm-folder-count">{children.length}</span>
      </button>
      {open && <div className="adm-tree-children">{children}</div>}
    </div>
  );
}

function renderLeaf(leaf, depth) {
  return (
    <div className="adm-tree-leaf" style={{ paddingLeft: depth * 0 }}>
      <div className="adm-user-row">
        <span className="adm-avatar">{initials(leaf.fullName)}</span>
        <div className="adm-user-info">
          <Link to={`/admin/users/${leaf.id}`} className="adm-user-name">
            {leaf.fullName}
            <span className={`adm-status-dot adm-status-${leaf.status}`} />
          </Link>
          <span className="adm-user-mail">{leaf.email}</span>
        </div>
        <StatusPill value={leaf.status} label={STATUS_LABEL[leaf.status]} />
      </div>
    </div>
  );
}

function TreeView() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    adminApi.userTree().then((d) => setTree(d.tree)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  const years = Object.keys(tree || {}).sort((a, b) => b - a);

  return (
    <div className="adm-tree">
      {years.length === 0 && <EmptyState title="No users yet" />}
      {years.map((year) => (
        <TreeFolder key={year} label={year} defaultOpen>
          {Object.keys(tree[year]).map((month) => (
            <TreeFolder key={month} label={month}>
              {Object.keys(tree[year][month]).map((date) => (
                <TreeFolder key={date} label={date}>
                  {Object.keys(tree[year][month][date]).map((time) => (
                    <TreeFolder key={time} label={time}>
                      {tree[year][month][date][time].map((u) => renderLeaf(u))}
                    </TreeFolder>
                  ))}
                </TreeFolder>
              ))}
            </TreeFolder>
          ))}
        </TreeFolder>
      ))}
    </div>
  );
}

function formatIST(iso) {
  if (!iso) return "—";
  const norm = String(iso).replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(norm);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function LoginsModal({ user, onClose }) {
  const [logins, setLogins] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    setError(null);
    setLogins(null);
    adminApi
      .userLogins(user.id)
      .then((d) => {
        if (active) setLogins(d.logins || []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal adm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>Login history — {user.fullName}</h3>
        <p className="adm-muted">{user.email} · shown in IST</p>
        {error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              setLogins(null);
              adminApi.userLogins(user.id).then((d) => setLogins(d.logins || [])).catch((e) => setError(e.message));
            }}
          />
        ) : !logins ? (
          <Spinner />
        ) : logins.length === 0 ? (
          <EmptyState title="No logins recorded" sub="Login events will appear here whenever this account signs in." />
        ) : (
          <ul className="adm-activity">
            {logins.map((l) => (
              <li key={l.id}>
                <span className="adm-activity-dot adm-dot-newuser" />
                <div className="adm-activity-body">
                  <div className="adm-activity-title">
                    <strong>Account login</strong>
                    <span className="adm-activity-time">{formatIST(l.created_at)}</span>
                  </div>
                  <span className="adm-activity-meta">IST</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="adm-modal-actions">
          <button className="adm-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function UsersOverviewBar({ stats }) {
  const total = Number(stats.totalUsers || 0);
  const active = Number(stats.activeUsers || 0);
  const suspended = Number(stats.suspendedUsers || 0);
  const bin = Number(stats.binUsers || 0);
  const pct = (n) => (total > 0 ? Math.max((n / total) * 100, n > 0 ? 3 : 0) : 0);

  return (
    <div className="adm-users-bar">
      <div className="adm-users-bar-head">
        <span className="adm-users-bar-title">Users overview</span>
        <span className="adm-users-bar-total">{total} total</span>
      </div>
      <div className="adm-users-bar-track">
        <div className="adm-users-bar-seg adm-bar-active" style={{ width: `${pct(active)}%` }} title={`${active} active`} />
        <div className="adm-users-bar-seg adm-bar-suspended" style={{ width: `${pct(suspended)}%` }} title={`${suspended} suspended`} />
        <div className="adm-users-bar-seg adm-bar-bin" style={{ width: `${pct(bin)}%` }} title={`${bin} in bin`} />
      </div>
      <div className="adm-users-bar-legend">
        <span className="adm-users-bar-item"><i className="adm-users-bar-dot adm-bar-active" /> Active <b>{active}</b></span>
        <span className="adm-users-bar-item"><i className="adm-users-bar-dot adm-bar-suspended" /> Suspended <b>{suspended}</b></span>
        <span className="adm-users-bar-item"><i className="adm-users-bar-dot adm-bar-bin" /> Bin <b>{bin}</b></span>
      </div>
    </div>
  );
}

export default function AdminUsers({ treeMode, binMode }) {
  const { isSuperAdmin } = useAdmin();
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(binMode ? "bin" : "all");
  const [sort, setSort] = useState("newest");
  const [kind, setKind] = useState("users");
  const [confirm, setConfirm] = useState(null);
  const [loginsUser, setLoginsUser] = useState(null);
  useTitle(binMode ? "User Bin" : treeMode ? "Users Folder Tree" : "Users & Admin");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, ov] = await Promise.all([adminApi.users({ q, filter, sort, kind }), adminApi.overview()]);
      setUsers(d.users || []);
      setOverview(ov.stats || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, sort, kind]);

  const adminView = kind === "admins";

  const counts = useMemo(() => {
    const c = { total: users.length, active: 0, suspended: 0, deleted: 0 };
    users.forEach((u) => {
      if (c[u.status] !== undefined) c[u.status] += 1;
    });
    return c;
  }, [users]);

  async function changeStatus(next) {
    await adminApi.setUserStatus(confirm.id, next);
    setConfirm(null);
    load();
  }

  async function removeUser() {
    await adminApi.deleteUser(confirm.id);
    setConfirm(null);
    load();
  }

  async function restoreUser() {
    await adminApi.restoreUser(confirm.id);
    setConfirm(null);
    load();
  }

  if (treeMode) {
    return (
      <div>
        <PageHeader
          title="Users Folder Tree"
          sub="Browse registered users organised by registration date."
          actions={<Link className="adm-btn adm-btn-ghost" to="/admin/users">List View</Link>}
        />
        <TreeView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={binMode ? "User Bin" : treeMode ? "Users Folder Tree" : "Users & Admin"}
        sub={
          binMode
            ? `${counts.total} users in bin`
            : treeMode
            ? "Browse registered accounts organised by registration date."
            : kind === "admins"
            ? `${counts.total} admin accounts`
            : `${counts.total} registered users`
        }
        actions={
          binMode ? (
            <Link className="adm-btn" to="/admin/users">👥 Users & Admin</Link>
          ) : treeMode ? (
            <Link className="adm-btn adm-btn-ghost" to="/admin/users">List View</Link>
          ) : (
            <>
              <span className="adm-kind-tabs" role="tablist" aria-label="Account type">
                <button
                  className={`adm-kind-tab${kind === "users" ? " active" : ""}`}
                  role="tab"
                  aria-selected={kind === "users"}
                  onClick={() => setKind("users")}
                >
                  👤 Users
                </button>
                <button
                  className={`adm-kind-tab${kind === "admins" ? " active" : ""}`}
                  role="tab"
                  aria-selected={kind === "admins"}
                  onClick={() => setKind("admins")}
                >
                  🛡️ Admins
                </button>
              </span>
              <Link className="adm-btn" to="/admin/users/tree">📂 Folder Tree</Link>
            </>
          )
        }
      />

      {!binMode && !treeMode && overview && (
        <UsersOverviewBar stats={overview} />
      )}

      <div className="adm-toolbar">
        <input
          className="adm-input"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!binMode && (
          <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="bin">Bin (deleted)</option>
            <option value="inactive">Inactive</option>
            <option value="new">New (7 days)</option>
            <option value="with_scans">Has scans</option>
            <option value="with_issues">Has issues</option>
          </select>
        )}
        <select className="adm-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name A–Z</option>
          <option value="recent_activity">Recent activity</option>
          <option value="most_scans">Most scans</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : users.length === 0 ? (
        binMode ? (
          <EmptyState title="Bin is empty" sub="Deleted users will appear here so you can restore them." />
        ) : (
          <EmptyState title="No users found" sub="Try adjusting your search or filters." />
        )
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                {!adminView && <th>Scans</th>}
                {!adminView && <th>Issues</th>}
                <th>Joined</th>
                <th>Last Login</th>
                {!adminView && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="adm-user-row">
                      <span className="adm-avatar">{initials(u.fullName)}</span>
                      <div className="adm-user-info">
                        <Link to={`/admin/users/${u.id}`} className="adm-user-name">{u.fullName}</Link>
                        <span className="adm-user-mail">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><StatusPill value={u.role} label={ROLE_LABEL[u.role] || u.role} /></td>
                  <td><StatusPill value={u.status} label={STATUS_LABEL[u.status] || u.status} /></td>
                  {!adminView && <td>{u.scanCount}</td>}
                  {!adminView && (
                    <td>{u.issueCount > 0 ? <StatusPill value="fail" label={u.issueCount} /> : <span className="adm-muted">0</span>}</td>
                  )}
                  <td className="adm-muted">{formatDateOnly(u.createdAt)}</td>
                  <td className="adm-login-cell">
                    <span>{formatIST(u.lastLogin)}</span>
                    <button className="adm-btn adm-btn-xs adm-btn-ghost" onClick={() => setLoginsUser(u)}>History</button>
                  </td>
                  {!adminView && isSuperAdmin && u.role === "user" && (
                    <td className="adm-cols">
                      <Link className="adm-btn adm-btn-xs" to={`/admin/users/${u.id}`}>View</Link>
                      {binMode ? (
                        <button className="adm-btn adm-btn-xs adm-btn-ok" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "restore" })}>Restore</button>
                      ) : u.status === "deleted" ? (
                        <button className="adm-btn adm-btn-xs adm-btn-ok" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "restore" })}>Restore</button>
                      ) : (
                        <button className="adm-btn adm-btn-xs adm-btn-ok" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "active" })}>Active</button>
                      )}
                      {!binMode && (
                        <>
                          <button className="adm-btn adm-btn-xs adm-btn-warn" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "suspended" })}>Suspend</button>
                          {u.status !== "deleted" && (
                            <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "delete" })}>Delete</button>
                          )}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loginsUser && <LoginsModal user={loginsUser} onClose={() => setLoginsUser(null)} />}

      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.next === "delete" ? "Move user to bin?"
            : confirm?.next === "restore" ? "Restore user?"
            : confirm?.next === "suspended" ? "Suspend user?"
            : "Set user active?"
        }
        message={
          confirm?.next === "delete"
            ? `This will move "${confirm?.name}" to the bin. They won't be able to sign in, but you can restore them anytime.`
            : confirm?.next === "restore"
            ? `Restore "${confirm?.name}"? They will regain access to their account and be able to sign in again.`
            : confirm?.next === "suspended"
            ? `Are you sure you want to suspend "${confirm?.name}"? They will not be able to sign in.`
            : `Are you sure you want to set "${confirm?.name}" to active?`
        }
        confirmText={confirm?.next === "delete" ? "Move to bin" : "Confirm"}
        tone={confirm?.next === "suspended" ? "warn" : "ok"}
        onCancel={() => setConfirm(null)}
        onConfirm={
          confirm?.next === "delete" ? () => removeUser()
            : confirm?.next === "restore" ? () => restoreUser()
            : () => changeStatus(confirm.next)
        }
      />
    </div>
  );
}

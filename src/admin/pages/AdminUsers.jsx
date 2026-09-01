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

export default function AdminUsers({ treeMode }) {
  const { isSuperAdmin } = useAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [confirm, setConfirm] = useState(null);
  useTitle(treeMode ? "Users Folder Tree" : "Users");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.users({ q, filter, sort });
      setUsers(d.users || []);
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
  }, [q, filter, sort]);

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
        title="Users"
        sub={`${counts.total} registered users`}
        actions={<Link className="adm-btn" to="/admin/users/tree">📂 Folder Tree</Link>}
      />

      <div className="adm-toolbar">
        <input
          className="adm-input"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="adm-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
          <option value="new">New (7 days)</option>
          <option value="with_scans">Has scans</option>
          <option value="with_issues">Has issues</option>
        </select>
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
        <EmptyState title="No users found" sub="Try adjusting your search or filters." />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Scans</th>
                <th>Issues</th>
                <th>Joined</th>
                <th>Actions</th>
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
                  <td>{u.scanCount}</td>
                  <td>{u.issueCount > 0 ? <StatusPill value="fail" label={u.issueCount} /> : <span className="adm-muted">0</span>}</td>
                  <td className="adm-muted">{formatDateOnly(u.createdAt)}</td>
                  <td className="adm-cols">
                    <Link className="adm-btn adm-btn-xs" to={`/admin/users/${u.id}`}>View</Link>
                    {isSuperAdmin && u.role === "user" && (
                      <>
                        <button className="adm-btn adm-btn-xs adm-btn-ok" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "active" })}>Active</button>
                        <button className="adm-btn adm-btn-xs adm-btn-warn" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "suspended" })}>Suspend</button>
                        <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: u.id, name: u.fullName, next: "delete" })}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.next === "delete" ? "Delete permanently?"
            : confirm?.next === "suspended" ? "Suspend user?"
            : "Set user active?"
        }
        message={
          confirm?.next === "delete"
            ? `This will permanently delete "${confirm?.name}" and remove all their data (scans, activity, notifications). This cannot be undone.`
            : confirm?.next === "suspended"
            ? `Are you sure you want to suspend "${confirm?.name}"? They will not be able to sign in.`
            : `Are you sure you want to set "${confirm?.name}" to active?`
        }
        confirmText={confirm?.next === "delete" ? "Delete permanently" : "Confirm"}
        tone={confirm?.next === "delete" ? "danger" : confirm?.next === "suspended" ? "warn" : "ok"}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.next === "delete" ? () => removeUser() : () => changeStatus(confirm.next)}
      />
    </div>
  );
}

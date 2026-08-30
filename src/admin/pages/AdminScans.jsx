import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, EmptyState, ConfirmModal, StatusPill, PageHeader, formatDate, useTitle,
} from "../ui.jsx";

export default function AdminScans() {
  const { isSuperAdmin } = useAdmin();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [issue, setIssue] = useState("all");
  const [confirm, setConfirm] = useState(null);
  useTitle("Scans");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.scans({ q, status, issue });
      setScans(d.scans || []);
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
  }, [q, status, issue]);

  async function remove() {
    await adminApi.deleteScan(confirm.id);
    setConfirm(null);
    load();
  }

  return (
    <div>
      <PageHeader title="Scans" sub={`${scans.length} scans`} />
      <div className="adm-toolbar">
        <input className="adm-input" placeholder="Search product, user, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="COMPLIANT">Compliant</option>
          <option value="NON-COMPLIANT">Non-compliant</option>
          <option value="pending">Pending</option>
        </select>
        <select className="adm-select" value={issue} onChange={(e) => setIssue(e.target.value)}>
          <option value="all">All scans</option>
          <option value="with_issues">With issues</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : scans.length === 0 ? (
        <EmptyState title="No scans found" />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>User</th>
                <th>Status</th>
                <th>Issues</th>
                <th>Scanned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/admin/scans/${s.id}`} className="adm-user-name">{s.productName}</Link>
                    <span className="adm-user-mail">Scan #{s.id}</span>
                  </td>
                  <td>
                    <div className="adm-user-info">
                      <Link to={`/admin/users/${s.userId}`} className="adm-user-name">{s.userName}</Link>
                      <span className="adm-user-mail">{s.userEmail}</span>
                    </div>
                  </td>
                  <td><StatusPill value={s.status} label={s.status} /></td>
                  <td>{s.issueCount > 0 ? <StatusPill value="fail" label={s.issueCount} /> : <span className="adm-muted">0</span>}</td>
                  <td className="adm-muted">{formatDate(s.createdAt)}</td>
                  <td className="adm-cols">
                    <Link className="adm-btn adm-btn-xs" to={`/admin/scans/${s.id}`}>View</Link>
                    {isSuperAdmin && (
                      <button className="adm-btn adm-btn-xs adm-btn-danger" onClick={() => setConfirm({ id: s.id, name: s.productName })}>Delete</button>
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
        title="Delete scan?"
        message={`Permanently delete scan "${confirm?.name}"? This cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </div>
  );
}

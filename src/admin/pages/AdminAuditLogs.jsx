import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import {
  Spinner, ErrorState, EmptyState, PageHeader, StatusPill, formatDate, useTitle,
} from "../ui.jsx";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useTitle("Audit Logs");

  useEffect(() => {
    adminApi.auditLogs().then((d) => { setLogs(d.logs || []); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Logs" sub="A trace of every admin action." />
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs yet" />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th>Admin</th><th>Action</th><th>Category</th><th>Detail</th><th>When</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.admin_name || "System"}</td>
                  <td><code>{l.action}</code></td>
                  <td><StatusPill value={l.category} label={l.category} /></td>
                  <td className="adm-cell-break">{l.detail}</td>
                  <td className="adm-muted">{formatDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import {
  Spinner, ErrorState, EmptyState, PageHeader, downloadCSV, formatDate, useTitle,
} from "../ui.jsx";

const TYPES = [
  { id: "users", label: "Users", headers: ["id", "full_name", "email", "phone", "organization", "role", "status", "created_at", "scan_count"] },
  { id: "scans", label: "Scans", headers: ["id", "product_name", "status", "created_at", "user_name"] },
  { id: "compliance", label: "Compliant Scans", headers: ["id", "product_name", "status", "created_at", "user_name"] },
  { id: "noncompliance", label: "Non-Compliant Scans", headers: ["id", "product_name", "status", "created_at", "user_name"] },
  { id: "activity", label: "User Activity", headers: ["id", "user_id", "user_name", "type", "title", "detail", "created_at"] },
];

export default function AdminReports() {
  const [type, setType] = useState("users");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useTitle("Reports");

  async function load(t) {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.reports(t);
      setRows(d.rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const current = TYPES.find((t) => t.id === type);

  function exportCSV() {
    downloadCSV(`packpure-${type}-${Date.now()}.csv`, current.headers, rows);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        sub="Export platform data as CSV."
        actions={
          <button className="adm-btn adm-btn-primary" onClick={exportCSV} disabled={rows.length === 0}>
            ⬇ Export CSV
          </button>
        }
      />
      <div className="adm-toolbar">
        <select className="adm-select" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span className="adm-muted">{rows.length} rows</span>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(type)} />
      ) : rows.length === 0 ? (
        <EmptyState title="No rows to export" sub="Try a different report type." />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>{current.headers.map((h) => <th key={h}>{h.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i}>
                  {current.headers.map((h) => (
                    <td key={h}>
                      {h === "created_at" ? formatDate(r[h]) : String(r[h] ?? "").length > 40 ? String(r[h]).slice(0, 40) + "…" : r[h] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

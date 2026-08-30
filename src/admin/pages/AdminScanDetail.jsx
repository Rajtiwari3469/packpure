import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../adminApi.js";
import { useAdmin } from "../AdminContext.jsx";
import {
  Spinner, ErrorState, ConfirmModal, StatusPill, PageHeader, formatDate, useTitle,
} from "../ui.jsx";

export default function AdminScanDetail() {
  const { id } = useParams();
  const { isSuperAdmin } = useAdmin();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(false);
  useTitle("Scan Detail");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.scan(id);
      setScan(d.scan);
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

  const extracted = scan.extractedData || {};
  const checks = scan.checks || [];
  const issues = checks.filter((c) => c.status === "fail").length;

  async function remove() {
    await adminApi.deleteScan(scan.id);
    setConfirm(false);
    window.location.href = "/admin/scans";
  }

  return (
    <div>
      <PageHeader
        title={scan.productName}
        sub={`Scan #${scan.id} · scanned ${formatDate(scan.createdAt)}`}
        actions={
          <>
            <Link className="adm-btn adm-btn-ghost" to="/admin/scans">← Scans</Link>
            {isSuperAdmin && (
              <button className="adm-btn adm-btn-danger" onClick={() => setConfirm(true)}>Delete</button>
            )}
          </>
        }
      />

      <div className="adm-cards-2">
        <div className="adm-card">
          <h3 className="adm-card-title">Extracted Data</h3>
          {Object.keys(extracted).length === 0 ? (
            <p className="adm-muted">No extracted fields recorded.</p>
          ) : (
            <dl className="adm-dl">
              {Object.entries(extracted).map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replace(/_/g, " ")}</dt>
                  <dd>{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">
            Compliance Checks
            <span className="adm-badge-inline">{issues > 0 ? `${issues} issue${issues > 1 ? "s" : ""}` : "All clear"}</span>
          </h3>
          {checks.length === 0 ? (
            <p className="adm-muted">No checks recorded.</p>
          ) : (
            <ul className="adm-checks">
              {checks.map((c, i) => (
                <li key={i} className={`adm-check adm-check-${c.status}`}>
                  <span className="adm-check-icon">{c.status === "pass" ? "✓" : c.status === "fail" ? "✕" : "…"}</span>
                  <div>
                    <strong>{c.title}</strong>
                    {c.detail && <p>{c.detail}</p>}
                  </div>
                  <StatusPill value={c.status} label={c.status.toUpperCase()} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="adm-card">
        <h3 className="adm-card-title">Scanned By</h3>
        <div className="adm-user-row">
          <span className="adm-avatar adm-avatar-lg">{scan.userName?.[0]?.toUpperCase()}</span>
          <div className="adm-user-info">
            <Link to={`/admin/users/${scan.userId}`} className="adm-user-name">{scan.userName}</Link>
            <span className="adm-user-mail">{scan.userEmail}</span>
          </div>
          <StatusPill value={scan.status} label={scan.status} />
        </div>
      </section>

      <ConfirmModal
        open={confirm}
        title="Delete scan?"
        message={`Permanently delete scan "${scan.productName}"? This cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={remove}
      />
    </div>
  );
}

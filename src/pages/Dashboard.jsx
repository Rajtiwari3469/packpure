import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.getStats(), api.getScans()])
      .then(([statsData, scansData]) => {
        if (!active) return;
        setStats(statsData.stats || {});
        (scansData.scans || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecent(scansData.scans.slice(0, 5));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.fullName?.split(" ")[0] || "there";

  const renderEmpty = (
    <div className="pp-empty">
      <span className="pp-empty-icon">◇</span>
      <h2>No scans yet</h2>
      <p>
        Upload a packaged commodity label to perform your first compliance
        check.
      </p>
      <Link to="/scanner" className="pp-btn pp-btn-primary">
        Start New Scan
      </Link>
    </div>
  );

  return (
    <div className="pp-page">
      <section className="pp-page-hero pp-dash-hero">
        <span className="pp-eyebrow">DASHBOARD</span>
        <h1>
          Hello, {firstName} 👋
        </h1>
        <p>Welcome back to PackPure.</p>
        <div className="pp-dash-hero-action">
          <Link to="/scanner" className="pp-btn pp-btn-primary">
            Start New Scan
          </Link>
        </div>
      </section>

      {error && <div className="pp-form-error">{error}</div>}

      {/* Stats */}
      <section className="pp-dash-stats">
        <div className="pp-stat-card">
          <span className="pp-stat-icon">📦</span>
          <strong>{stats ? stats.total ?? 0 : "…"}</strong>
          <span className="pp-stat-label">Total Scans</span>
        </div>
        <div className="pp-stat-card">
          <span className="pp-stat-icon">✓</span>
          <strong>{stats ? stats.compliant ?? 0 : "…"}</strong>
          <span className="pp-stat-label">Compliant</span>
        </div>
        <div className="pp-stat-card">
          <span className="pp-stat-icon">⚠</span>
          <strong>{stats ? stats.nonCompliant ?? 0 : "…"}</strong>
          <span className="pp-stat-label">Issues Found</span>
        </div>
        <div className="pp-stat-card">
          <span className="pp-stat-icon">◷</span>
          <strong>{stats ? stats.pending ?? 0 : "…"}</strong>
          <span className="pp-stat-label">Pending / Review</span>
        </div>
      </section>

      {/* Recent Scans */}
      <section className="pp-dash-section">
        <div className="pp-section-heading">
          <div>
            <span className="pp-eyebrow">RECENT SCANS</span>
            <h2>Your latest activity</h2>
          </div>
          <Link to="/my-scans" className="pp-btn pp-btn-ghost">
            View All
          </Link>
        </div>

        {recent ? (
          recent.length === 0 ? (
            renderEmpty
          ) : (
            <div className="pp-dash-list">
              {recent.map((scan) => {
                const failed = (scan.checks || []).filter(
                  (c) => c.status === "fail"
                ).length;
                const isCompliant = failed === 0;
                return (
                  <Link
                    to={`/my-scans/${scan.id}`}
                    className="pp-dash-row"
                    key={scan.id}
                  >
                    <div className="pp-dash-row-thumb">
                      {scan.image ? (
                        <img src={scan.image} alt={scan.productName} />
                      ) : (
                        <span>📦</span>
                      )}
                    </div>
                    <div className="pp-dash-row-main">
                      <strong>{scan.productName}</strong>
                      <span>
                        {new Date(scan.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={
                        isCompliant
                          ? "pp-badge pp-badge-pass"
                          : "pp-badge pp-badge-fail"
                      }
                    >
                      {isCompliant
                        ? "COMPLIANT"
                        : "ISSUES FOUND"}
                    </span>
                    <span className="pp-dash-row-view">View →</span>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="auth-loading">
            <div className="spinner" />
            <p>Loading scans…</p>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="pp-dash-section">
        <div className="pp-section-heading">
          <div>
            <span className="pp-eyebrow">QUICK ACTIONS</span>
            <h2>Jump back in</h2>
          </div>
        </div>
        <div className="pp-dash-quick">
          <Link to="/scanner" className="pp-dash-quick-card">
            <span className="pp-quick-icon">⌾</span>
            <strong>Scan Product</strong>
            <span>Upload a label and run a compliance check.</span>
          </Link>
          <Link to="/my-scans" className="pp-dash-quick-card">
            <span className="pp-quick-icon">📑</span>
            <strong>My Scans</strong>
            <span>Review your scan history and results.</span>
          </Link>
          <Link to="/account" className="pp-dash-quick-card">
            <span className="pp-quick-icon">👤</span>
            <strong>My Profile</strong>
            <span>View and edit your profile details.</span>
          </Link>
          <Link to="/settings" className="pp-dash-quick-card">
            <span className="pp-quick-icon">⚙</span>
            <strong>Settings</strong>
            <span>Manage your account security.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
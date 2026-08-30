import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { showSuccess, showError } from "../notify.jsx";
import { api } from "../api.js";

const PAGE_SIZE = 8;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "compliant", label: "Compliant" },
  { key: "issues", label: "Issues Found" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
];

function scanIssues(scan) {
  return (scan.checks || []).filter((c) => c.status === "fail").length;
}

function scanMatchesFilter(scan, filter) {
  const issues = scanIssues(scan);
  const isCompliant = issues === 0;
  switch (filter) {
    case "compliant":
      return isCompliant;
    case "issues":
      return !isCompliant;
    case "processing":
      return scan.status === "PENDING";
    case "failed":
      return scan.status === "FAILED";
    default:
      return true;
  }
}

export default function MyScans() {
  const [scans, setScans] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    api
      .getScans()
      .then((data) => {
        if (active) setScans(data.scans);
      })
      .catch((err) => {
        if (active) setError(err.status === 401 ? "Your session has expired. Please log in again." : "Could not load your scans.");
        else showError("Failed to load scans", "Please try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!scans) return [];
    const q = query.trim().toLowerCase();
    let list = scans.filter((s) => {
      const matchesQ =
        !q ||
        (s.productName || "").toLowerCase().includes(q) ||
        String(s.id) === q;
      return matchesQ && scanMatchesFilter(s, filter);
    });
    list = [...list].sort((a, b) => {
      const diff =
        new Date(b.createdAt) - new Date(a.createdAt);
      return sort === "newest" ? diff : -diff;
    });
    return list;
  }, [scans, query, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this scan?")) return;
    try {
      await api.deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      showSuccess("Scan deleted.", "The scan was removed from your history.", { id: "scan-deleted" });
    } catch (err) {
      showError("Could not delete scan", "Please try again.");
    }
  };

  if (error) {
    return (
      <div className="pp-page">
        <div className="pp-form-error">{error}</div>
      </div>
    );
  }

  if (!scans) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading scans…</p>
      </div>
    );
  }

  return (
    <div className="pp-page">
      <section className="pp-page-hero">
        <span className="pp-eyebrow">MY SCANS</span>
        <h1>Your scan history</h1>
        <p>Only the scans belonging to your account are shown here.</p>
      </section>

      {scans.length === 0 ? (
        <div className="pp-empty">
          <span className="pp-empty-icon">◇</span>
          <h2>No scans yet</h2>
          <p>Upload a packaged commodity label to perform your first check.</p>
          <Link to="/scanner" className="pp-btn pp-btn-primary">
            Start Scanning
          </Link>
        </div>
      ) : (
        <>
          <div className="pp-scan-toolbar">
            <input
              className="pp-scan-search"
              type="search"
              placeholder="Search product or scan…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />

            <div className="pp-scan-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={
                    filter === f.key
                      ? "pp-filter-chip active"
                      : "pp-filter-chip"
                  }
                  onClick={() => {
                    setFilter(f.key);
                    setPage(1);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <label className="pp-scan-sort">
              <span>Sort</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="pp-empty">
              <span className="pp-empty-icon">◇</span>
              <h2>No matching scans</h2>
              <p>Try adjusting your search or filter.</p>
            </div>
          ) : (
            <section className="pp-blocks">
              {pageRows.map((scan) => {
                const failed = scanIssues(scan);
                const isCompliant = failed === 0;
                return (
                  <div className="pp-block" key={scan.id}>
                    <Link
                      to={`/my-scans/${scan.id}`}
                      className="pp-block-main"
                    >
                      <div className="pp-block-thumb">
                        {scan.image ? (
                          <img src={scan.image} alt={scan.productName} />
                        ) : (
                          <span>📦</span>
                        )}
                      </div>

                      <div className="pp-block-body">
                        <span
                          className={
                            isCompliant
                              ? "pp-badge pp-badge-pass"
                              : "pp-badge pp-badge-fail"
                          }
                        >
                          {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
                        </span>
                        <h3>{scan.productName}</h3>
                        <p className="pp-block-meta">
                          {new Date(scan.createdAt).toLocaleString()} ·{" "}
                          {scan.checks.length} checks · {failed} issue
                          {failed === 1 ? "" : "s"}
                        </p>
                        {scan.extractedData?.commodityName && (
                          <p className="pp-block-sub">
                            {scan.extractedData.commodityName}
                            {scan.extractedData.manufacturer
                              ? ` · ${scan.extractedData.manufacturer}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="pp-block-actions">
                      <Link
                        to={`/my-scans/${scan.id}`}
                        className="pp-btn pp-btn-ghost pp-btn-sm"
                      >
                        View Details
                      </Link>
                      <button
                        className="pp-block-delete"
                        onClick={() => handleDelete(scan.id)}
                        aria-label="Delete scan"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {pageCount > 1 && (
            <div className="pp-pagination">
              <button
                className="pp-btn pp-btn-ghost pp-btn-sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span>
                {currentPage} / {pageCount}
              </span>
              <button
                className="pp-btn pp-btn-ghost pp-btn-sm"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setPage((p) => Math.min(pageCount, p + 1))
                }
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";

export default function ScanDetails() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getScan(id)
      .then((data) => {
        if (active) setScan(data.scan);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="pp-page">
        <div className="pp-form-error">{error}</div>
        <div className="pp-dash-back">
          <Link to="/my-scans" className="pp-btn pp-btn-ghost">
            ← Back to My Scans
          </Link>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>Loading scan…</p>
      </div>
    );
  }

  const checks = Array.isArray(scan.checks) ? scan.checks : [];
  const extractedData =
    scan.extractedData && typeof scan.extractedData === "object"
      ? scan.extractedData
      : {};
  const complaint =
    typeof extractedData.complaint === "string"
      ? extractedData.complaint
      : "";
  const excludedKeys = ["complaint", "frontImage", "backImage"];
  const declarationEntries = Object.entries(extractedData).filter(
    ([key]) => !excludedKeys.includes(key)
  );
  const failed = checks.filter((c) => c.status === "fail");
  const passed = checks.filter((c) => c.status === "pass");
  const isCompliant = failed.length === 0;

  const recommendation =
    failed.length === 0
      ? "No action required. Keep up the good compliance practices."
      : failed.length === 1
      ? "One declaration needs attention. Review the flagged field and correct it before distribution."
      : `${failed.length} declarations need attention. Review the flagged fields and correct them before distribution.`;

  return (
    <div className="pp-page">
      <div className="pp-dash-back">
        <Link to="/my-scans" className="pp-btn pp-btn-ghost">
          ← Back to My Scans
        </Link>
      </div>

      <section className="pp-page-hero">
        <span className="pp-eyebrow">SCAN DETAILS</span>
        <h1>{scan.productName}</h1>
        <p>{new Date(scan.createdAt).toLocaleString()}</p>

        <span
          className={
            isCompliant
              ? "pp-badge pp-badge-pass pp-badge-lg"
              : "pp-badge pp-badge-fail pp-badge-lg"
          }
        >
          {isCompliant ? "✓ COMPLIANT" : "⚠ ISSUES FOUND"}
        </span>
      </section>

      <div className="pp-detail-grid">
        {/* Product image */}
        <section className="pp-card pp-detail-card">
          <h3>Uploaded Label</h3>
          {scan.image ? (
            <div className="pp-detail-image">
              <img src={scan.image} alt={scan.productName} />
            </div>
          ) : (
            <div className="pp-detail-nothumb">📦 No image</div>
          )}
        </section>

        {/* Declarations */}
        <section className="pp-card pp-detail-card">
          <h3>Detected Declarations</h3>
          {Object.keys(extractedData).length === 0 ? (
            <p className="pp-muted">No declarations detected.</p>
          ) : declarationEntries.length === 0 ? (
            <p className="pp-muted">No declarations detected.</p>
          ) : (
            <div className="pp-detail-fields">
              {declarationEntries.map(([key, value]) => (
                <div className="pp-account-field" key={key}>
                  <span>{key}</span>
                  <strong>{String(value || "—")}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Consumer complaint */}
      {complaint && (
        <section className="pp-card pp-detail-block">
          <div className="pp-detail-block-head">
            <h3>Consumer Complaint</h3>
          </div>
          <p className="pp-complaint-text">{complaint}</p>
        </section>
      )}

      {/* Compliance checks */}
      <section className="pp-card pp-detail-block">
        <div className="pp-detail-block-head">
          <h3>Compliance Checks</h3>
          <div className="pp-detail-counts">
            <span className="pp-badge pp-badge-pass">
              {passed.length} passed
            </span>
            <span className="pp-badge pp-badge-fail">
              {failed.length} failed
            </span>
          </div>
        </div>

        <div className="pp-checks-list">
          {checks.map((check, index) => {
            const ok = check.status === "pass";
            return (
              <div
                className="pp-check-row"
                key={`${check.title}-${index}`}
              >
                <span
                  className={
                    ok
                      ? "pp-check-status pass"
                      : "pp-check-status fail"
                  }
                >
                  {ok ? "✓" : "✕"}
                </span>
                <div className="pp-check-main">
                  <strong>{check.title || check.name || "Check"}</strong>
                  <span className="pp-check-value">
                    {check.value || check.message || "—"}
                  </span>
                </div>
                <span className={ok ? "pp-check-ok" : "pp-check-bad"}>
                  {ok ? "Pass" : "Fail"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Warnings & recommendations */}
      <section className="pp-card pp-detail-block">
        <h3>Findings & Recommendations</h3>
        {failed.length === 0 ? (
          <div className="pp-empty pp-empty-inline">
            <span className="pp-empty-icon">✓</span>
            <h2>Great! No compliance issues found.</h2>
            <p>{recommendation}</p>
          </div>
        ) : (
          <ul className="pp-warn-list">
            {failed.map((check, index) => (
              <li key={`${check.title}-${index}`}>
                <strong>
                  {check.title || check.name || "Declaration"}:
                </strong>{" "}
                {check.message || check.value || "Review required."}
              </li>
            ))}
            <li>
              <strong>Recommendation:</strong> {recommendation}
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
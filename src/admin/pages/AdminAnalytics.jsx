import { useEffect, useState } from "react";
import { adminApi } from "../adminApi.js";
import {
  Spinner, ErrorState, PageHeader, StatCard, useTitle,
} from "../ui.jsx";

function BarChart({ data, color = "#1b7a43" }) {
  const max = Math.max(1, ...data.map((d) => d.c));
  const h = 140;
  return (
    <div className="adm-chart">
      <div className="adm-chart-bars">
        {data.map((d, i) => (
          <div className="adm-chart-col" key={i} title={`${d.date}: ${d.c}`}>
            <div className="adm-chart-bar" style={{ height: `${(d.c / max) * (h - 24)}px`, background: color }} />
            <span className="adm-chart-val">{d.c}</span>
            <span className="adm-chart-label">{String(d.date).slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Donut({ percent, label }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="adm-donut-wrap">
      <div className="adm-donut">
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eceff3" strokeWidth="16" />
          <circle
            cx="70" cy="70" r={r} fill="none" stroke="#1b7a43" strokeWidth="16"
            strokeLinecap="round" strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c - (p / 100) * c} transform="rotate(-90 70 70)"
          />
        </svg>
        <div className="adm-donut-center">
          <b>{p}%</b>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useTitle("Analytics");

  async function load(r) {
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.analytics(r);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => load(range)} />;
  if (!data) return null;

  const t = data.totals;

  return (
    <div>
      <PageHeader
        title="Analytics"
        sub={`Insights for the last ${range} days`}
        actions={
          <select className="adm-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        }
      />

      <div className="adm-stats-grid">
        <StatCard icon="📝" label="Registrations" value={t.registrations} tone="teal" />
        <StatCard icon="⚡" label="Active Users" value={t.activeUsers} tone="blue" />
        <StatCard icon="🗂" label="Scans in period" value={t.dailyScans} tone="amber" />
        <StatCard icon="👍" label="Compliance Rate" value={`${t.complianceRate}%`} tone="green" />
      </div>

      <div className="adm-overview-grid">
        <section className="adm-card">
          <div className="adm-card-head"><h2>Scans Over Time</h2></div>
          <BarChart data={data.scansOverTime || []} color="#2563eb" />
        </section>
        <section className="adm-card">
          <div className="adm-card-head"><h2>New Users Over Time</h2></div>
          <BarChart data={data.usersOverTime || []} color="#1b7a43" />
        </section>
      </div>

      <div className="adm-overview-grid">
        <section className="adm-card adm-donut-card">
          <div className="adm-card-head"><h2>Compliance Split</h2></div>
          <Donut percent={t.complianceRate} label="Compliant" />
          <div className="adm-legend">
            <span><i className="adm-legend-dot ok" />Compliant {t.compliant}</span>
            <span><i className="adm-legend-dot bad" />Non-Compliant {t.nonCompliant}</span>
            <span><i className="adm-legend-dot neutral" />Total {t.totalScans}</span>
          </div>
        </section>
        <section className="adm-card">
          <div className="adm-card-head"><h2>Top Products</h2></div>
          {(data.topProducts || []).length === 0 ? (
            <p className="adm-muted">No data yet.</p>
          ) : (
            <ul className="adm-bar-list">
              {data.topProducts.map((p, i) => (
                <li key={i}>
                  <span className="adm-bar-list-name">{p.product_name}</span>
                  <span className="adm-bar-list-track"><i style={{ width: `${(p.c / Math.max(1, data.topProducts[0].c)) * 100}%` }} /></span>
                  <span className="adm-bar-list-val">{p.c}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Most Common Issues</h2></div>
        {(data.commonIssues || []).length === 0 ? (
          <p className="adm-muted">No non-compliant scans recorded.</p>
        ) : (
          <ul className="adm-bar-list">
            {data.commonIssues.map((p, i) => (
              <li key={i}>
                <span className="adm-bar-list-name">{p.product_name}</span>
                <span className="adm-bar-list-track bad"><i style={{ width: `${(p.c / Math.max(1, data.commonIssues[0].c)) * 100}%` }} /></span>
                <span className="adm-bar-list-val">{p.c}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
